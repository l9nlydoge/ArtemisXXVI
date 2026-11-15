import { GroundShot } from '../../../src/Interface/Scene/GroundShot'
import { RocketPainter, RocketPiece } from '../../../src/Interface/Scene/RocketPainter'
import { Dots, Seeded } from '../../../src/Interface/Scene/SpriteImage'
import { Layer, Pixels, Type } from '../Kit/Film'
import { Beat } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

const StageWidth = 240
const StageHeight = 135
const Smoke = ['#ffffff', '#eef3f7', '#c5d2e0', '#7c8797', '#4a5362']
const PuffEvery = 0.035
const Climb = 34
const DeckAltitude = 300
const DeckRows = 18

export const Liftoff = Beat.at(1)

export class LaunchShot extends Shot {
  private readonly stage = new Layer(StageWidth, StageHeight)
  private readonly sky = new Sky(StageWidth, StageHeight)
  private readonly painter = new RocketPainter()
  private ground?: GroundShot
  private readonly groundY = Math.round(StageHeight * 0.66)
  private readonly padX = Math.round(StageWidth * 0.5)
  private readonly lockY = Math.round(StageHeight * 0.44)

  private get base(): number {
    return this.painter.stackHeight - this.painter.pivot(RocketPiece.Stack)
  }

  private get padPivotY(): number {
    return this.groundY - this.base - 1
  }

  altitude(t: number): number {
    return Climb * Math.max(0, t - Liftoff) ** 3
  }

  private lift(t: number): number {
    return Math.max(0, Math.round(this.altitude(t)) - (this.padPivotY - this.lockY))
  }

  private pivotY(t: number): number {
    return this.padPivotY - Math.round(this.altitude(t)) + this.lift(t)
  }

  draw(context: CanvasRenderingContext2D, t: number) {
    this.ground ??= new GroundShot(StageWidth, StageHeight, this.groundY, this.padX)
    const ground = this.ground
    const stage = this.stage.context
    this.stage.clear(Palette.Space0)
    const lift = this.lift(t)
    this.sky.paint(stage, 0, Math.floor(-lift * 0.05), 0)
    ground.paintSky(stage, lift)
    ground.paintGround(stage, lift)
    ground.paintClouds(stage, lift, false, (t * 1000) / 900)
    this.smoke(stage, t, lift)
    const shake = t > Liftoff * 0.4 && t < Liftoff ? Math.floor(t * 20) % 2 : 0
    const flame = t < 0.12 ? 0 : (Math.floor((t * 1000) / 70) % 3) + 1
    this.painter.sprite(RocketPiece.Stack, 0, flame).draw(stage, this.padX + shake, this.pivotY(t))
    ground.paintClouds(stage, lift, true, (t * 1000) / 900)
    const deckTop = this.groundY - DeckAltitude + lift
    if (deckTop < StageHeight && deckTop + DeckRows > -20) ground.paintDeck(stage, deckTop, DeckRows)
    Pixels.present(context, this.stage)
    if (t < Beat.at(3.5)) Type.reveal(context, 'Launch it.', 160, 250, t - Liftoff, { size: 160, shadow: Palette.Hull0 })
  }

  private smoke(context: CanvasRenderingContext2D, t: number, lift: number) {
    const count = Math.floor((t - 0.08) / PuffEvery)
    for (let index = Math.max(0, count - 80); index <= count; index++) {
      const born = 0.08 + index * PuffEvery
      if (born > t) continue
      const age = (t - born) / 2.6
      if (age >= 1) continue
      const random = new Seeded(4000 + index * 7)
      const onPad = born < Liftoff + 0.25
      const spread = onPad ? (random.next() < 0.5 ? -1 : 1) * (18 + random.next() * 34) : (random.next() - 0.5) * 6
      const dx = spread
      const dy = onPad ? -random.next() * 3 : 3 + random.next() * 4
      const x0 = this.padX + (random.next() - 0.5) * 4
      const y0 = this.pivotY(born) + this.base + 2 - this.lift(born)
      const size = 3 + Math.floor(age * 7)
      const tone = Smoke[Math.min(Smoke.length - 1, Math.floor(age * Smoke.length))]
      const x = Math.round(x0 + dx * age * 2.4)
      const y = Math.round(y0 + dy * age * 2.4 + lift)
      if (age > 0.78 && (Math.floor((t * 1000) / 80) + x) % 2 === 0) continue
      Dots.px(context, x - size + 1, y - Math.max(0, size - 2), tone, size * 2 - 1, Math.max(1, size * 2 - 3))
      Dots.px(context, x - Math.max(0, size - 2), y - size + 1, tone, Math.max(1, size * 2 - 3), size * 2 - 1)
    }
  }
}
