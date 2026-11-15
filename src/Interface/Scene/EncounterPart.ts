import { Channel } from '../../Engine/Events/Channel'
import type { Encounter } from '../../Engine/Flight/Encounter'
import type { TurnOutcome } from '../../Engine/Flight/TurnPreview'
import type { Spacecraft } from '../../Engine/Spacecraft/Spacecraft'
import { MotionPreference } from '../Shared/MotionPreference'
import { PartKind } from '../Spacecraft/SpacecraftBlueprint'
import { ContactActor, type Point } from './ContactActors'
import type { FlightScene, SceneEffect, ScenePart } from './FlightScene'
import type { SceneView } from './SceneView'
import { Dots, Ease, Seeded } from './SpriteImage'

const Spectrum = ['#c8323f', '#e8a838', '#f2e05a', '#3ecf85', '#3b7dd8', '#b06cf0']
const ChannelColour: Readonly<Record<Channel, string>> = {
  [Channel.Visible]: '#7db8f2',
  [Channel.Spectrum]: '#b06cf0',
  [Channel.Radar]: '#b8c1cc',
  [Channel.Particles]: '#f2e05a',
  [Channel.HighEnergy]: '#ffffff',
}
const PartFor: Readonly<Record<string, PartKind>> = {
  Camera: PartKind.Camera,
  Spectrometer: PartKind.Spectrometer,
  Radar: PartKind.Radar,
  ParticleDetector: PartKind.ParticleDetector,
  HighEnergyDetector: PartKind.HighEnergyDetector,
}

export class EncounterPart implements ScenePart {
  private actor?: ContactActor
  private encounter?: Encounter
  private plan: readonly string[] = []

  constructor(private readonly craft: Spacecraft) {}

  sync(encounter: Encounter, plan: Iterable<string>, now: number) {
    if (encounter !== this.encounter) {
      this.encounter = encounter
      this.actor = ContactActor.create(encounter, now)
    } else this.actor?.sync(encounter, now)
    this.plan = encounter.isOver ? [] : [...plan]
  }

  contactPoint(scene: FlightScene, now: number): Point | undefined {
    return this.actor?.point(scene, now)
  }

  committed(scene: FlightScene, outcome: TurnOutcome, keys: readonly string[], now: number) {
    const from = this.contactPoint(scene, now)
    for (const [channel, gain] of outcome.gains) if (from && gain > 0) scene.add(new DataFlow(from, channel, gain, now))
    if (outcome.blocked > 0) scene.add(new ShieldDeflect(now))
    if (outcome.incoming > 0) {
      scene.craft.hit(now, outcome.incoming >= 6)
      scene.add(new RadiationStreaks(now, outcome.incoming))
    }
    const thrusters = this.craft.thrusters
    if (thrusters && keys.includes(thrusters.key)) scene.add(new ThrusterPuffs(thrusters.key, now))
    const drone = this.craft.repairDrone
    if (drone && keys.includes(drone.key) && outcome.repaired > 0) scene.add(new DroneRepair(drone.key, now))
  }

  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene) {
    if (!this.actor) return
    this.actor.paint(context, view, now, scene)
  }

  paintBack(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene) {
    this.beams(context, now, scene)
  }

  private beams(context: CanvasRenderingContext2D, now: number, scene: FlightScene) {
    const target = this.contactPoint(scene, now)
    if (!target || this.plan.length === 0) return
    const shield = this.craft.magneticShield
    if (shield && this.plan.includes(shield.key)) this.field(context, now, scene)
    for (const key of this.plan) {
      const module = this.craft.active(key)
      const kind = module && PartFor[module.card.id]
      if (!kind) continue
      const part = scene.craft.partAt(now, [kind], key)
      if (!part) continue
      const from = { x: part.x, y: kind === PartKind.Camera || kind === PartKind.Spectrometer ? part.part.box.y + part.y - part.part.box.y : part.y }
      const phase = MotionPreference.reduced ? 0 : Math.floor(now / 70)
      switch (kind) {
        case PartKind.Camera: {
          Dots.dashed(context, from.x, from.y, target.x, target.y, '#7db8f2', 2, 4, phase)
          if (now % 1300 < 90) {
            Dots.px(context, part.x - 2, part.y + Math.floor(part.part.box.h / 2), '#ffffff', 5, 1)
            Dots.px(context, part.x, part.y + Math.floor(part.part.box.h / 2) - 2, '#ffffff', 1, 5)
          }
          break
        }
        case PartKind.Spectrometer: {
          Dots.dashed(context, from.x, from.y, target.x, target.y, '#6a3fb8', 1, 5, phase)
          const shift = Math.floor(now / 150) % Spectrum.length
          Spectrum.forEach((_, at) => Dots.px(context, target.x - 3 + at, target.y + 9, Spectrum[(at + shift) % Spectrum.length]))
          break
        }
        case PartKind.Radar: {
          const dx = target.x - from.x
          const dy = target.y - from.y
          const length = Math.max(1, Math.hypot(dx, dy))
          const ux = dx / length
          const uy = dy / length
          for (let arc = 0; arc < 4; arc++) {
            const travel = ((now / 900 + arc / 4) % 1) * length
            const cx = from.x + ux * travel
            const cy = from.y + uy * travel
            for (let side = -3; side <= 3; side++) {
              const bend = Math.abs(side) >= 2 ? -1 : 0
              Dots.px(context, cx - uy * side + ux * bend, cy + ux * side + uy * bend, travel / length > 0.8 ? '#4a5362' : '#b8c1cc')
            }
          }
          break
        }
        case PartKind.ParticleDetector:
        case PartKind.HighEnergyDetector: {
          const colour = kind === PartKind.ParticleDetector ? '#f2e05a' : '#ffffff'
          const random = new Seeded(kind.length)
          for (let track = 0; track < 5; track++) {
            const offset = random.next()
            const age = ((now / 700 + offset) % 1)
            const sx = target.x + (random.next() - 0.5) * 24
            const sy = target.y + (random.next() - 0.5) * 18
            const x = sx + (from.x - sx) * age
            const y = sy + (from.y - sy) * age
            Dots.line(context, x, y, x + (sx - from.x) * 0.06, y + (sy - from.y) * 0.06, colour)
          }
          break
        }
      }
    }
  }

  private field(context: CanvasRenderingContext2D, now: number, scene: FlightScene) {
    const hoop = scene.craft.hoop(now)
    if (!hoop) return
    const phase = Math.floor(now / 90)
    Dots.ring(context, hoop.cx, hoop.cy, hoop.rx + 4, '#b06cf0', (_a, step) => (step + phase) % 7 < 2)
  }
}

class DataFlow implements SceneEffect {
  constructor(private readonly from: Point, private readonly channel: Channel, private readonly gain: number, private readonly started: number) {}

  paint(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene): boolean {
    const target = craftCentre(scene, now)
    const count = Math.min(12, this.gain)
    let alive = false
    for (let packet = 0; packet < count; packet++) {
      const age = (now - this.started - packet * 45) / 520
      if (age < 0) {
        alive = true
        continue
      }
      if (age > 1) continue
      alive = true
      const t = Ease.in(age)
      const x = this.from.x + (target.x - this.from.x) * t
      const y = this.from.y + (target.y - this.from.y) * t - Math.sin(t * Math.PI) * 8
      const colour = this.channel === Channel.Spectrum ? Spectrum[packet % Spectrum.length] : ChannelColour[this.channel]
      Dots.px(context, x, y, colour, 2, 2)
    }
    return alive
  }
}

function craftCentre(scene: FlightScene, now: number): Point {
  return { x: Math.round(scene.craft.x.at(now)), y: Math.round(scene.craft.y.at(now)) }
}

class ShieldDeflect implements SceneEffect {
  constructor(private readonly started: number) {}

  paint(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene): boolean {
    const age = now - this.started
    if (age > 420) return false
    const hoop = scene.craft.hoop(now)
    if (!hoop) return false
    const step = Math.floor(age / 70)
    if (step % 2 === 0) Dots.ring(context, hoop.cx, hoop.cy, hoop.rx + 4, '#ffffff', (angle) => Math.cos(angle) > 0.45)
    for (let spark = 0; spark < 6; spark++) {
      const angle = -0.7 + spark * 0.28
      const reach = hoop.rx + 5 + step * 3
      Dots.px(context, hoop.cx + Math.cos(angle) * reach, hoop.cy + Math.sin(angle) * reach * 0.6, '#b06cf0', 2, 1)
    }
    return true
  }
}

class RadiationStreaks implements SceneEffect {
  constructor(private readonly started: number, private readonly amount: number) {}

  paint(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene): boolean {
    const age = (now - this.started) / 300
    if (age > 1) return false
    const centre = craftCentre(scene, now)
    const random = new Seeded(Math.floor(this.started))
    for (let streak = 0; streak < Math.min(14, 3 + this.amount); streak++) {
      const sy = centre.y + (random.next() - 0.5) * 30
      const sx = centre.x + 50 + random.next() * 30
      const x = sx + (centre.x + (random.next() - 0.5) * 12 - sx) * age
      Dots.px(context, x, sy + (centre.y - sy) * age * 0.5, '#ff5263', 3, 1)
    }
    return true
  }
}

class ThrusterPuffs implements SceneEffect {
  constructor(private readonly key: string, private readonly started: number) {}

  paint(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene): boolean {
    const age = now - this.started
    if (age > 380) return false
    const boxes = scene.craft.partBox(now, this.key)
    const step = Math.floor(age / 95)
    const colours = ['#ffffff', '#eef3f7', '#c5d2e0', '#7c8797']
    for (const box of boxes) {
      const x = box.left + Math.floor(box.w / 2)
      const y = box.top + box.h + 1 + step * 2
      Dots.px(context, x - 1 - step, y, colours[step], 3 + step * 2, 2)
      if (step < 2) Dots.px(context, x, y - 1, '#ffd27a', 1, 1)
    }
    return true
  }
}

class DroneRepair implements SceneEffect {
  constructor(private readonly key: string, private readonly started: number) {}

  paint(context: CanvasRenderingContext2D, _view: SceneView, now: number, scene: FlightScene): boolean {
    const age = (now - this.started) / 400
    if (age > 1) return false
    const box = scene.craft.partBox(now, this.key)[0]
    if (!box) return false
    const home = { x: box.left + box.w / 2, y: box.top + box.h / 2 }
    const centre = craftCentre(scene, now)
    const out = age < 0.5 ? Ease.out(age * 2) : Ease.out((1 - age) * 2)
    const x = home.x + (centre.x - home.x) * out
    const y = home.y + (centre.y - 6 - home.y) * out
    Dots.px(context, x - 1, y - 1, '#b8c1cc', 3, 2)
    Dots.px(context, x, y - 2, '#b9741c', 1, 1)
    if (age > 0.4 && age < 0.65) Dots.px(context, centre.x - 1, centre.y - 4, Math.floor(now / 50) % 2 ? '#3ecf85' : '#ffffff', 2, 2)
    return true
  }
}
