import { SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { Assets } from '../Kit/Assets'
import { Fps, Pixels, Type } from '../Kit/Film'
import { Beat } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Shot } from '../Kit/Timeline'

export const Found = Beat.at(2)

const Panel = { x: 160, y: 520, w: 880, h: 360 }

export class DebriefShot extends Shot {
  private ghost?: HTMLCanvasElement
  private bright?: HTMLCanvasElement

  draw(context: CanvasRenderingContext2D, t: number) {
    context.fillStyle = Palette.Space0
    context.fillRect(0, 0, 1920, 1080)
    context.fillStyle = Palette.Space1
    for (let y = 40; y < 1080; y += 40) for (let x = 40; x < 1920; x += 40) context.fillRect(x, y, 4, 4)
    Type.reveal(context, 'Find out what you', 160, 250, t - 0.05, { size: 160 })
    Type.reveal(context, 'should have packed.', 160, 400, t - Beat.at(1), { size: 160, colour: Palette.Foil3 })
    this.panel(context, t)
  }

  private hero(context: CanvasRenderingContext2D, since: number) {
    const x = 1460
    const y = 700
    const scale = 12
    if (since < 0) {
      Pixels.blit(context, SpriteImage.silhouette(new SpriteImage(32, 20, (c) => c.drawImage(this.ghost!, 0, 0)), Palette.Hull1).canvas, x, y, scale)
      return
    }
    const frame = Math.floor(since * Fps)
    const lift = [24, 12, 0][Math.min(2, frame)]
    if (frame < 2) Pixels.blit(context, SpriteImage.silhouette(new SpriteImage(34, 22, (c) => c.drawImage(this.bright!, 0, 0)), Palette.White).canvas, x, y - lift, scale)
    else Pixels.blit(context, this.bright!, x, y - lift, scale)
  }

  private panel(context: CanvasRenderingContext2D, t: number) {
    const open = Math.min(4, Math.floor((t - Beat.at(0.5)) * Fps))
    if (open < 0) return
    const { x, y, w } = Panel
    const h = Math.round((Panel.h * (open + 1)) / 5 / 4) * 4
    Pixels.rect(context, x - 8, y - 8, w + 16, h + 16, Palette.Hull2)
    Pixels.rect(context, x - 4, y - 4, w + 8, h + 8, Palette.Hull0)
    Pixels.rect(context, x, y, w, h, Palette.Hull1)
    Pixels.rect(context, x, y, w, 4, Palette.Hull2)
    if (open < 4) return
    Type.reveal(context, Assets.word('Debrief.Missed'), x + 40, y + 80, t - Beat.at(1), { size: 80, colour: Palette.Foil2 })
    const sprite = Assets.modules.get('Radar')!
    this.ghost ??= SpriteImage.silhouette(new SpriteImage(32, 20, (c) => c.drawImage(sprite, 0, 0)), Palette.Hull2).canvas
    this.bright ??= SpriteImage.withOutline(new SpriteImage(32, 20, (c) => c.drawImage(sprite, 0, 0)), Palette.Foil3).canvas
    const since = t - Found
    const iconX = x + 40
    const iconY = y + 160
    if (since < 0) Pixels.blit(context, this.ghost, iconX, iconY, 6, false)
    else if (since * Fps < 2) Pixels.blit(context, SpriteImage.silhouette(new SpriteImage(34, 22, (c) => c.drawImage(this.bright!, 0, 0)), Palette.White).canvas, iconX - 6, iconY - 6, 6, false)
    else Pixels.blit(context, this.bright, iconX - 6, iconY - 6, 6, false)
    this.hero(context, since)
    const name = Assets.word('Module.Radar.Name')
    Type.reveal(context, name, iconX + 260, iconY + 90, since, { size: 120, colour: Palette.White })
  }
}
