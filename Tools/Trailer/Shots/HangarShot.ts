import { SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { Assets, Fit } from '../Kit/Assets'
import { Fps, Pixels, Type } from '../Kit/Film'
import { Beat } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Shot } from '../Kit/Timeline'

const Scale = 6
const CellWidth = 192
const CellHeight = 120
const Columns = 3
const Left = 160
const Gap = 96
const Top = 400
const RowGap = 168
const Drop = [-48, -30, -12, 6, 0]
const Segments = 12

export class HangarShot extends Shot {
  private flashes = new Map<string, HTMLCanvasElement>()

  static arrival(index: number): number {
    return Beat.at(1 + index)
  }

  draw(context: CanvasRenderingContext2D, t: number) {
    context.fillStyle = Palette.Space0
    context.fillRect(0, 0, 1920, 1080)
    this.grid(context)
    Type.reveal(context, 'Build the spacecraft.', Left, 250, t - 0.05, { size: 160 })
    let fitted = 0
    Fit.forEach((id, index) => {
      const column = index % Columns
      const row = Math.floor(index / Columns)
      const x = Left + column * (CellWidth + Gap)
      const y = Top + row * (CellHeight + RowGap)
      const since = t - HangarShot.arrival(index)
      this.slot(context, x, y, since < 0 ? Palette.Hull1 : since * Fps < 3 ? Palette.White : Palette.Foil1)
      if (since < 0) return
      fitted++
      const frame = Math.floor(since * Fps + 1e-6)
      const offset = Drop[Math.min(Drop.length - 1, frame)]
      const sprite = frame < 2 ? this.flash(id) : Assets.modules.get(id)!
      Pixels.blit(context, sprite, x, y + offset, Scale, false)
    })
    this.meter(context, 'Budget', 900 - 60, t, fitted, Palette.Foil2, 11)
    this.meter(context, 'Bay space', 900 + 40, t, fitted, Palette.Ocean2, 12)
    this.preview(context, t)
  }

  private preview(context: CanvasRenderingContext2D, t: number) {
    const steps = Assets.craftSteps
    let index = -1
    Fit.forEach((_, at) => {
      if (t >= HangarShot.arrival(at)) index = at
    })
    if (index < 0) return
    const sprite = steps[index][Math.floor(t / Beat.Length) % 2]
    const since = t - HangarShot.arrival(index)
    const shown = since * Fps < 1 ? SpriteImage.silhouette(sprite, Palette.Cloud1) : sprite
    Pixels.blit(context, shown.canvas, 1420, 560, 6)
  }

  private grid(context: CanvasRenderingContext2D) {
    context.fillStyle = Palette.Space1
    for (let y = 40; y < 1080; y += 40) for (let x = 40; x < 1920; x += 40) context.fillRect(x, y, 4, 4)
  }

  private slot(context: CanvasRenderingContext2D, x: number, y: number, colour: string) {
    context.fillStyle = colour
    for (let at = 0; at < CellWidth; at += 24) {
      context.fillRect(x + at - 12, y - 12, 12, 4)
      context.fillRect(x + at - 12, y + CellHeight + 8, 12, 4)
    }
    for (let at = 0; at < CellHeight; at += 24) {
      context.fillRect(x - 12, y + at - 12, 4, 12)
      context.fillRect(x + CellWidth + 8, y + at - 12, 4, 12)
    }
  }

  private meter(context: CanvasRenderingContext2D, label: string, y: number, t: number, fitted: number, colour: string, final: number) {
    Type.plain(context, label, Left, y + 30, 40, Palette.Hull4)
    const left = 440
    const width = 92
    const gap = 8
    const before = Math.round((final * Math.max(0, fitted - 1)) / Fit.length)
    const after = Math.round((final * fitted) / Fit.length)
    const sinceLast = fitted > 0 ? t - HangarShot.arrival(fitted - 1) : 0
    const lit = Math.min(after, before + Math.floor(sinceLast * Fps / 2) + 1)
    const full = lit >= Segments
    const sinceFull = t - HangarShot.arrival(Fit.length - 1)
    for (let segment = 0; segment < Segments; segment++) {
      const x = left + segment * (width + gap)
      let fill: string = Palette.Hull1
      if (segment < lit) fill = full ? (Math.floor(sinceFull * Fps) < 2 ? Palette.White : Palette.Caution) : colour
      context.fillStyle = Palette.Hull0
      context.fillRect(x - 4, y - 4, width + 8, 40)
      context.fillStyle = fill
      context.fillRect(x, y, width, 32)
      if (segment < lit) {
        context.fillStyle = Palette.White
        context.globalAlpha = 0.25
        context.fillRect(x, y, width, 4)
        context.globalAlpha = 1
      }
    }
  }

  private flash(id: string): HTMLCanvasElement {
    let canvas = this.flashes.get(id)
    if (!canvas) {
      const source = new SpriteImage(32, 20, (c) => c.drawImage(Assets.modules.get(id)!, 0, 0))
      canvas = SpriteImage.silhouette(source, Palette.Cloud1).canvas
      this.flashes.set(id, canvas)
    }
    return canvas
  }
}
