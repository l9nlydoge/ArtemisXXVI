import { RockPainter } from '../../../src/Interface/Scene/RockPainter'
import { Dots, SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { Assets } from '../Kit/Assets'
import { Fps, Layer, Pixels, Type } from '../Kit/Film'
import { Beat, Motion } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Globe, Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

export const CraftAt = { x: 960, y: 480 }
export const PassFrom = Beat.at(0.5)
export const PassTo = Beat.at(5.5)
export const BeamOn = Beat.at(2)
export const BeamOff = Beat.at(4)

export class FlightShot extends Shot {
  private readonly stage = new Layer(480, 270)
  private readonly sky = new Sky(480, 270)
  private globe?: Globe
  private rock?: SpriteImage[]
  private flash?: SpriteImage

  rockAt(t: number): { x: number; y: number } {
    const u = Motion.span(t, PassFrom, PassTo)
    const s = u - 0.13 * Math.sin(2 * Math.PI * u)
    return { x: Math.round(Motion.mix(2240, -320, s) / 4) * 4, y: Math.round(Motion.mix(840, 720, s) / 4) * 4 }
  }

  draw(context: CanvasRenderingContext2D, t: number) {
    this.globe ??= new Globe(330)
    this.rock ??= RockPainter.frames(26, 2019)
    const stage = this.stage
    stage.clear(Palette.Space0)
    this.sky.paint(stage.context, Math.floor(t * 8), 0, Math.floor(t / Beat.Length))
    this.globe.paint(stage.context, 300, 270 + 330 - 74, 0.62 + t * 0.004)
    Pixels.present(context, stage)
    const rock = this.rockAt(t)
    const beaming = t >= BeamOn && t < BeamOff
    if (beaming) this.beam(context, t, rock)
    const frame = Math.floor(t / 0.16) % this.rock.length
    Pixels.blit(context, this.rock[frame].canvas, rock.x, rock.y, 4)
    this.craft(context, t)
    if (t >= BeamOn - Beat.Length) this.brackets(context, rock, t - (BeamOn - Beat.Length))
    this.data(context, t)
    const day = new Date(Assets.rock.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    Type.reveal(context, `Asteroid ${Assets.rock.name}`, 160, 210, t - (BeamOn - Beat.Length), { size: 160, colour: Palette.White })
    Type.reveal(context, `${Assets.rock.missKm.toLocaleString('en-US')} km from Earth's centre, ${day}`, 160, 300, t - BeamOn, { size: 80, colour: Palette.Foil3, stagger: 0.05 })
  }

  private craft(context: CanvasRenderingContext2D, t: number) {
    const frame = Math.floor(t / Beat.Length) % 2
    const sprite = Assets.craft[frame]
    this.flash ??= SpriteImage.silhouette(sprite, Palette.Cloud1)
    const shown = t * Fps < 2 ? this.flash : sprite
    Pixels.blit(context, shown.canvas, CraftAt.x, CraftAt.y, Assets.craftScale)
  }

  private beam(context: CanvasRenderingContext2D, t: number, rock: { x: number; y: number }) {
    const unit = 4
    const from = { x: CraftAt.x / unit, y: (CraftAt.y - 40) / unit }
    const to = { x: rock.x / unit, y: rock.y / unit }
    const phase = Math.floor(t * Fps)
    context.save()
    context.scale(unit, unit)
    Dots.dashed(context, from.x, from.y, to.x, to.y, Palette.Foil3, 3, 2, phase)
    const ring = Math.floor(((t - BeamOn) * Fps) / 2) % 6
    Dots.ring(context, to.x, to.y, 30 + ring * 2, ring < 3 ? Palette.Foil3 : Palette.Foil1, (_a, step) => step % 3 === 0)
    context.restore()
  }

  private brackets(context: CanvasRenderingContext2D, rock: { x: number; y: number }, since: number) {
    const closing = Math.max(0, 3 - Math.floor(since * Fps))
    const half = 150 + closing * 24
    const arm = 32
    context.fillStyle = since * Fps < 2 ? Palette.White : Palette.Foil2
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = rock.x + sx * half
      const cy = rock.y + sy * half
      context.fillRect(sx < 0 ? cx : cx - arm, cy - (sy < 0 ? 0 : 8), arm, 8)
      context.fillRect(cx - (sx < 0 ? 0 : 8), sy < 0 ? cy : cy - arm, 8, arm)
    }
  }

  private data(context: CanvasRenderingContext2D, t: number) {
    if (t < BeamOn) return
    const cells = 10
    const filled = Math.min(cells, Math.floor((t - BeamOn) / (Beat.Length / 4)) + 1)
    const left = 160
    const top = 350
    for (let cell = 0; cell < cells; cell++) {
      context.fillStyle = Palette.Hull0
      context.fillRect(left + cell * 28 - 4, top - 4, 28, 32)
      context.fillStyle = cell < filled ? (cell === filled - 1 && filled < cells ? Palette.White : Palette.Foil2) : Palette.Hull1
      context.fillRect(left + cell * 28, top, 20, 24)
    }
  }
}
