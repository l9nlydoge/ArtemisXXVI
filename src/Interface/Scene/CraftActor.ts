import type { Loadout } from '../../Engine/Spacecraft/Loadout'
import { Colours } from '../Spacecraft/PixelCanvas'
import { PartKind, SpacecraftBlueprint, type Part } from '../Spacecraft/SpacecraftBlueprint'
import { SpacecraftPainter } from '../Spacecraft/SpacecraftPainter'
import { Ease, Glide, Seeded, SpriteImage } from './SpriteImage'

const OriginX = 150
const OriginY = 120
const UnfoldSteps = 8
const BobMs = 1100
const IdleMs = 700
const BeaconMs = 1600
const GlintMs = 4700
const FlashMs = 260
const ShakeMs = 320
const NoKeys: ReadonlySet<string> = new Set()

interface Piece {
  image: SpriteImage
  left: number
  top: number
  vx: number
  vy: number
}

export class CraftActor {
  private blueprint?: SpacecraftBlueprint
  private loadoutKey = ''
  private activeKey = ''
  private frames: SpriteImage[] = []
  private unfoldFrames: SpriteImage[] = []
  private flashImage?: SpriteImage
  private crop = { x: 0, y: 0, w: 1, h: 1 }
  private flashUntil = -1
  private shakeUntil = -1
  private shakeSize = 1
  private pieces: Piece[] = []
  private brokeAt = -1
  readonly x = new Glide(0, 650)
  readonly y = new Glide(0, 650)
  unfold = 1
  visible = true

  setLoadout(loadout: Loadout, active: ReadonlySet<string> = NoKeys) {
    const key = JSON.stringify(loadout.toJson())
    const activeKey = [...active].sort().join(',')
    if (key === this.loadoutKey && activeKey === this.activeKey) return
    const fresh = key !== this.loadoutKey
    this.loadoutKey = key
    this.activeKey = activeKey
    this.blueprint = new SpacecraftBlueprint(loadout)
    const painter = new SpacecraftPainter(this.blueprint)
    const painted = [painter.paint(0, active), painter.paint(1, active)]
    if (fresh) this.crop = SpacecraftPainter.crop([painter.paint(0, NoKeys), painter.paint(1, NoKeys)])
    this.frames = painted.map((pixels) => SpriteImage.fromPixels(pixels, this.crop))
    this.flashImage = SpriteImage.silhouette(this.frames[0], Colours.Danger)
    if (fresh) {
      const plain = painter.paint(0, NoKeys)
      const hull = this.blueprint.hull
      const reach = Math.max(1, ...this.blueprint.wings.map((wing) => (wing.side === 1 ? wing.box.x + wing.box.w - (hull.x + hull.w) : hull.x - wing.box.x)))
      this.unfoldFrames = Array.from({ length: UnfoldSteps + 1 }, (_, step) => {
        const limit = (reach * step) / UnfoldSteps
        return SpriteImage.fromPixels(plain, this.crop, (x, _y, owner) => {
          if (owner !== 'Wing' && owner !== 'Strut') return true
          const local = x + this.crop.x - OriginX
          const distance = Math.max(hull.x - local, local - (hull.x + hull.w - 1), 0)
          return distance <= limit
        })
      })
      this.pieces = []
      this.brokeAt = -1
    }
  }

  get width(): number {
    return this.crop.w
  }

  get height(): number {
    return this.crop.h
  }

  get broken(): boolean {
    return this.brokeAt >= 0
  }

  left(now: number): number {
    return Math.round(this.x.at(now) - this.crop.w / 2)
  }

  top(now: number): number {
    return Math.round(this.y.at(now) - this.crop.h / 2)
  }

  partAt(now: number, kinds: readonly PartKind[], key?: string): { x: number; y: number; part: Part } | undefined {
    const part = this.blueprint?.parts.find((candidate) => kinds.includes(candidate.kind) && (key === undefined || candidate.key === key))
    if (!part) return undefined
    const left = this.left(now) + part.box.x + OriginX - this.crop.x
    const top = this.top(now) + part.box.y + OriginY - this.crop.y
    return { x: left + Math.floor(part.box.w / 2), y: top + Math.floor(part.box.h / 2), part }
  }

  partBox(now: number, key: string): { left: number; top: number; w: number; h: number }[] {
    if (!this.blueprint) return []
    return this.blueprint.parts
      .filter((part) => part.key === key)
      .map((part) => ({ left: this.left(now) + part.box.x + OriginX - this.crop.x, top: this.top(now) + part.box.y + OriginY - this.crop.y, w: part.box.w, h: part.box.h }))
  }

  hoop(now: number): { cx: number; cy: number; rx: number; ry: number } | undefined {
    const hoop = this.blueprint?.hoop
    if (!hoop) return undefined
    return { cx: this.left(now) + hoop.cx + OriginX - this.crop.x, cy: this.top(now) + hoop.cy + OriginY - this.crop.y, rx: hoop.rx, ry: hoop.ry }
  }

  hit(now: number, heavy: boolean) {
    this.flashUntil = now + FlashMs
    this.shakeUntil = now + ShakeMs
    this.shakeSize = heavy ? 2 : 1
  }

  breakUp(now: number) {
    if (this.brokeAt >= 0 || !this.blueprint) return
    this.brokeAt = now
    const painter = new SpacecraftPainter(this.blueprint)
    const pixels = painter.paint(0, NoKeys)
    const owners = new Set(pixels.owners.filter((owner): owner is string => owner !== null && owner !== 'Field'))
    const random = new Seeded(Seeded.hash(this.loadoutKey))
    const left = this.left(now)
    const top = this.top(now)
    this.pieces = [...owners].map((owner) => {
      const image = SpriteImage.fromPixels(pixels, this.crop, (_x, _y, at) => at === owner)
      const angle = random.next() * Math.PI * 2
      const speed = 4 + random.next() * 9
      return { image, left, top, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1 }
    })
  }

  paint(context: CanvasRenderingContext2D, now: number, still: boolean) {
    if (!this.visible || this.frames.length === 0) return
    if (this.brokeAt >= 0) {
      const seconds = (now - this.brokeAt) / 1000
      for (const piece of this.pieces) piece.image.drawAt(context, piece.left + piece.vx * seconds, piece.top + piece.vy * seconds)
      return
    }
    const bob = still ? 0 : Math.floor(now / BobMs) % 2
    let left = this.left(now)
    const top = this.top(now) + bob
    if (now < this.shakeUntil) left += (Math.floor(now / 40) % 2 ? 1 : -1) * this.shakeSize
    const frame = still ? 0 : Math.floor(now / IdleMs) % 2
    const image = this.unfold < 1 ? this.unfoldFrames[Math.round(Ease.out(this.unfold) * UnfoldSteps)] : this.frames[frame]
    const flashing = now < this.flashUntil && Math.floor((this.flashUntil - now) / 65) % 2 === 0
    ;(flashing && this.flashImage ? this.flashImage : image).drawAt(context, left, top)
    if (still || flashing) return
    this.beacon(context, now, left, top)
    if (this.unfold >= 1) this.glint(context, now, left, top)
  }

  private beacon(context: CanvasRenderingContext2D, now: number, left: number, top: number) {
    const mast = this.blueprint?.parts.find((part) => part.kind === PartKind.Whip || part.kind === PartKind.Antenna)
    if (!mast || now % BeaconMs > 160) return
    const x = left + mast.box.x + OriginX - this.crop.x + (mast.kind === PartKind.Whip ? 1 : Math.floor(mast.box.w / 2))
    const y = top + mast.box.y + OriginY - this.crop.y
    context.fillStyle = Colours.Danger
    context.fillRect(x, y - 1, 1, 1)
    context.fillStyle = '#ff5263'
    context.fillRect(x, y, 1, 1)
  }

  private glint(context: CanvasRenderingContext2D, now: number, left: number, top: number) {
    const phase = now % GlintMs
    if (!this.blueprint || phase > 520) return
    for (const wing of this.blueprint.wings) {
      const wx = left + wing.box.x + OriginX - this.crop.x
      const wy = top + wing.box.y + OriginY - this.crop.y
      const sweep = Math.floor((phase / 520) * (wing.box.w + wing.box.h))
      for (let row = 1; row < wing.box.h - 1; row++) {
        for (const offset of [0, 1]) {
          const column = sweep - row + offset
          const inCell = column % 10
          if (column < 1 || column >= wing.box.w - 1 || inCell === 9 || inCell === 8 || inCell === 0) continue
          context.fillStyle = offset === 0 ? Colours.LensLight : Colours.CellLight
          context.fillRect(wx + column, wy + row, 1, 1)
        }
      }
    }
  }
}
