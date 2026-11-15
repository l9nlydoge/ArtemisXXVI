import { Layer, Pixels, Type } from '../Kit/Film'
import { Beat } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Globe, Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

export const Address = 'l9nlydoge.github.io/ArtemisXXVI'

export class EndShot extends Shot {
  private readonly stage = new Layer(480, 270)
  private readonly sky = new Sky(480, 270)
  private globe?: Globe

  draw(context: CanvasRenderingContext2D, t: number) {
    const stage = this.stage
    stage.clear(Palette.Space0)
    this.sky.paint(stage.context, 0, 0, 0, 3)
    this.globe ??= new Globe(330)
    this.globe.paint(stage.context, 240, 270 + 330 - 26, 0.62)
    Pixels.present(context, stage)
    const letters = 'Artemis 26'
    const shown = Math.min(letters.length, Math.floor(t * 30 / 2) + 1)
    const full = Type.width(context, letters, 240)
    const left = Math.round((960 - full / 2) / 24) * 24
    Type.plain(context, letters.slice(0, shown), left, 520, 240, Palette.White)
    Type.reveal(context, Address, 960, 660, t - Beat.at(0.5), { size: 80, colour: Palette.Foil3, align: 'center' })
    Type.reveal(context, 'NASA Space Apps Challenge 2026', 960, 760, t - Beat.at(1), { size: 60, colour: Palette.Hull4, align: 'center', stagger: 0.05 })
  }
}
