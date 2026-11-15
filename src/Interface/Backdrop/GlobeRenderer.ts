const Surface = ['#070b1a', '#0e1630', '#1b2a4e', '#173a73', '#1f5aa8', '#3b7dd8', '#7db8f2', '#c5d2e0', '#eef3f7', '#ffffff', '#1f4d2c', '#3a7a3a', '#6aa84f', '#c9a45c', '#8a6a3a', '#6b4410']
const Dimmed = [0, 0, 1, 3, 3, 4, 5, 7, 7, 8, 10, 10, 11, 15, 15, 15]
const LightsColour = '#ffcf6b'
const Bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const Sun = [0.82, 0.3, 0.49]
const ViewLatitude = (-14 * Math.PI) / 180
const ViewLongitude = (120 * Math.PI) / 180
export const GlobePad = 3

enum Mode {
  Clear = 0,
  Fixed = 1,
  Day = 2,
  Dim = 3,
  Night = 4,
}

function Packed(hex: string): number {
  const value = parseInt(hex.slice(1), 16)
  return (0xff000000 | ((value & 0xff) << 16) | (value & 0xff00) | (value >> 16)) >>> 0
}

const SurfaceWords = Surface.map(Packed)
const LightsWord = Packed(LightsColour)

export class EarthMap {
  readonly first: Uint8Array
  readonly second: Uint8Array
  readonly share: Uint8Array
  readonly lit: Uint8Array

  constructor(readonly width: number, readonly height: number, pixels: Uint8ClampedArray) {
    const count = width * height
    this.first = new Uint8Array(count)
    this.second = new Uint8Array(count)
    this.share = new Uint8Array(count)
    this.lit = new Uint8Array(count)
    for (let at = 0; at < count; at++) {
      const red = pixels[at * 4]
      const green = pixels[at * 4 + 1]
      this.first[at] = red >> 4
      this.second[at] = red & 15
      this.share[at] = green >> 4
      this.lit[at] = green & 1
    }
  }

  static load(url: string): Promise<EarthMap> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })!
        context.drawImage(image, 0, 0)
        resolve(new EarthMap(canvas.width, canvas.height, context.getImageData(0, 0, canvas.width, canvas.height).data))
      }
      image.onerror = reject
      image.src = url
    })
  }
}

export class GlobeRenderer {
  readonly size: number
  readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly image: ImageData
  private readonly words: Uint32Array
  private readonly mode: Uint8Array
  private readonly fixed: Uint32Array
  private readonly second: Uint8Array
  private readonly row: Int32Array
  private readonly column: Int32Array
  private shown = -1
  private shownTop = 0
  private shownBottom = 0

  constructor(readonly radius: number, private readonly map: EarthMap) {
    this.size = radius * 2 + GlobePad * 2
    const count = this.size * this.size
    this.mode = new Uint8Array(count)
    this.fixed = new Uint32Array(count)
    this.second = new Uint8Array(count)
    this.row = new Int32Array(count)
    this.column = new Int32Array(count)
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.size
    this.canvas.height = this.size
    this.context = this.canvas.getContext('2d')!
    this.image = this.context.createImageData(this.size, this.size)
    this.words = new Uint32Array(this.image.data.buffer)
    this.prepare()
  }

  draw(turn: number, top = 0, bottom = this.size): HTMLCanvasElement {
    const shift = Math.floor(turn * this.map.width) % this.map.width
    const from = Math.max(0, top)
    const to = Math.min(this.size, bottom)
    if (shift === this.shown && from >= this.shownTop && to <= this.shownBottom) return this.canvas
    const { map, words, mode, fixed, second, row, column } = this
    const width = map.width
    for (let at = from * this.size; at < to * this.size; at++) {
      const kind = mode[at]
      if (kind === Mode.Clear) continue
      if (kind === Mode.Fixed) {
        words[at] = fixed[at]
        continue
      }
      let x = column[at] + shift
      if (x >= width) x -= width
      const texel = row[at] * width + x
      if (kind === Mode.Night) {
        words[at] = map.lit[texel] ? LightsWord : fixed[at]
        continue
      }
      const index = second[at] < map.share[texel] ? map.second[texel] : map.first[texel]
      words[at] = SurfaceWords[kind === Mode.Dim ? Dimmed[index] : index]
    }
    if (to > from) this.context.putImageData(this.image, 0, 0, 0, from, this.size, to - from)
    this.shown = shift
    this.shownTop = from
    this.shownBottom = to
    return this.canvas
  }

  private prepare() {
    const { radius, size, map } = this
    const sinView = Math.sin(ViewLatitude)
    const cosView = Math.cos(ViewLatitude)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const at = y * size + x
        const dx = x - GlobePad + 0.5 - radius
        const dy = y - GlobePad + 0.5 - radius
        const distance = Math.hypot(dx, dy)
        const u = dx / radius
        const v = -dy / radius
        const depth = Math.sqrt(Math.max(0, 1 - u * u - v * v))
        const day = u * Sun[0] + v * Sun[1] + depth * Sun[2]
        const threshold = Bayer[(y % 4) * 4 + (x % 4)]
        this.second[at] = threshold
        const setFixed = (index: number) => {
          this.mode[at] = Mode.Fixed
          this.fixed[at] = SurfaceWords[index]
        }
        if (distance >= radius) {
          if (distance < radius + 1 && day > 0.12 && (x + y) % 2 === 0) setFixed(5)
          continue
        }
        const edge = radius - distance
        if (edge < 1.6 && day > 0.02) {
          setFixed(day > 0.12 || threshold < 8 ? 6 : 2)
          continue
        }
        if (edge < 4.6 && day > 0.12 && threshold < (edge < 3.1 ? 8 : 4)) {
          setFixed(5)
          continue
        }
        if (edge < 1.6) {
          setFixed(threshold < 8 ? 2 : 1)
          continue
        }
        const latitude = Math.asin(Math.max(-1, Math.min(1, depth * sinView + v * cosView)))
        const longitude = ViewLongitude + Math.atan2(u, depth * cosView - v * sinView)
        const column = Math.floor(((longitude + Math.PI) / (2 * Math.PI)) * map.width)
        this.column[at] = ((column % map.width) + map.width) % map.width
        this.row[at] = Math.min(map.height - 1, Math.max(0, Math.floor(((Math.PI / 2 - latitude) / Math.PI) * map.height)))
        if (day > 0.3) this.mode[at] = Mode.Day
        else if (day > 0.12) this.mode[at] = threshold >= ((0.3 - day) / 0.18) * 16 ? Mode.Day : Mode.Dim
        else if (day > -0.02) {
          if (threshold >= ((0.12 - day) / 0.14) * 16) this.mode[at] = Mode.Dim
          else setFixed(2)
        } else {
          this.mode[at] = Mode.Night
          this.fixed[at] = SurfaceWords[day > -0.12 || threshold < 8 ? 1 : 0]
        }
      }
    }
  }
}
