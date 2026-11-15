import { Dots, Seeded, SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { Assets } from '../Kit/Assets'
import { Fps, Layer, Pixels, Type } from '../Kit/Film'
import { Beat, Motion } from '../Kit/Motion'
import { Palette } from '../Kit/Palette'
import { Globe, Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

export const SceneFrom = Beat.at(2)
export const Hit = Beat.at(4)
export const ShieldUp = Beat.at(5)

const Craft = { x: 330, y: 150 }
const Earth = { x: 40, y: 330, radius: 200 }
const FrontStart = 560
const FrontRadius = 300

interface Particle {
  y: number
  speed: number
  length: number
  start: number
  colour: string
}

export class StormShot extends Shot {
  private readonly stage = new Layer(480, 270)
  private readonly sky = new Sky(480, 270)
  private globe?: Globe
  private hurt?: SpriteImage
  private readonly particles: Particle[]

  constructor(start: number, end: number) {
    super(start, end)
    const random = new Seeded(2024)
    this.particles = Array.from({ length: 220 }, (_, at) => ({
      y: random.next(),
      speed: 140 + random.next() * 160,
      length: 3 + Math.floor(random.next() * 8),
      start: random.next(),
      colour: at % 5 === 0 ? '#ffffff' : at % 3 === 0 ? '#ffd27a' : at % 7 === 0 ? '#ff5263' : '#f2e05a',
    }))
  }

  draw(context: CanvasRenderingContext2D, t: number) {
    if (t < SceneFrom) this.flare(context, t)
    else this.scene(context, t)
    Type.reveal(context, 'Survive the great storm', 160, 230, t - 0.05, { size: 160, shadow: Palette.Black })
    Type.reveal(context, 'of May 2024.', 160, 380, t - Beat.at(1), { size: 160, colour: Palette.Aurora1, shadow: Palette.Black })
  }

  private flare(context: CanvasRenderingContext2D, t: number) {
    const picture = Assets.events.get('StormSevere')!
    const scale = 16
    const travel = (picture.height * scale - 1080) / scale
    const step = Math.floor(Motion.span(t, 0, SceneFrom) * travel)
    context.imageSmoothingEnabled = false
    context.drawImage(picture, -((picture.width * scale - 1920) / 2), -step * scale, picture.width * scale, picture.height * scale)
  }

  private scene(context: CanvasRenderingContext2D, t: number) {
    this.globe ??= new Globe(Earth.radius)
    const stage = this.stage
    const s = stage.context
    stage.clear(Palette.Space0)
    const since = t - SceneFrom
    this.sky.paint(s, Math.floor(since * 10), 0, Math.floor(t / Beat.Length))
    this.fronts(s, t)
    this.globe.paint(s, Earth.x, Earth.y, 0.4 + t * 0.004)
    this.aurora(s, t)
    this.streaks(s, t)
    if (t >= ShieldUp) this.shield(s, t)
    if (t >= Hit && t < Hit + 8 / Fps) this.shock(s, Math.floor((t - Hit) * Fps))
    const jolt = t >= Hit && t < Hit + 4 / Fps ? [2, -2, 1, -1][Math.floor((t - Hit) * Fps)] ?? 0 : 0
    context.fillStyle = Palette.Space0
    context.fillRect(0, 0, 1920, 1080)
    context.imageSmoothingEnabled = false
    context.drawImage(stage.canvas, jolt * 4, 0, 1920, 1080)
    const shake = t >= Hit && t < Hit + 0.2 ? [8, -8, 4, -4, 0, 0][Math.floor((t - Hit) * Fps)] ?? 0 : 0
    const sprite = (t >= ShieldUp ? Assets.craftShielded : Assets.craft)[Math.floor(t / Beat.Length) % 2]
    const hurt = t >= Hit && [0, 1, 4, 5].includes(Math.floor((t - Hit) * Fps))
    this.hurt ??= SpriteImage.silhouette(Assets.craft[0], Palette.Danger2)
    Pixels.blit(context, (hurt ? this.hurt : sprite).canvas, Craft.x * 4 + shake * 2, Craft.y * 4, Assets.craftScale)
  }

  frontX(t: number, delay = 0): number {
    const speed = (FrontStart - Craft.x) / (Hit - SceneFrom)
    return Math.round(FrontStart - speed * (t - SceneFrom - delay))
  }

  private fronts(context: CanvasRenderingContext2D, t: number) {
    const shielded = t >= ShieldUp
    const waves: [number, number, readonly string[]][] = [
      [0, 3, [Palette.White, Palette.Aurora1, Palette.Aurora1, Palette.Aurora0, Palette.Cell2]],
      [Beat.at(1), 2, [Palette.Aurora1, Palette.Aurora0, Palette.Cell2]],
      [Beat.at(2), 1, [Palette.Aurora0, Palette.Cell2]],
      [Beat.at(3), 1, [Palette.Aurora0, Palette.Cell1]],
    ]
    for (const [delay, , colours] of waves) {
      const lead = this.frontX(t, delay)
      if (lead > 520 || lead < -400) continue
      colours.forEach((colour, ring) => {
        const radius = FrontRadius + ring * 2
        const cx = lead + FrontRadius
        Dots.ring(context, cx, Craft.y, radius, colour, (angle, step) => {
          if (Math.cos(angle) > -0.35) return false
          if (ring > 1 && step % 5 > 2) return false
          if (!shielded) return true
          const x = cx + Math.cos(angle) * radius
          const y = Craft.y + Math.sin(angle) * radius
          const dx = (x - Craft.x) / 66
          const dy = (y - Craft.y) / 48
          return dx * dx + dy * dy > 1
        })
      })
    }
  }

  private aurora(context: CanvasRenderingContext2D, t: number) {
    const strength = Motion.span(t, SceneFrom, Hit)
    const tall = Math.round(4 + strength * 6)
    const beat = Math.floor((t * 1000) / 140)
    const { x: ex, y: ey, radius } = Earth
    for (let x = Math.max(0, ex - radius + 4); x < ex + radius - 4; x++) {
      const limb = Math.round(ey - Math.sqrt(radius * radius - (x - ex) ** 2))
      const wave = ((x * 7 + beat * 3) % 23) / 23
      const height = Math.max(1, Math.round(tall * (0.4 + 0.6 * Math.abs(Math.sin(x / 9 + beat / 5)))))
      for (let row = 0; row < height; row++) {
        if ((x + row + beat) % 2 === 1 && row > 1) continue
        context.fillStyle = row === 0 ? Palette.Good1 : wave > 0.5 || row > height / 2 ? Palette.Aurora1 : Palette.Aurora0
        context.fillRect(x, limb - 2 - row, 1, 1)
      }
    }
  }

  private streaks(context: CanvasRenderingContext2D, t: number) {
    const build = Motion.span(t, SceneFrom, Hit)
    const count = Math.round(30 + build * 190)
    const front = this.frontX(t)
    const shielded = t >= ShieldUp
    for (let at = 0; at < count; at++) {
      const particle = this.particles[at]
      const span = 520
      const travelled = (t * particle.speed * (0.8 + build * 0.6) + particle.start * span) % span
      const x = Math.round(500 - travelled)
      const y = Math.round(particle.y * 270)
      if (at >= 30 && x < front + 6) continue
      if (shielded) {
        const dx = (x - Craft.x) / 62
        const dy = (y - Craft.y) / 44
        if (dx * dx + dy * dy < 1) continue
      }
      Dots.px(context, x, y, particle.colour, 1, 1)
      Dots.px(context, x + 1, y, '#b9741c', particle.length, 1)
    }
  }

  private shield(context: CanvasRenderingContext2D, t: number) {
    const since = t - ShieldUp
    const grow = Math.min(1, Math.floor(since * Fps) / 4)
    const phase = Math.floor(since * Fps)
    for (const [rx, colour] of [[62, Palette.Aurora1], [58, Palette.Cell2]] as const) {
      const r = Math.round(rx * grow)
      if (r < 4) continue
      const steps = Math.ceil(2 * Math.PI * r * 1.5)
      let last = ''
      for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2
        if (Math.cos(angle) > 0.2 || (step + phase) % 6 >= 4) continue
        const x = Math.round(Craft.x + Math.cos(angle) * r)
        const y = Math.round(Craft.y + Math.sin(angle) * r * 0.72)
        const key = `${x},${y}`
        if (key === last) continue
        last = key
        Dots.px(context, x, y, colour)
      }
    }
  }

  private shock(context: CanvasRenderingContext2D, frame: number) {
    const colours = [Palette.White, Palette.White, Palette.Danger2, Palette.Aurora1, Palette.Aurora1, Palette.Aurora0, Palette.Aurora0, Palette.Cell1]
    const radius = 20 + frame * 14
    Dots.ring(context, Craft.x, Craft.y, radius, colours[frame], (_a, step) => frame < 3 || step % 3 !== 2)
    Dots.ring(context, Craft.x, Craft.y, radius + 1, colours[frame], (_a, step) => frame < 2 || step % 2 === 0)
    if (frame < 4) Dots.ring(context, Craft.x, Craft.y, Math.max(4, radius - 10), colours[Math.min(7, frame + 2)], (_a, step) => step % 2 === 0)
  }
}
