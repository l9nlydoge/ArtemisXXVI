import type { FlightScene, ScenePart } from './FlightScene'
import { RocketPainter, RocketPiece } from './RocketPainter'
import type { SceneView } from './SceneView'
import { Dots, Ease, Seeded } from './SpriteImage'

export const LaunchLong = 7000
export const LaunchShort = 3000
const Smoke = ['#ffffff', '#eef3f7', '#c5d2e0', '#7c8797', '#4a5362']

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
  private lastPuff = 0
  private separated = false
  private opened = false
  private finished = false

  constructor(private readonly started: number, readonly long: boolean, private readonly onDone: () => void) {}

  get length(): number {
    return this.long ? LaunchLong : LaunchShort
  }

  finish(scene: FlightScene) {
    if (this.finished) return
    this.finished = true
    scene.craft.visible = true
    scene.craft.unfold = 1
    this.onDone()
  }

  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene) {
    const t = now - this.started
    if (t >= this.length) {
      this.finish(scene)
      return
    }
    const anchor = { x: Math.round(scene.craft.x.target), y: Math.round(scene.craft.y.target) }
    if (this.long) this.paintLong(context, view, t, now, anchor, scene)
    else this.paintShort(context, t, now, anchor, scene)
    this.paintDebris(context, now)
  }

  private paintLong(context: CanvasRenderingContext2D, view: SceneView, t: number, now: number, anchor: Point, scene: FlightScene) {
    const { x: ex, y: ey, radius } = view.earth
    const siteX = Math.max(ex - radius * 0.7, Math.min(anchor.x - 120, ex + radius * 0.6))
    const siteY = ey - Math.sqrt(Math.max(0, radius * radius - (siteX - ex) ** 2))
    const half = Math.round(this.painter.stackHeight * 0.55)
    const p0 = { x: siteX, y: siteY - half + 2 }
    const p1 = { x: siteX, y: Math.min(siteY - half - 40, anchor.y + 34) }
    const p3 = { x: anchor.x - 30, y: anchor.y }
    const coast = { x: p3.x - 40, y: p3.y + 4 }
    const p2 = { x: (p1.x + coast.x) / 2 - 10, y: anchor.y + 8 }
    const upperFrom = { ...coast }
    const upperShift = Turned({ x: 0, y: this.painter.offset(RocketPiece.Upper) }, 75)
    upperFrom.x += upperShift.x
    upperFrom.y += upperShift.y
    const flame = Math.floor(now / 70) % 3 + 1
    scene.craft.visible = t >= 4400
    scene.craft.unfold = t < 4600 ? 0 : Math.min(1, (t - 4600) / 1400)
    this.paintSmoke(context, now)
    if (t < 3200) {
      let at: Point
      let angle: number
      if (t < 1800) {
        at = Mix(p0, p1, Ease.in(t / 1800))
        angle = 0
      } else {
        const s = (t - 1800) / 1400
        const a = Mix(p1, p2, s)
        const b = Mix(p2, coast, s)
        at = Mix(a, Mix(a, b, s), s)
        angle = Math.min(75, Math.floor(s * 6) * 15)
      }
      const exhaust = Turned({ x: 0, y: this.painter.stackHeight - half + 3 }, angle)
      if (now - this.lastPuff > 45) {
        this.lastPuff = now
        this.puffs.push({ x: at.x + exhaust.x, y: at.y + exhaust.y, born: now, dx: (this.random.next() - 0.5) * 6, dy: 2 + this.random.next() * 4 })
      }
      if (t < 260) {
        for (let side = -1; side <= 1; side += 2) Dots.px(context, siteX + side * (6 + Math.floor(t / 40)), siteY - 2, '#eef3f7', 4, 2)
      }
      this.painter.sprite(RocketPiece.Stack, angle, flame).draw(context, at.x, at.y)
      return
    }
    if (!this.separated) {
      this.separated = true
      const lower = Turned({ x: 0, y: this.painter.offset(RocketPiece.Lower) }, 75)
      this.debris.push({ piece: RocketPiece.Lower, from: { x: coast.x + lower.x, y: coast.y + lower.y }, born: this.started + 3200, angle: 75, vx: -16, vy: 9, spin: 30, life: 2200 })
    }
    if (t < 4400) {
      const s = (t - 3200) / 1200
      const at = Mix(upperFrom, p3, Ease.out(s))
      const angle = t < 3500 ? 75 : 90
      this.painter.sprite(RocketPiece.Upper, angle, t < 3400 ? 0 : flame).draw(context, at.x, at.y)
      return
    }
    this.open(now, p3)
  }

  private paintShort(context: CanvasRenderingContext2D, t: number, now: number, anchor: Point, scene: FlightScene) {
    const p3 = { x: anchor.x - 30, y: anchor.y }
    scene.craft.visible = t >= 1000
    scene.craft.unfold = t < 1100 ? 0 : Math.min(1, (t - 1100) / 1200)
    if (t < 1000) {
      const at = Mix({ x: p3.x - 140, y: p3.y + 24 }, p3, Ease.out(t / 1000))
      this.painter.sprite(RocketPiece.Upper, 90, Math.floor(now / 70) % 3 + 1).draw(context, at.x, at.y)
      return
    }
    this.open(now, p3)
  }

  private open(now: number, at: Point) {
    if (!this.opened) {
      this.opened = true
      this.debris.push({ piece: RocketPiece.FairingTop, from: { x: at.x + 6, y: at.y - 2 }, born: now, angle: 90, vx: -4, vy: -14, spin: -40, life: 1500 })
      this.debris.push({ piece: RocketPiece.FairingBottom, from: { x: at.x + 6, y: at.y + 2 }, born: now, angle: 90, vx: -4, vy: 14, spin: 40, life: 1500 })
      this.debris.push({ piece: RocketPiece.UpperBare, from: { x: at.x - 8, y: at.y }, born: now, angle: 90, vx: -22, vy: 3, spin: 0, life: 1900 })
    }
  }

  private paintSmoke(context: CanvasRenderingContext2D, now: number) {
    for (const puff of this.puffs) {
      const age = (now - puff.born) / 2400
      if (age >= 1) continue
      const size = 2 + Math.floor(age * 5)
      const tone = Smoke[Math.min(Smoke.length - 1, Math.floor(age * Smoke.length))]
      const x = Math.round(puff.x + puff.dx * age * 2)
      const y = Math.round(puff.y + puff.dy * age * 2)
      if (age > 0.75 && (Math.floor(now / 80) + x) % 2 === 0) continue
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
