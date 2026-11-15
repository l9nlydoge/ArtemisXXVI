import { Sound, type LaunchControl } from '../Sound/Sound'
import type { FlightScene, ScenePart } from './FlightScene'
import { GroundShot } from './GroundShot'
import { Orbit, OrbitPace } from './Orbit'
import { RocketPainter, RocketPiece } from './RocketPainter'
import { SceneLayers, type SceneView } from './SceneView'
import { Dots, Ease, Seeded } from './SpriteImage'

const Smoke = ['#ffffff', '#eef3f7', '#c5d2e0', '#7c8797', '#4a5362']
const GlobeRadius = 250

export interface LaunchCut {
  hold: number
  climbPower: number
  cut: number
  pitchFrom: number
  pitchTo: number
  separation?: number
  earthGone: number
  fairing: number
  unfold: number
  earthBack: number
  length: number
}

export const LongCut: LaunchCut = { hold: 1500, climbPower: 0.703, cut: 11500, pitchFrom: 11800, pitchTo: 13000, separation: 13100, earthGone: 13900, fairing: 14300, unfold: 1300, earthBack: 15100, length: 16200 }
export const ShortCut: LaunchCut = { hold: 350, climbPower: 1300, cut: 1150, pitchFrom: 1150, pitchTo: 1450, earthGone: 1600, fairing: 1650, unfold: 800, earthBack: 1950, length: 2950 }

interface Point {
  x: number
  y: number
}

interface Puff extends Point {
  born: number
  dx: number
  dy: number
}

interface Debris {
  piece: RocketPiece
  from: Point
  born: number
  angle: number
  vx: number
  vy: number
  spin: number
  life: number
}

function Mix(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function Turned(offset: Point, degrees: number): Point {
  const angle = (degrees * Math.PI) / 180
  return { x: offset.x * Math.cos(angle) - offset.y * Math.sin(angle), y: offset.x * Math.sin(angle) + offset.y * Math.cos(angle) }
}

export class LaunchPart implements ScenePart {
  private readonly painter = new RocketPainter()
  private readonly puffs: Puff[] = []
  private readonly debris: Debris[] = []
  private readonly random = new Seeded(26)
  private readonly sound: LaunchControl
  private readonly beats: [number, () => void][]
  private readonly cut: LaunchCut
  private ground?: GroundShot
  private lastPuff = 0
  private separated = false
  private opened = false
  private finished = false
  private returned = false
  private lastView?: SceneView

  constructor(private readonly started: number, readonly long: boolean, private readonly ambience: 'Flight' | 'Storm', private readonly onDone: () => void) {
    this.cut = long ? LongCut : ShortCut
    const cut = this.cut
    SceneLayers.shared.holdEarth()
    Orbit.shared.hold(0)
    Sound.ambience('Silent')
    this.sound = Sound.launch({ manual: true })
    this.beats = [
      [cut.hold, () => this.sound.liftoff()],
      [cut.hold + 150, () => this.sound.climb((cut.earthGone - cut.hold) / 1000)],
      ...(cut.separation !== undefined ? [[cut.separation, () => this.sound.stageSeparation()] as [number, () => void]] : []),
      [cut.fairing, () => this.sound.fairingRelease()],
      [cut.fairing + 100, () => this.sound.deploy()],
      [cut.earthBack, () => this.bringEarthBack()],
    ]
  }

  get length(): number {
    return this.cut.length
  }

  finish(scene: FlightScene, skipped = false) {
    if (this.finished) return
    this.finished = true
    if (skipped) this.sound.stop()
    if (!this.returned) {
      this.returned = true
      SceneLayers.shared.releaseEarth(undefined, true)
      Orbit.shared.hold(undefined)
      Orbit.shared.aim(OrbitPace.Scan)
      Sound.ambience(this.ambience)
    }
    scene.craft.visible = true
    scene.craft.unfold = 1
    this.onDone()
  }

  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene) {
    const t = now - this.started
    while (this.beats.length > 0 && t >= this.beats[0][0]) this.beats.shift()![1]()
    if (t >= this.length) {
      this.finish(scene)
      return
    }
    if (!this.ground || this.ground.width !== view.width || this.ground.height !== view.height) {
      this.ground = new GroundShot(view.width, view.height, Math.round(view.height * 0.66), Math.round(view.width * 0.5))
    }
    this.lastView = view
    this.draw(context, view, t, now, scene)
    this.paintDebris(context, now)
  }

  private bringEarthBack() {
    if (this.returned) return
    this.returned = true
    const view = this.lastView
    const from = view ? { x: Math.round(view.width * 0.5), y: view.height + GlobeRadius + 6, radius: GlobeRadius } : undefined
    SceneLayers.shared.releaseEarth(from, false)
    Orbit.shared.hold(undefined)
    Orbit.shared.aim(OrbitPace.Scan)
    Sound.ambience(this.ambience)
  }

  private altitude(t: number): number {
    const flying = Math.max(0, (t - this.cut.hold) / 1000)
    return this.cut.climbPower * flying ** 3
  }

  private draw(context: CanvasRenderingContext2D, view: SceneView, t: number, now: number, scene: FlightScene) {
    const ground = this.ground!
    const cut = this.cut
    const { height } = view
    const half = this.painter.pivot(RocketPiece.Stack)
    const base = this.painter.stackHeight - half
    const groundY = ground.groundY
    const padPivot = { x: ground.padX, y: groundY - base - 1 }
    const lockY = Math.round(height * 0.44)
    const rocketAlt = Math.round(this.altitude(t))
    const lift = Math.max(0, rocketAlt - (padPivot.y - lockY))
    const pivotY = padPivot.y - rocketAlt + lift
    const anchor = { x: Math.round(scene.craft.x.target), y: Math.round(scene.craft.y.target) }
    const release = { x: anchor.x - 30, y: anchor.y }
    const flame = Math.floor(now / 70) % 3 + 1
    const shake = t < cut.hold && t > cut.hold * 0.5 ? (Math.floor(now / 50) % 2) : 0

    scene.craft.visible = t >= cut.fairing
    scene.craft.unfold = t < cut.fairing + 150 ? 0 : Math.min(1, (t - cut.fairing - 150) / cut.unfold)

    const inGround = t < cut.cut
    if (inGround) {
      ground.paintSky(context, lift)
      ground.paintGround(context, lift)
      ground.paintClouds(context, lift, false, now / 900)
    } else this.holdGlobe(view, t)

    if (inGround) this.paintSmoke(context, now, lift, { x: padPivot.x, y: pivotY + base + 2 }, t)

    let rocket: Point = { x: padPivot.x, y: pivotY + shake }
    let angle = 0
    if (t >= cut.pitchFrom) {
      const s = Math.min(1, (t - cut.pitchFrom) / (cut.pitchTo - cut.pitchFrom))
      angle = Math.min(75, Math.floor(s * 6) * 15)
      const path = Math.min(1, (t - cut.pitchFrom) / (cut.fairing - cut.pitchFrom))
      rocket = Mix({ x: padPivot.x, y: lockY }, release, Ease.inOut(path))
    }
    const staged = cut.separation === undefined ? t >= cut.pitchTo : t >= cut.separation
    if (t < cut.fairing) {
      if (!staged) this.painter.sprite(RocketPiece.Stack, angle, t < 120 ? 0 : flame).draw(context, rocket.x, rocket.y)
      else {
        if (!this.separated && cut.separation !== undefined) {
          this.separated = true
          const lower = Turned({ x: 0, y: this.painter.offset(RocketPiece.Lower) }, angle)
          this.debris.push({ piece: RocketPiece.Lower, from: { x: rocket.x + lower.x, y: rocket.y + lower.y }, born: now, angle, vx: -14, vy: 16, spin: 30, life: 1800 })
        }
        this.painter.sprite(RocketPiece.Upper, t < cut.pitchTo + 150 ? 75 : 90, flame).draw(context, rocket.x, rocket.y)
      }
    } else this.open(now, release)

    if (inGround) {
      ground.paintClouds(context, lift, true, now / 900)
      const deck = this.deckPlace(view)
      const top = deck.top + lift
      if (top < height && top + deck.thickness > 0) ground.paintDeck(context, top, deck.thickness)
    } else if (t < cut.cut + 900) {
      const deck = this.deckPlace(view)
      const top = deck.top + Math.max(0, Math.round(this.altitude(t)) - (padPivot.y - lockY))
      if (top < height) ground.paintDeck(context, top, deck.thickness)
    }
  }

  private deckPlace(view: SceneView): { top: number; thickness: number } {
    const ground = this.ground!
    const half = this.painter.pivot(RocketPiece.Stack)
    const base = this.painter.stackHeight - half
    const padY = ground.groundY - base - 1
    const lockY = Math.round(view.height * 0.44)
    const liftAtCut = Math.max(0, this.altitude(this.cut.cut) - (padY - lockY))
    const speed = (3 * this.cut.climbPower * ((this.cut.cut - this.cut.hold) / 1000) ** 2) / 1000
    const thickness = view.height + Math.ceil(speed * 140) + 30
    return { top: Math.round(view.height / 2 - thickness / 2 - liftAtCut), thickness }
  }

  private holdGlobe(view: SceneView, t: number) {
    if (t >= this.cut.earthGone) {
      if (!this.returned) SceneLayers.shared.holdEarth()
      return
    }
    const share = Ease.in((t - this.cut.cut) / (this.cut.earthGone - this.cut.cut))
    const startTop = Math.round(view.height * 0.6)
    const top = Math.round(startTop + (view.height + 4 - startTop) * share)
    SceneLayers.shared.holdEarth({ x: Math.round(view.width * 0.5), y: top + GlobeRadius, radius: GlobeRadius })
  }

  private open(now: number, at: Point) {
    if (this.opened) return
    this.opened = true
    this.debris.push({ piece: RocketPiece.FairingTop, from: { x: at.x + 6, y: at.y - 2 }, born: now, angle: 90, vx: -4, vy: -14, spin: -40, life: 1500 })
    this.debris.push({ piece: RocketPiece.FairingBottom, from: { x: at.x + 6, y: at.y + 2 }, born: now, angle: 90, vx: -4, vy: 14, spin: 40, life: 1500 })
    this.debris.push({ piece: RocketPiece.UpperBare, from: { x: at.x - 8, y: at.y }, born: now, angle: 90, vx: -22, vy: 3, spin: 0, life: 1900 })
  }

  private paintSmoke(context: CanvasRenderingContext2D, now: number, lift: number, exhaust: Point, t: number) {
    const onPad = t < this.cut.hold + 250
    if (t > 80 && now - this.lastPuff > 35) {
      this.lastPuff = now
      const spread = onPad ? (this.random.next() < 0.5 ? -1 : 1) * (18 + this.random.next() * 34) : (this.random.next() - 0.5) * 6
      this.puffs.push({ x: exhaust.x + (this.random.next() - 0.5) * 4, y: exhaust.y - lift, born: now, dx: spread, dy: onPad ? -this.random.next() * 3 : 3 + this.random.next() * 4 })
    }
    for (const puff of this.puffs) {
      const age = (now - puff.born) / 2600
      if (age >= 1) continue
      const size = 3 + Math.floor(age * 7)
      const tone = Smoke[Math.min(Smoke.length - 1, Math.floor(age * Smoke.length))]
      const x = Math.round(puff.x + puff.dx * age * 2.4)
      const y = Math.round(puff.y + puff.dy * age * 2.4 + lift)
      if (age > 0.78 && (Math.floor(now / 80) + x) % 2 === 0) continue
      Dots.px(context, x - size + 1, y - Math.max(0, size - 2), tone, size * 2 - 1, Math.max(1, size * 2 - 3))
      Dots.px(context, x - Math.max(0, size - 2), y - size + 1, tone, Math.max(1, size * 2 - 3), size * 2 - 1)
    }
  }

  private paintDebris(context: CanvasRenderingContext2D, now: number) {
    for (const piece of this.debris) {
      const age = now - piece.born
      if (age < 0 || age > piece.life) continue
      if (age > piece.life - 320 && Math.floor(age / 80) % 2 === 0) continue
      const seconds = age / 1000
      const angle = piece.angle + Math.round((piece.spin * seconds) / 15) * 15
      this.painter.sprite(piece.piece, ((angle % 360) + 360) % 360, 0).draw(context, piece.from.x + piece.vx * seconds, piece.from.y + piece.vy * seconds)
    }
  }
}
