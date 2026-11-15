import { SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { Assets } from '../Kit/Assets'
import { Fps, Pixels, Type } from '../Kit/Film'
import { Beat } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Shot } from '../Kit/Timeline'

export const Found = Beat.at(2)

const Hero = { x: 1360, y: 760, scale: 12 }

export class DebriefShot extends Shot {
  private ghost?: HTMLCanvasElement
  private bright?: HTMLCanvasElement
  private flash?: HTMLCanvasElement

  draw(context: CanvasRenderingContext2D, t: number) {
    context.fillStyle = Palette.Space0
    context.fillRect(0, 0, 1920, 1080)
    context.fillStyle = Palette.Space1
    for (let y = 40; y < 1080; y += 40) for (let x = 40; x < 1920; x += 40) context.fillRect(x, y, 4, 4)
    Type.reveal(context, 'Find out what you', 160, 250, t - 0.05, { size: 160 })
    Type.reveal(context, 'should have packed.', 160, 400, t - Beat.at(1), { size: 160, colour: Palette.Foil3 })
    this.hero(context, t - Found)
  }

  private sprites() {
    const sprite = Assets.modules.get('Radar')!
    const source = new SpriteImage(32, 20, (c) => c.drawImage(sprite, 0, 0))
    this.ghost = SpriteImage.silhouette(source, Palette.Hull1).canvas
    const bright = SpriteImage.withOutline(source, Palette.Foil3)
    this.bright = bright.canvas
    this.flash = SpriteImage.silhouette(bright, Palette.White).canvas
  }

  private hero(context: CanvasRenderingContext2D, since: number) {
    if (!this.ghost) this.sprites()
    const { x, y, scale } = Hero
    const w = 32 * scale
    const h = 20 * scale
    const frame = Math.floor(since * Fps)
    this.slot(context, x - w / 2 - 36, y - h / 2 - 36, w + 72, h + 72, since < 0 ? Palette.Hull2 : frame < 3 ? Palette.White : Palette.Foil1)
    if (since < 0) {
      Pixels.blit(context, this.ghost!, x, y, scale)
      return
    }
    const lift = [36, 12, 0][Math.min(2, frame)]
    Pixels.blit(context, frame < 2 ? this.flash! : this.bright!, x, y - lift, scale)
  }

  private slot(context: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, colour: string) {
    context.fillStyle = colour
    for (let at = 0; at < w; at += 48) {
      context.fillRect(left + at, top, 24, 8)
      context.fillRect(left + at, top + h - 8, 24, 8)
    }
    for (let at = 0; at < h; at += 48) {
      context.fillRect(left, top + at, 8, 24)
      context.fillRect(left + w - 8, top + at, 8, 24)
    }
  }
}
