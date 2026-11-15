import type { PixelCanvas } from '../Spacecraft/PixelCanvas'

export class SpriteImage {
  readonly canvas: HTMLCanvasElement

  constructor(readonly width: number, readonly height: number, paint?: (context: CanvasRenderingContext2D) => void) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = Math.max(1, width)
    this.canvas.height = Math.max(1, height)
    if (paint) paint(this.canvas.getContext('2d')!)
  }

  static fromPixels(pixels: PixelCanvas, crop = { x: 0, y: 0, w: pixels.width, h: pixels.height }, keep?: (x: number, y: number, owner: string | null, colour: string) => boolean): SpriteImage {
    return new SpriteImage(crop.w, crop.h, (context) => {
      const image = context.createImageData(crop.w, crop.h)
      for (let y = 0; y < crop.h; y++) {
        for (let x = 0; x < crop.w; x++) {
          const at = (y + crop.y) * pixels.width + x + crop.x
          const colour = pixels.colours[at]
          if (!colour || (keep && !keep(x, y, pixels.owners[at], colour))) continue
          const value = parseInt(colour.slice(1), 16)
          const out = (y * crop.w + x) * 4
          image.data[out] = value >> 16
          image.data[out + 1] = (value >> 8) & 255
          image.data[out + 2] = value & 255
          image.data[out + 3] = 255
        }
      }
      context.putImageData(image, 0, 0)
    })
  }

  static silhouette(source: SpriteImage, colour: string): SpriteImage {
    return new SpriteImage(source.width, source.height, (context) => {
      context.drawImage(source.canvas, 0, 0)
      context.globalCompositeOperation = 'source-in'
      context.fillStyle = colour
      context.fillRect(0, 0, source.width, source.height)
    })
  }

  draw(context: CanvasRenderingContext2D, x: number, y: number) {
    context.drawImage(this.canvas, Math.round(x - this.width / 2), Math.round(y - this.height / 2))
  }

  drawAt(context: CanvasRenderingContext2D, left: number, top: number) {
    context.drawImage(this.canvas, Math.round(left), Math.round(top))
  }
}

export class Dots {
  static px(context: CanvasRenderingContext2D, x: number, y: number, colour: string, w = 1, h = 1) {
    context.fillStyle = colour
    context.fillRect(Math.round(x), Math.round(y), w, h)
  }

  static line(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour: string) {
    const steps = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)))
    context.fillStyle = colour
    for (let step = 0; step <= steps; step++) {
      const t = steps === 0 ? 0 : step / steps
      context.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1)
    }
  }

  static dashed(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour: string, dash: number, gap: number, phase: number) {
    const steps = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)))
    context.fillStyle = colour
    const period = dash + gap
    for (let step = 0; step <= steps; step++) {
      if (((step - phase) % period + period) % period >= dash) continue
      const t = steps === 0 ? 0 : step / steps
      context.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1)
    }
  }

  static ring(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, colour: string, keep: (angle: number, step: number) => boolean = () => true) {
    const steps = Math.max(8, Math.ceil(2 * Math.PI * radius * 1.5))
    context.fillStyle = colour
    let lastX = NaN
    let lastY = NaN
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * Math.PI * 2
      const x = Math.round(cx + Math.cos(angle) * radius)
      const y = Math.round(cy + Math.sin(angle) * radius)
      if (x === lastX && y === lastY) continue
      lastX = x
      lastY = y
      if (keep(angle, step)) context.fillRect(x, y, 1, 1)
    }
  }
}

export class Ease {
  static out(t: number): number {
    const clamped = Math.max(0, Math.min(1, t))
    return 1 - (1 - clamped) ** 3
  }

  static inOut(t: number): number {
    const c = Math.max(0, Math.min(1, t))
    return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2
  }

  static in(t: number): number {
    const c = Math.max(0, Math.min(1, t))
    return c * c
  }
}

export class Glide {
  private from: number
  private to: number
  private started = 0

  constructor(value: number, private readonly length = 700) {
    this.from = value
    this.to = value
  }

  set(target: number, now: number, instant = false) {
    if (target === this.to && !instant) return
    this.from = instant ? target : this.at(now)
    this.to = target
    this.started = now
  }

  at(now: number): number {
    return this.from + (this.to - this.from) * Ease.out((now - this.started) / this.length)
  }

  moving(now: number): boolean {
    return now - this.started < this.length && this.from !== this.to
  }

  get target(): number {
    return this.to
  }
}

export class Seeded {
  private state: number

  constructor(seed: number) {
    this.state = (seed >>> 0) || 1
  }

  next(): number {
    this.state ^= this.state << 13
    this.state ^= this.state >>> 17
    this.state ^= this.state << 5
    return ((this.state >>> 0) % 100000) / 100000
  }

  static hash(text: string): number {
    let value = 2166136261
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
    return value >>> 0
  }
}
