import { Layer, Pixels, Type } from '../Kit/Film'
import { Beat, Motion } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Globe, Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

export class HookShot extends Shot {
  private readonly stage = new Layer(480, 270)
  private readonly sky = new Sky(480, 270)
  private globe?: Globe

  draw(context: CanvasRenderingContext2D, t: number) {
    this.globe ??= new Globe(170)
    const stage = this.stage
    stage.clear(Palette.Space0)
    const shown = Math.min(5, Math.floor(t / (Beat.Length / 4)) + 1)
    this.sky.paint(stage.context, 0, 0, Math.floor(t / Beat.Length), shown)
    const rise = Motion.outQuint(Motion.span(t, 0, Beat.at(5)))
    const centreY = Math.round(Motion.mix(480, 352, rise))
    this.globe.paint(stage.context, 352, centreY, 0.18 + t * 0.006)
    Pixels.present(context, stage)
    Type.reveal(context, 'Real asteroids.', 160, 300, t - Beat.at(1), { size: 160 })
    Type.reveal(context, 'Real storms.', 160, 450, t - Beat.at(3), { size: 160 })
    Type.reveal(context, 'Your mission.', 160, 600, t - Beat.at(5), { size: 160, colour: Palette.Foil3 })
  }
}
