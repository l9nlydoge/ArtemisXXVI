import { Assets } from '../Kit/Assets'
import { Fps, Type } from '../Kit/Film'
import { Beat, Motion } from '../Kit/Motion'
import { Bayer, Palette } from '../Kit/Palette'
import { Shot } from '../Kit/Timeline'

interface Card {
  picture: string
  figure: string
  label: string
  from: number
  pan: number
}

const ArtPixel = 16

export class RecordsShot extends Shot {
  private get cards(): Card[] {
    return [
      { picture: 'AsteroidA', figure: String(Assets.figures.asteroids), label: 'asteroids', from: 0, pan: -1 },
      { picture: 'Storm', figure: String(Assets.donkiStorms), label: 'storms', from: Beat.at(2), pan: 1 },
    ]
  }

  draw(context: CanvasRenderingContext2D, t: number) {
    const cards = this.cards
    const card = t >= cards[1].from ? cards[1] : cards[0]
    const local = t - card.from
    const picture = Assets.events.get(card.picture)!
    const w = picture.width * ArtPixel
    const h = picture.height * ArtPixel
    const travel = (w - 1920) / ArtPixel
    const step = Math.floor(Motion.span(local, 0, Beat.at(2.2)) * travel)
    const x = card.pan < 0 ? -step * ArtPixel : -(travel - step) * ArtPixel
    context.imageSmoothingEnabled = false
    context.fillStyle = Palette.Black
    context.fillRect(0, 0, 1920, 1080)
    context.drawImage(picture, x, Math.round((1080 - h) / 2 / ArtPixel) * ArtPixel, w, h)
    context.fillStyle = Palette.Black
    for (let y = 520; y < 1080; y += 8) {
      const level = Math.min(13, Math.floor((y - 520) / 24))
      for (let x = 0; x < 1920; x += 8) if (Bayer[((y / 8) % 4) * 4 + ((x / 8) % 4)] < level) context.fillRect(x, y, 8, 8)
    }
    const target = Number(card.figure)
    const count = Math.min(target, Math.round(target * Motion.out(Math.floor(local * Fps) / 9)))
    const figure = String(count)
    Type.reveal(context, figure, 160, 900, local, { size: 240, colour: Palette.Foil3, shadow: Palette.Black })
    const left = 160 + Type.width(context, card.figure, 240) + 40
    Type.reveal(context, card.label, left, 900, local - 0.1, { size: 120, shadow: Palette.Black })
    Type.reveal(context, 'from NASA records', left, 980, local - 0.3, { size: 60, colour: Palette.Hull4, shadow: Palette.Black })
  }
}
