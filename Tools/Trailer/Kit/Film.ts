import { Bayer, Palette } from './Palette'

export const Width = 1920
export const Height = 1080
export const Fps = 30
export const FontFamily = '"Jersey 10"'

export class Layer {
  readonly canvas: HTMLCanvasElement
  readonly context: CanvasRenderingContext2D

  constructor(readonly width: number, readonly height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.context = this.canvas.getContext('2d')!
    this.context.imageSmoothingEnabled = false
  }

  clear(colour: string = Palette.Space0) {
    this.context.fillStyle = colour
    this.context.fillRect(0, 0, this.width, this.height)
  }
}

export class Pixels {
  static blit(context: CanvasRenderingContext2D, source: CanvasImageSource & { width: number; height: number }, x: number, y: number, scale: number, centred = true) {
    const w = source.width * scale
    const h = source.height * scale
    const left = Math.round((centred ? x - w / 2 : x) / scale) * scale
    const top = Math.round((centred ? y - h / 2 : y) / scale) * scale
    context.imageSmoothingEnabled = false
    context.drawImage(source, left, top, w, h)
  }

  static present(context: CanvasRenderingContext2D, stage: Layer) {
    context.imageSmoothingEnabled = false
    context.drawImage(stage.canvas, 0, 0, Width, Height)
  }

  static rect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string) {
    context.fillStyle = colour
    context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }
}

export interface TypeStyle {
  size: number
  colour?: string
  stagger?: number
  align?: 'left' | 'center'
  shadow?: string
}

export class Type {
  static readonly Ramp = [Palette.Hull2, Palette.Hull3, Palette.Hull4]

  static font(context: CanvasRenderingContext2D, size: number) {
    context.font = `${size}px ${FontFamily}`
    context.textBaseline = 'alphabetic'
    context.textAlign = 'left'
  }

  static width(context: CanvasRenderingContext2D, text: string, size: number): number {
    Type.font(context, size)
    return context.measureText(text).width
  }

  static plain(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, colour: string, align: 'left' | 'center' = 'left', shadow?: string) {
    Type.font(context, size)
    const unit = size / 10
    const left = align === 'center' ? Math.round((x - context.measureText(text).width / 2) / unit) * unit : x
    if (shadow) {
      context.fillStyle = shadow
      for (const [dx, dy] of [[unit, 0], [-unit, 0], [0, unit], [0, -unit], [unit, unit]]) context.fillText(text, left + dx, y + dy)
    }
    context.fillStyle = colour
    context.fillText(text, left, y)
  }

  static reveal(context: CanvasRenderingContext2D, text: string, x: number, y: number, t: number, style: TypeStyle) {
    const { size, colour = Palette.White, stagger = 0.1, align = 'left', shadow } = style
    if (t < 0) return
    Type.font(context, size)
    const unit = size / 10
    const words = text.split(' ')
    const space = context.measureText(' ').width
    const widths = words.map((word) => context.measureText(word).width)
    const total = widths.reduce((sum, w) => sum + w, 0) + space * (words.length - 1)
    let left = align === 'center' ? Math.round((x - total / 2) / unit) * unit : x
    words.forEach((word, index) => {
      const local = t - index * stagger
      if (local >= 0) {
        const frame = Math.floor(local * Fps + 1e-6)
        const tone = frame < Type.Ramp.length ? Type.Ramp[frame] : colour
        const lift = Math.max(0, 2 - frame) * unit
        if (shadow && frame >= Type.Ramp.length) {
          context.fillStyle = shadow
          context.fillText(word, left, y + unit)
        }
        context.fillStyle = tone
        context.fillText(word, left, y + lift)
      }
      left += widths[index] + space
    })
  }
}

export class PixelWipe {
  static readonly Block = 120

  static compose(context: CanvasRenderingContext2D, incoming: HTMLCanvasElement, progress: number) {
    const columns = Width / PixelWipe.Block
    const rows = Height / PixelWipe.Block
    for (let by = 0; by < rows; by++) {
      for (let bx = 0; bx < columns; bx++) {
        const threshold = 0.55 * (bx / (columns - 1)) + 0.45 * (Bayer[(by % 4) * 4 + (bx % 4)] / 15)
        if (threshold >= progress) continue
        const x = bx * PixelWipe.Block
        const y = by * PixelWipe.Block
        context.drawImage(incoming, x, y, PixelWipe.Block, PixelWipe.Block, x, y, PixelWipe.Block, PixelWipe.Block)
      }
    }
  }
}
