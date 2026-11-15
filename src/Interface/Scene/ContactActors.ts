import { AsteroidFlyby } from '../../Engine/Events/AsteroidFlyby'
import { ExoplanetTarget, ObservingMode } from '../../Engine/Events/ExoplanetTarget'
import { EventKind, type SpaceEvent } from '../../Engine/Events/SpaceEvent'
import type { Encounter } from '../../Engine/Flight/Encounter'
import { MotionPreference } from '../Shared/MotionPreference'
import type { FlightScene } from './FlightScene'
import { PassExit, PassPath } from './PassPath'
import { RockFrames, RockPainter } from './RockPainter'
import type { SceneView } from './SceneView'
import { Dots, Ease, Glide, Seeded, SpriteImage } from './SpriteImage'

const TurnMs = 30000
const RevealMs = 1400
const LeaveMs = 2600
const TumbleMs = 260

export interface Point {
  x: number
  y: number
}

export abstract class ContactActor {
  readonly path: PassPath
  protected readonly glide: Glide
  protected turn = 0
  protected turnStarted = 0
  protected over = false
  protected revealAt: number
  protected readonly seed: number

  constructor(readonly event: SpaceEvent, readonly encounter: Encounter, now: number, readonly hidden: boolean) {
    this.path = new PassPath(encounter.contact.conditions.map((condition) => condition.signal))
    this.turn = encounter.turnIndex
    this.over = encounter.isOver
    this.glide = new Glide(this.over ? PassExit : this.path.stop(this.turn - 1), 1100)
    this.glide.set(this.over ? PassExit : this.path.stop(this.turn), now)
    this.turnStarted = now
    this.revealAt = hidden ? now + RevealMs : now
    this.seed = Seeded.hash(event.id)
  }

  sync(encounter: Encounter, now: number) {
    if (encounter.turnIndex === this.turn && encounter.isOver === this.over) return
    const reduced = MotionPreference.reduced
    this.turn = encounter.turnIndex
    this.over = encounter.isOver
    this.turnStarted = now
    if (this.over) {
      this.glide.set(PassExit, now, reduced)
      return
    }
    this.glide.set(this.path.stop(this.turn), now, reduced)
  }

  position(now: number): number {
    if (this.over || MotionPreference.reduced) return this.over && !MotionPreference.reduced ? this.leaving(now) : this.glide.target
    const drift = this.path.planning(this.turn, (now - this.turnStarted) / TurnMs) - this.path.stop(this.turn)
    return this.glide.at(now) + drift
  }

  private leaving(now: number): number {
    const from = this.path.stop(this.turn)
    return from + (PassExit - from) * Ease.in((now - this.turnStarted) / LeaveMs)
  }

  protected track(scene: FlightScene, now: number): Point {
    const stage = scene.stageArt()
    const f = this.position(now)
    const craftY = scene.craft.y.at(now)
    const top = craftY - scene.craft.height / 2
    const width = stage.right - stage.left
    const x = stage.left - 34 + f * (width + 68)
    const y = Math.max(stage.top + 10, top - 10 - 38 * (2 * f - 1) ** 2)
    return { x: Math.round(x), y: Math.round(y) }
  }

  abstract point(scene: FlightScene, now: number): Point

  protected abstract draw(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene): void

  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene) {
    if (now < this.revealAt) {
      const at = this.point(scene, now)
      UnknownBlip.paint(context, at, now)
      return
    }
    this.draw(context, view, now, scene)
    if (now < this.revealAt + 240) {
      const at = this.point(scene, now)
      const step = Math.floor((now - this.revealAt) / 80)
      Dots.ring(context, at.x, at.y, 6 + step * 3, '#7c8797', (_a, s) => s % 3 === 0)
    }
  }

  static create(encounter: Encounter, now: number): ContactActor {
    const event = encounter.event
    const hidden = event.startsUnidentified
    if (event.kind === EventKind.Storm) return new StormContact(event, encounter, now, false)
    if (event instanceof ExoplanetTarget) return new PlanetContact(event, encounter, now, hidden)
    if (event.id === 'Rare.DartImpact') return new DartContact(event, encounter, now, hidden)
    if (event.kind === EventKind.Rare) return new BurstContact(event, encounter, now, hidden)
    return new RockContact(event, encounter, now, hidden)
  }
}

export class UnknownBlip {
  static paint(context: CanvasRenderingContext2D, at: Point, now: number) {
    const on = Math.floor(now / 400) % 2 === 0
    Dots.px(context, at.x - 1, at.y, on ? '#7c8797' : '#4a5362', 3, 1)
    Dots.px(context, at.x, at.y - 1, on ? '#7c8797' : '#4a5362', 1, 3)
    const phase = Math.floor(now / 120)
    Dots.ring(context, at.x, at.y, 7, '#2b313c', (_a, step) => (step + phase) % 6 < 2)
  }
}

export class RockContact extends ContactActor {
  private readonly frames: SpriteImage[]

  constructor(event: SpaceEvent, encounter: Encounter, now: number, hidden: boolean) {
    super(event, encounter, now, hidden)
    const record = event instanceof AsteroidFlyby ? event.record : undefined
    const diameter = record ? (record.diameterMinM + record.diameterMaxM) / 2 : undefined
    this.frames = RockPainter.frames(RockPainter.radiusFor(diameter), this.seed)
  }

  point(scene: FlightScene, now: number): Point {
    return this.track(scene, now)
  }

  protected draw(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene) {
    const at = this.point(scene, now)
    const frame = MotionPreference.reduced ? 0 : Math.floor(now / TumbleMs) % RockFrames
    this.frames[frame].draw(context, at.x, at.y)
  }
}

export class DartContact extends ContactActor {
  private readonly big: SpriteImage[]
  private readonly small: SpriteImage[]
  private impactAt = -1

  constructor(event: SpaceEvent, encounter: Encounter, now: number, hidden: boolean) {
    super(event, encounter, now, hidden)
    this.big = RockPainter.frames(9, this.seed)
    this.small = RockPainter.frames(3, this.seed + 7)
    if (encounter.turnIndex > this.path.peak || encounter.isOver) this.impactAt = now - 10000
  }

  override sync(encounter: Encounter, now: number) {
    super.sync(encounter, now)
    if (this.impactAt < 0 && (encounter.turnIndex >= this.path.peak || encounter.isOver)) this.impactAt = now
  }

  private moon(scene: FlightScene, now: number): Point {
    const centre = this.track(scene, now)
    if (this.impactAt >= 0) return { x: centre.x + 13, y: centre.y - 3 }
    const step = MotionPreference.reduced ? 0 : Math.floor(now / 300) % 16
    const angle = (step / 16) * Math.PI * 2
    return { x: Math.round(centre.x + Math.cos(angle) * 14), y: Math.round(centre.y + Math.sin(angle) * 5) }
  }

  point(scene: FlightScene, now: number): Point {
    return this.moon(scene, now)
  }

  protected draw(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene) {
    const centre = this.track(scene, now)
    const moon = this.moon(scene, now)
    const frame = MotionPreference.reduced ? 0 : Math.floor(now / 400) % RockFrames
    const behind = moon.y < centre.y
    if (behind) this.small[frame].draw(context, moon.x, moon.y)
    this.big[frame].draw(context, centre.x, centre.y)
    if (!behind) this.small[frame].draw(context, moon.x, moon.y)
    if (this.impactAt < 0) {
      const share = Math.min(1, (now - this.turnStarted) / TurnMs)
      const probe = { x: Math.round(moon.x - 40 + 30 * share), y: Math.round(moon.y + 14 - 10 * share) }
      Dots.px(context, probe.x, probe.y, '#b8c1cc', 2, 1)
      Dots.px(context, probe.x - 2, probe.y, '#27307e', 2, 1)
      Dots.px(context, probe.x + 2, probe.y, '#27307e', 2, 1)
      return
    }
    const since = now - this.impactAt
    if (since < 420) {
      const size = [1, 3, 5, 3, 1][Math.min(4, Math.floor(since / 85))]
      Dots.px(context, moon.x - size, moon.y, '#ffffff', size * 2 + 1, 1)
      Dots.px(context, moon.x, moon.y - size, '#ffffff', 1, size * 2 + 1)
      Dots.px(context, moon.x - 1, moon.y - 1, '#f2e05a', 3, 3)
    }
    const random = new Seeded(this.seed)
    const reach = Math.min(1, since / 2400)
    for (let at = 0; at < 46; at++) {
      const angle = -0.6 + random.next() * 1.5
      const speed = 0.3 + random.next()
      const distance = 3 + reach * speed * 26 + ((now / 90 + at) % 3)
      const x = moon.x + Math.cos(angle) * distance
      const y = moon.y + Math.sin(angle) * distance * 0.6 - 1
      Dots.px(context, x, y, at % 4 === 0 ? '#eef3f7' : at % 3 === 0 ? '#c5d2e0' : '#7c8797')
    }
  }
}

export class BurstContact extends ContactActor {
  point(scene: FlightScene): Point {
    const stage = scene.stageArt()
    return { x: Math.round(stage.left + (stage.right - stage.left) * 0.24), y: Math.round(stage.top + (stage.bottom - stage.top) * 0.16) }
  }

  protected draw(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene) {
    const at = this.point(scene)
    const signal = this.encounter.contact.conditions[Math.min(this.turn, this.encounter.turnCount - 1)].signal
    const strength = this.over ? 0.3 : signal
    const arm = strength >= 3 ? 4 : strength >= 1 ? 2 : 1
    const flicker = Math.floor(now / 110) % 3
    Dots.px(context, at.x - arm, at.y, '#b06cf0', arm * 2 + 1, 1)
    Dots.px(context, at.x, at.y - arm, '#b06cf0', 1, arm * 2 + 1)
    Dots.px(context, at.x - 1, at.y, flicker ? '#ffffff' : '#eef3f7', 3, 1)
    Dots.px(context, at.x, at.y - 1, '#ffffff', 1, 3)
    if (MotionPreference.reduced) return
    const period = strength >= 3 ? 700 : strength >= 1 ? 1100 : 1800
    const rings = strength >= 3 ? 3 : 2
    for (let ring = 0; ring < rings; ring++) {
      const age = (now + (ring * period) / rings) % period
      const radius = 3 + Math.floor((age / period) * (strength >= 3 ? 26 : 16) / 2) * 2
      const colour = age < period * 0.35 ? '#eef3f7' : age < period * 0.7 ? '#b06cf0' : '#6a3fb8'
      Dots.ring(context, at.x, at.y, radius, colour, (_a, step) => step % 2 === 0)
    }
  }
}

export class PlanetContact extends ContactActor {
  private readonly mode: ObservingMode

  constructor(event: ExoplanetTarget, encounter: Encounter, now: number, hidden: boolean) {
    super(event, encounter, now, hidden)
    this.mode = event.mode
  }

  point(scene: FlightScene): Point {
    const stage = scene.stageArt()
    return { x: Math.round(stage.left + (stage.right - stage.left) * 0.8), y: Math.round(stage.top + (stage.bottom - stage.top) * 0.2) }
  }

  protected draw(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene) {
    const centre = this.point(scene)
    const f = this.position(now)
    let x = centre.x
    const y = centre.y
    let dim = false
    if (this.mode === ObservingMode.RadialVelocity) x += MotionPreference.reduced ? 0 : Math.floor(now / 900) % 2
    const disc = [[-1, -3, 3], [-2, -2, 5], [-3, -1, 7], [-3, 0, 7], [-3, 1, 7], [-2, 2, 5], [-1, 3, 3]]
    const dotX = Math.round(x - 6 + f * 12)
    if (this.mode === ObservingMode.Transit) dim = Math.abs(dotX - x) <= 3
    for (const [dx, dy, w] of disc) Dots.px(context, x + dx, y + dy, dim ? '#b9741c' : '#e8a838', w, 1)
    Dots.px(context, x - 1, y - 1, dim ? '#e8a838' : '#ffd27a', 3, 3)
    Dots.px(context, x, y, '#ffffff')
    if (this.mode === ObservingMode.Transit && Math.abs(dotX - x) <= 4) Dots.px(context, dotX, y, '#070b1a', 1, 1)
    if (this.mode === ObservingMode.RadialVelocity) {
      const toward = Math.floor(now / 900) % 2 === 0
      Dots.px(context, x + (toward ? -6 : 6), y, toward ? '#3b7dd8' : '#c8323f', 2, 1)
    }
    if (this.mode === ObservingMode.Imaging) {
      const angle = f * Math.PI * 1.2
      Dots.px(context, Math.round(x + Math.cos(angle) * 9), Math.round(y + Math.sin(angle) * 4), '#7c8797')
    }
    const pulse = MotionPreference.reduced ? 0 : Math.floor(now / 500) % 2
    const gap = 9 + pulse
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * gap
      const cy = y + sy * gap
      Dots.px(context, Math.min(cx, cx - sx * 2), cy, '#e8a838', 3, 1)
      Dots.px(context, cx, Math.min(cy, cy - sy * 2), '#e8a838', 1, 3)
    }
  }
}

interface Particle {
  y: number
  speed: number
  length: number
  start: number
  colour: string
}

export class StormContact extends ContactActor {
  private readonly particles: Particle[]

  constructor(event: SpaceEvent, encounter: Encounter, now: number, hidden: boolean) {
    super(event, encounter, now, hidden)
    const random = new Seeded(this.seed)
    this.particles = Array.from({ length: 140 }, (_, at) => ({
      y: random.next(),
      speed: 70 + random.next() * 90,
      length: 2 + Math.floor(random.next() * 4),
      start: random.next(),
      colour: at % 5 === 0 ? '#ffffff' : at % 3 === 0 ? '#ffd27a' : at % 7 === 0 ? '#ff5263' : '#f2e05a',
    }))
  }

  get radiation(): number {
    const conditions = this.encounter.contact.conditions
    return this.over ? 0 : conditions[Math.min(this.turn, conditions.length - 1)].radiation
  }

  point(scene: FlightScene, now: number): Point {
    const stage = scene.stageArt()
    return { x: stage.right - 8, y: Math.round(scene.craft.y.at(now)) }
  }

  protected draw(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene) {
    const radiation = this.radiation
    const peak = Math.max(...this.encounter.contact.conditions.map((condition) => condition.radiation))
    if (MotionPreference.reduced) return
    const count = Math.min(this.particles.length, Math.round(14 + radiation * 12))
    const top = 0
    const bottom = view.height
    for (let at = 0; at < count; at++) {
      const particle = this.particles[at]
      const span = view.width + 40
      const travelled = ((now / 1000) * particle.speed * (0.6 + radiation / 12) + particle.start * span) % span
      const x = Math.round(view.width + 20 - travelled)
      const y = Math.round(top + particle.y * (bottom - top))
      Dots.px(context, x, y, particle.colour, 1, 1)
      Dots.px(context, x + 1, y, '#b9741c', particle.length, 1)
    }
    const fronts = radiation >= 6 ? 3 : radiation >= 3 ? 2 : 1
    for (let front = 0; front < fronts; front++) {
      const period = 4200
      const age = (now + (front * period) / fronts) % period
      const cx = Math.round(view.width + 90 - (age / period) * (view.width + 180))
      const colour = front % 2 ? '#6a3fb8' : '#b06cf0'
      Dots.ring(context, cx + 90, Math.round(scene.craft.y.at(now)), 90, colour, (angle, step) => Math.cos(angle) < -0.55 && step % 4 < 2)
    }
    if (peak >= 4 && radiation >= 3) this.aurora(context, view, now, radiation)
  }

  private aurora(context: CanvasRenderingContext2D, view: SceneView, now: number, radiation: number) {
    const { x: ex, y: ey, radius } = view.earth
    const tall = radiation >= 6 ? 6 : 4
    const beat = Math.floor(now / 140)
    for (let x = Math.max(0, Math.ceil(ex - radius + 4)); x < Math.min(view.width, ex + radius - 4); x++) {
      const limb = Math.round(ey - Math.sqrt(radius * radius - (x - ex) ** 2))
      const wave = ((x * 7 + beat * 3) % 23) / 23
      const height = Math.max(1, Math.round(tall * (0.4 + 0.6 * Math.abs(Math.sin(x / 9 + beat / 5)))))
      for (let row = 0; row < height; row++) {
        if ((x + row + beat) % 2 === 1 && row > 1) continue
        context.fillStyle = row === 0 ? '#3ecf85' : wave > 0.5 || row > height / 2 ? '#b06cf0' : '#6a3fb8'
        context.fillRect(x, limb - 2 - row, 1, 1)
      }
    }
  }
}
