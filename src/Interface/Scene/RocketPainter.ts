import { SpriteImage } from './SpriteImage'

const Lit = '#eef3f7'
const Mid = '#c5d2e0'
const Shade = '#7c8797'
const Deep = '#4a5362'
const Band = '#2b313c'
const Line = '#161a22'
const Gold = '#e8a838'
const GoldDark = '#b9741c'
const FlameColours = ['#ffffff', '#f2e05a', '#e8a838', '#b9741c']

export enum RocketPiece {
  Stack = 'Stack',
  Upper = 'Upper',
  UpperBare = 'UpperBare',
  Lower = 'Lower',
  FairingTop = 'FairingTop',
  FairingBottom = 'FairingBottom',
}

export class PixelGrid {
  readonly cells: (string | null)[]

  constructor(readonly width: number, readonly height: number, readonly pivotX: number, readonly pivotY: number) {
    this.cells = new Array(width * height).fill(null)
  }

  set(x: number, y: number, colour: string) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.cells[y * this.width + x] = colour
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null
    return this.cells[y * this.width + x]
  }

  rotated(degrees: number): PixelGrid {
    const angle = (degrees * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const reach = Math.ceil(Math.hypot(this.width, this.height)) + 2
    const out = new PixelGrid(reach * 2, reach * 2, reach, reach)
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const dx = x - reach + 0.5
        const dy = y - reach + 0.5
        const sx = Math.floor(dx * cos + dy * sin + this.pivotX)
        const sy = Math.floor(-dx * sin + dy * cos + this.pivotY)
        const colour = this.get(sx, sy)
        if (colour) out.set(x, y, colour)
      }
    }
    return out
  }

  outlined(): PixelGrid {
    const out = new PixelGrid(this.width, this.height, this.pivotX, this.pivotY)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const here = this.get(x, y)
        if (here) out.set(x, y, here)
        else if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) {
          const flame = [x + 1, x - 1].some((nx) => FlameColours.includes(this.get(nx, y) ?? '')) || [y + 1, y - 1].some((ny) => FlameColours.includes(this.get(x, ny) ?? ''))
          if (!flame) out.set(x, y, Line)
        }
      }
    }
    return out
  }

  sprite(): SpriteImage {
    return new SpriteImage(this.width, this.height, (context) => {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const colour = this.cells[y * this.width + x]
          if (!colour) continue
          context.fillStyle = colour
          context.fillRect(x, y, 1, 1)
        }
      }
    })
  }
}

interface Layout {
  fairing: number
  upper: number
  lower: number
}

const Size: Layout = { fairing: 15, upper: 9, lower: 24 }
const Width = 15

export class RocketPainter {
  private readonly cache = new Map<string, SpriteImage>()

  sprite(piece: RocketPiece, degrees: number, flame: number): SpriteImage {
    const key = `${piece} ${degrees} ${flame}`
    let sprite = this.cache.get(key)
    if (!sprite) {
      sprite = this.grid(piece, flame).rotated(degrees).outlined().sprite()
      this.cache.set(key, sprite)
    }
    return sprite
  }

  pivot(piece: RocketPiece): number {
    if (piece === RocketPiece.UpperBare) return Size.fairing + Math.round(Size.upper / 2)
    if (piece === RocketPiece.Lower) return Size.fairing + Size.upper + 2 + Size.lower / 2
    if (piece === RocketPiece.Stack) return Math.round(this.stackHeight * 0.55)
    return Math.round((Size.fairing + Size.upper) / 2)
  }

  offset(piece: RocketPiece): number {
    return this.pivot(piece) - this.pivot(RocketPiece.Stack)
  }

  get stackHeight(): number {
    return Size.fairing + Size.upper + Size.lower + 3
  }

  private grid(piece: RocketPiece, flame: number): PixelGrid {
    const total = this.stackHeight + 14
    const pivotY = this.pivot(piece)
    const grid = new PixelGrid(Width + 4, total, Math.floor((Width + 4) / 2), pivotY)
    const centre = Math.floor((Width + 4) / 2)
    const row = (y: number, half: number, band?: string) => {
      for (let x = centre - half; x <= centre + half; x++) {
        const from = x - (centre - half)
        const share = from / Math.max(1, half * 2)
        const colour = band ?? (share < 0.25 ? Lit : share < 0.7 ? Mid : share < 0.88 ? Shade : Deep)
        grid.set(x, y, colour)
      }
    }
    const fairing = piece !== RocketPiece.Lower && piece !== RocketPiece.UpperBare
    if (fairing) {
      const noses = [0, 1, 2, 3, 4, 5, 6]
      for (let y = 0; y < Size.fairing; y++) {
        const half = y < noses.length ? noses[y] : 7
        for (let x = centre - half; x <= centre + half; x++) {
          const top = x <= centre
          if (piece === RocketPiece.FairingTop && !top) continue
          if (piece === RocketPiece.FairingBottom && top) continue
          const from = x - (centre - half)
          const share = from / Math.max(1, half * 2)
          grid.set(x, y, x === centre && y > 2 ? Shade : share < 0.25 ? Lit : share < 0.7 ? Mid : share < 0.88 ? Shade : Deep)
        }
      }
      if (piece === RocketPiece.FairingTop || piece === RocketPiece.FairingBottom) return grid
    }
    if (piece !== RocketPiece.Lower) {
      const base = Size.fairing
      row(base, 5, Band)
      for (let y = base + 1; y < base + Size.upper; y++) row(y, 4)
      row(base + 4, 4, Gold)
      row(base + 5, 4, GoldDark)
      const engine = base + Size.upper
      if (piece === RocketPiece.Upper || piece === RocketPiece.UpperBare) {
        row(engine, 2, Deep)
        row(engine + 1, 3, Band)
        this.flame(grid, centre, engine + 2, flame, 2, flame === 0 ? 0 : 4 + flame)
        return grid
      }
    }
    const start = Size.fairing + Size.upper
    row(start, 5, GoldDark)
    row(start + 1, 6, Gold)
    for (let y = start + 2; y < start + 2 + Size.lower; y++) row(y, 6)
    row(start + 8, 6, Band)
    row(start + 9, 6, Band)
    const bottom = start + 2 + Size.lower
    for (let fin = 0; fin < 6; fin++) {
      grid.set(centre - 7 - (fin > 2 ? 1 : 0), bottom - 6 + fin, Deep)
      grid.set(centre + 7 + (fin > 2 ? 1 : 0), bottom - 6 + fin, Band)
      if (fin > 2) {
        grid.set(centre - 7, bottom - 6 + fin, Shade)
        grid.set(centre + 7, bottom - 6 + fin, Deep)
      }
    }
    for (const bell of [-4, 0, 4]) {
      grid.set(centre + bell - 1, bottom, Band)
      grid.set(centre + bell, bottom, Deep)
      grid.set(centre + bell + 1, bottom, Band)
    }
    if (piece === RocketPiece.Stack) this.flame(grid, centre, bottom + 1, flame, 5, flame === 0 ? 0 : 9 + flame * 2)
    return grid
  }

  private flame(grid: PixelGrid, centre: number, top: number, frame: number, half: number, length: number) {
    for (let y = 0; y < length; y++) {
      const share = y / Math.max(1, length)
      const width = Math.max(0, Math.round(half * (1 - share * 0.8)))
      for (let x = centre - width; x <= centre + width; x++) {
        const edge = Math.abs(x - centre) / Math.max(1, width)
        let tone = share < 0.2 ? (edge < 0.5 ? 0 : 1) : share < 0.5 ? (edge < 0.4 ? 1 : 2) : share < 0.8 ? 2 : 3
        if (share > 0.7 && (x + y + frame) % 2 === 0) tone = Math.min(3, tone + 1)
        if (share > 0.85 && (x + y + frame) % 2 === 1) continue
        grid.set(x, top + y, FlameColours[tone])
      }
    }
  }
}
