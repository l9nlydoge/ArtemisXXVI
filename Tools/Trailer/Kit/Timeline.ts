import { Fps, Height, Layer, PixelWipe, Type, Width } from './Film'
import { Palette } from './Palette'

export abstract class Shot {
  constructor(readonly start: number, readonly end: number) {}

  get length(): number {
    return this.end - this.start
  }

  abstract draw(context: CanvasRenderingContext2D, t: number): void
}

export enum Join {
  Cut = 'Cut',
  Wipe = 'Wipe',
}

export const WipeLength = 6 / Fps
export const Credit = 'AI-assisted project: code, art and sound produced with Claude'

export class Timeline {
  private readonly spare = new Layer(Width, Height)

  constructor(private readonly shots: readonly Shot[], private readonly joins: readonly Join[], readonly length: number) {}

  render(context: CanvasRenderingContext2D, time: number) {
    const index = Math.max(0, this.shots.findIndex((shot) => time < shot.end))
    const shot = index < 0 ? this.shots[this.shots.length - 1] : this.shots[index]
    context.save()
    shot.draw(context, time - shot.start)
    context.restore()
    const previous = this.shots[index - 1]
    const since = time - shot.start
    if (previous && this.joins[index - 1] === Join.Wipe && since < WipeLength) {
      const out = this.spare.context
      out.save()
      previous.draw(out, time - previous.start)
      out.restore()
      const incoming = new Layer(Width, Height)
      incoming.context.drawImage(context.canvas, 0, 0)
      context.drawImage(this.spare.canvas, 0, 0)
      PixelWipe.compose(context, incoming.canvas, (Math.floor(since * Fps + 1e-6) + 1) / (WipeLength * Fps + 1))
    }
    this.credit(context)
  }

  private credit(context: CanvasRenderingContext2D) {
    Type.plain(context, Credit, Width / 2, Height - 36, 30, Palette.Hull4, 'center', Palette.Hull0)
  }
}
