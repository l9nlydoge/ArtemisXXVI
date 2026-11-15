import { Dots, Seeded } from '../../../src/Interface/Scene/SpriteImage'
import { Assets } from '../Kit/Assets'
import { Fps, Layer, Pixels, Type } from '../Kit/Film'
import { Beat, Motion } from '../Kit/Motion'
import { Bayer, Palette } from '../Kit/Palette'
import { Globe, Sky } from '../Kit/Sky'
import { Shot } from '../Kit/Timeline'

export const SceneFrom = Beat.at(2)
export const Hit = Beat.at(4)
export const ShieldUp = Beat.at(5)

const Craft = { x: 330, y: 150 }
const Earth = { x: 40, y: 330, radius: 200 }

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
  private readonly particles: Particle[]

  constructor(start: number, end: number) {
    super(start, end)
    const random = new Seeded(2024)
    this.particles = Array.from({ length: 220 }, (_, at) => ({
      y: random.next(),
      speed: 140 + random.next() * 160,
      length: 2 + Math.floor(random.next() * 5),
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
    Pixels.present(context, stage)
    const shake = t >= Hit && t < Hit + 0.2 ? [8, -8, 4, -4, 0, 0][Math.floor((t - Hit) * Fps)] ?? 0 : 0
    const sprite = (t >= ShieldUp ? Assets.craftShielded : Assets.craft)[Math.floor(t / Beat.Length) % 2]
    Pixels.blit(context, sprite.canvas, Craft.x * 4 + shake * 2, Craft.y * 4, Assets.craftScale)
    if (t >= Hit && t < Hit + 3 / Fps) this.flash(context, Math.floor((t - Hit) * Fps))
  }

  private fronts(context: CanvasRenderingContext2D, t: number) {
    const period = Beat.at(2)
    for (let front = 0; front < 3; front++) {
      const age = ((t + (front * period) / 3) % period) / period
      const cx = Math.round(480 + 140 - age * (480 + 280))
      Dots.ring(context, cx + 140, Craft.y, 140, front % 2 ? Palette.Aurora0 : Palette.Aurora1, (angle, step) => Math.cos(angle) < -0.5 && step % 4 < 2)
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
    const count = Math.round(40 + build * 180)
    const shielded = t >= ShieldUp
    for (let at = 0; at < count; at++) {
      const particle = this.particles[at]
      const span = 520
      const travelled = (t * particle.speed * (0.8 + build * 0.6) + particle.start * span) % span
      const x = Math.round(500 - travelled)
      const y = Math.round(particle.y * 270)
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

  private flash(context: CanvasRenderingContext2D, frame: number) {
    const colour = frame === 0 ? Palette.White : frame === 1 ? Palette.Aurora1 : Palette.Aurora0
    const level = frame === 0 ? 6 : frame === 1 ? 3 : 1
    context.fillStyle = colour
    for (let y = 0; y < 1080; y += 40) for (let x = 0; x < 1920; x += 40) if (Bayer[((y / 40) % 4) * 4 + ((x / 40) % 4)] < level) context.fillRect(x, y, 40, 40)
  }
}
