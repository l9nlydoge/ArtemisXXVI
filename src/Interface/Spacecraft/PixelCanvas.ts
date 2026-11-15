export interface Tones {
  light: string
  mid: string
  dark: string
}

export const Colours = {
  FoilDeep: '#6b4410',
  FoilDark: '#b9741c',
  Foil: '#e8a838',
  FoilLight: '#ffd27a',
  HullDeep: '#161a22',
  HullDark: '#2b313c',
  Hull: '#4a5362',
  HullLight: '#7c8797',
  HullBright: '#b8c1cc',
  CellDeep: '#131a4d',
  Cell: '#27307e',
  CellLight: '#4c57ba',
  Glass: '#070b1a',
  Lens: '#3b7dd8',
  LensLight: '#7db8f2',
  Good: '#3ecf85',
  GoodDark: '#1f7a4d',
  Danger: '#c8323f',
  Caution: '#f2e05a',
  Aurora: '#6a3fb8',
  AuroraLight: '#b06cf0',
  White: '#ffffff',
} as const

export const FoilTones: Tones = { light: Colours.FoilLight, mid: Colours.Foil, dark: Colours.FoilDark }
export const HullTones: Tones = { light: Colours.HullBright, mid: Colours.HullLight, dark: Colours.Hull }
export const DarkHullTones: Tones = { light: Colours.HullLight, mid: Colours.Hull, dark: Colours.HullDark }

export class PixelCanvas {
  readonly colours: (string | null)[]
  readonly owners: (string | null)[]
  owner = 'Body'

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly originX: number,
    private readonly originY: number,
  ) {
    this.colours = new Array(width * height).fill(null)
    this.owners = new Array(width * height).fill(null)
  }

  set(x: number, y: number, colour: string) {
    const px = x + this.originX
    const py = y + this.originY
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return
    this.colours[py * this.width + px] = colour
    this.owners[py * this.width + px] = this.owner
  }

  rect(x: number, y: number, w: number, h: number, colour: string) {
    for (let row = 0; row < h; row++) for (let column = 0; column < w; column++) this.set(x + column, y + row, colour)
  }

  box(x: number, y: number, w: number, h: number, tones: Tones) {
    this.rect(x, y, w, h, tones.mid)
    this.rect(x, y, w, 1, tones.light)
    this.rect(x, y, 1, h, tones.light)
    this.rect(x, y + h - 1, w, 1, tones.dark)
    this.rect(x + w - 1, y + 1, 1, h - 1, tones.dark)
  }

  pattern(x: number, y: number, rows: readonly string[], key: Readonly<Record<string, string>>) {
    rows.forEach((row, dy) => [...row].forEach((symbol, dx) => key[symbol] && this.set(x + dx, y + dy, key[symbol])))
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, colour: string, keep: (x: number, y: number) => boolean = () => true) {
    const steps = Math.ceil(2 * Math.PI * Math.max(rx, ry) * 2)
    for (let step = 0; step < steps; step++) {
      const angle = (step / steps) * Math.PI * 2
      const x = Math.round(cx + Math.cos(angle) * rx)
      const y = Math.round(cy + Math.sin(angle) * ry)
      if (keep(x, y)) this.set(x, y, colour)
    }
  }

  outline(colourFor: (owner: string) => string) {
    const additions: [number, string][] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const at = y * this.width + x
        if (this.colours[at]) continue
        const neighbour = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dy]) => [x + dx, y + dy])
          .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < this.width && ny < this.height)
          .map(([nx, ny]) => this.owners[ny * this.width + nx])
          .find((owner) => owner && owner !== 'Field')
        if (neighbour) additions.push([at, colourFor(neighbour)])
      }
    }
    for (const [at, colour] of additions) this.colours[at] = colour
  }

  toImageData(): ImageData {
    const data = new ImageData(this.width, this.height)
    this.colours.forEach((colour, at) => {
      if (!colour) return
      const value = parseInt(colour.slice(1), 16)
      data.data[at * 4] = value >> 16
      data.data[at * 4 + 1] = (value >> 8) & 255
      data.data[at * 4 + 2] = value & 255
      data.data[at * 4 + 3] = 255
    })
    return data
  }
}
