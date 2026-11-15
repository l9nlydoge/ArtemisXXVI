import { Seeded, SpriteImage } from './SpriteImage'

const Bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const SkyStops: readonly [number, string | null][] = [
  [40, '#7db8f2'],
  [110, '#3b7dd8'],
  [190, '#1f5aa8'],
  [270, '#173a73'],
  [350, '#1b2a4e'],
  [420, '#0e1630'],
  [480, '#070b1a'],
  [540, null],
]

function Packed(hex: string): number {
  const value = parseInt(hex.slice(1), 16)
  return (0xff000000 | ((value & 0xff) << 16) | (value & 0xff00) | (value >> 16)) >>> 0
}

const SkyWords = SkyStops.map(([, colour]) => (colour ? Packed(colour) : 0))

export interface GroundLayer {
  image: SpriteImage
  top: number
  depth: number
  fill?: string
}

export interface CloudPuff {
  image: SpriteImage
  x: number
  altitude: number
  front: boolean
}

export class GroundShot {
  readonly layers: GroundLayer[]
  readonly clouds: CloudPuff[]
  readonly deck: SpriteImage
  private readonly sky: HTMLCanvasElement
  private readonly skyContext: CanvasRenderingContext2D
  private readonly skyImage: ImageData
  private readonly skyWords: Uint32Array

  constructor(readonly width: number, readonly height: number, readonly groundY: number, readonly padX: number) {
    const random = new Seeded(2026)
    this.layers = [this.far(random), this.coast(random), this.fields(random), this.near(random)]
    this.clouds = Array.from({ length: 9 }, (_, at) => ({
      image: GroundShot.cloud(10 + Math.floor(random.next() * 22), 4 + Math.floor(random.next() * 5), random),
      x: Math.floor(random.next() * width),
      altitude: 110 + at * 34 + Math.floor(random.next() * 20),
      front: at % 3 === 1,
    }))
    this.deck = GroundShot.deckImage(width, random)
    this.sky = document.createElement('canvas')
    this.sky.width = width
    this.sky.height = height
    this.skyContext = this.sky.getContext('2d')!
    this.skyImage = this.skyContext.createImageData(width, height)
    this.skyWords = new Uint32Array(this.skyImage.data.buffer)
  }

  paintSky(context: CanvasRenderingContext2D, lift: number) {
    const { width, height, skyWords } = this
    for (let y = 0; y < height; y++) {
      const altitude = lift + (this.groundY - y)
      let stop = 0
      while (stop < SkyStops.length - 1 && altitude > SkyStops[stop][0]) stop++
      const low = stop === 0 ? SkyStops[0][0] - 1 : SkyStops[stop - 1][0]
      const high = SkyStops[stop][0]
      const share = stop === 0 ? 1 : Math.max(0, Math.min(1, (altitude - low) / (high - low)))
      const under = SkyWords[Math.max(0, stop - 1)]
      const over = SkyWords[stop]
      const row = y * width
      const bayerRow = (y % 4) * 4
      for (let x = 0; x < width; x++) skyWords[row + x] = Bayer[bayerRow + (x % 4)] < share * 16 ? over : under
    }
    this.skyContext.putImageData(this.skyImage, 0, 0)
    context.drawImage(this.sky, 0, 0)
  }

  paintGround(context: CanvasRenderingContext2D, lift: number) {
    for (const layer of this.layers) {
      const top = Math.round(layer.top + lift * layer.depth)
      if (top >= this.height) continue
      layer.image.drawAt(context, 0, top)
      if (layer.fill) {
        const below = top + layer.image.height
        if (below < this.height) {
          context.fillStyle = layer.fill
          context.fillRect(0, below, this.width, this.height - below)
        }
      }
    }
  }

  paintClouds(context: CanvasRenderingContext2D, lift: number, front: boolean, drift: number) {
    for (const puff of this.clouds) {
      if (puff.front !== front) continue
      const y = this.groundY - puff.altitude + lift
      if (y < -puff.image.height || y > this.height + puff.image.height) continue
      const x = ((puff.x + Math.floor(drift)) % (this.width + 60)) - 30
      puff.image.draw(context, x, y)
    }
  }

  paintDeck(context: CanvasRenderingContext2D, top: number, thickness: number) {
    const bottom = Math.round(top + thickness)
    const rows = this.deck.height
    const start = Math.round(top)
    this.deck.drawAt(context, 0, start - rows)
    if (bottom > start) {
      context.fillStyle = '#eef3f7'
      context.fillRect(0, Math.max(0, start), this.width, Math.min(this.height, bottom) - Math.max(0, start))
    }
    context.save()
    context.translate(0, bottom + rows)
    context.scale(1, -1)
    context.drawImage(this.deck.canvas, 0, 0)
    context.restore()
  }

  private far(random: Seeded): GroundLayer {
    const height = 9
    const image = new SpriteImage(this.width, height, (context) => {
      for (let x = 0; x < this.width; x++) {
        const hill = Math.max(0, Math.round(2 + 2 * Math.sin(x / 23 + 1) + 1.5 * Math.sin(x / 9) + random.next()))
        for (let y = 0; y < height; y++) {
          let colour = '#1f5aa8'
          if (y === 0) colour = '#7db8f2'
          else if (y < 1 + hill && x > this.width * 0.55) colour = y === 1 ? '#3a7a3a' : '#1f4d2c'
          else if (y < 3) colour = (x + y) % 2 ? '#3b7dd8' : '#7db8f2'
          else if ((Bayer[(y % 4) * 4 + (x % 4)] < 4)) colour = '#3b7dd8'
          context.fillStyle = colour
          context.fillRect(x, y, 1, 1)
        }
      }
    })
    return { image, top: this.groundY - 46, depth: 0.12, fill: '#1f5aa8' }
  }

  private coast(random: Seeded): GroundLayer {
    const height = 16
    const image = new SpriteImage(this.width, height, (context) => {
      context.fillStyle = '#1f5aa8'
      context.fillRect(0, 0, this.width, height)
      for (let at = 0; at < this.width / 6; at++) {
        context.fillStyle = '#3b7dd8'
        context.fillRect(Math.floor(random.next() * this.width), Math.floor(random.next() * height), 2, 1)
      }
      for (let y = 0; y < height; y++) {
        const shore = Math.round(this.width * 0.62 - y * 4 + 6 * Math.sin(y * 0.9))
        context.fillStyle = '#c9a45c'
        context.fillRect(shore, y, 2, 1)
        context.fillStyle = y % 3 === 0 ? '#6aa84f' : '#3a7a3a'
        context.fillRect(shore + 2, y, this.width - shore - 2, 1)
        const west = Math.round(this.width * 0.18 - y * 3 + 4 * Math.sin(y * 1.3))
        if (west > 0) {
          context.fillStyle = '#3a7a3a'
          context.fillRect(0, y, west, 1)
          context.fillStyle = '#c9a45c'
          context.fillRect(west, y, 1, 1)
        }
      }
    })
    return { image, top: this.groundY - 37, depth: 0.3, fill: '#3a7a3a' }
  }

  private fields(random: Seeded): GroundLayer {
    const height = 24
    const image = new SpriteImage(this.width, height, (context) => {
      const tones = ['#6aa84f', '#3a7a3a', '#c9a45c', '#8a6a3a', '#6aa84f']
      let row = 0
      for (const band of [2, 3, 3, 4, 5, 7]) {
        let x = -Math.floor(random.next() * 20)
        while (x < this.width) {
          const w = band * 4 + Math.floor(random.next() * band * 8)
          context.fillStyle = tones[Math.floor(random.next() * tones.length)]
          context.fillRect(x, row, w, band)
          if (band > 2) {
            context.fillStyle = '#1f4d2c'
            context.fillRect(x, row, 1, band)
          }
          x += w
        }
        context.fillStyle = '#1f4d2c'
        context.fillRect(0, row + band - 1, this.width, 1)
        row += band
      }
      for (let tree = 0; tree < this.width / 5; tree++) {
        context.fillStyle = '#1f4d2c'
        context.fillRect(Math.floor(random.next() * this.width), Math.floor(random.next() * height), 2, 1)
      }
    })
    return { image, top: this.groundY - 22, depth: 0.6, fill: '#3a7a3a' }
  }

  private near(random: Seeded): GroundLayer {
    const tower = 66
    const height = tower + (this.height - this.groundY) + 10
    const pad = this.padX
    const image = new SpriteImage(this.width, height, (context) => {
      const ground = tower
      for (let y = ground; y < height; y++) {
        for (let x = 0; x < this.width; x += 1) {
          const dither = Bayer[(y % 4) * 4 + (x % 4)]
          context.fillStyle = y === ground ? '#6aa84f' : dither < 3 ? '#6aa84f' : dither > 13 ? '#1f4d2c' : '#3a7a3a'
          context.fillRect(x, y, 1, 1)
        }
      }
      for (let at = 0; at < this.width / 3; at++) {
        context.fillStyle = '#1f4d2c'
        context.fillRect(Math.floor(random.next() * this.width), ground + 2 + Math.floor(random.next() * (height - ground - 2)), 3, 1)
      }
      for (let bush = 0; bush < this.width / 9; bush++) {
        const bx = Math.floor(random.next() * this.width)
        const by = ground + 4 + Math.floor(random.next() * (height - ground - 6))
        if (Math.abs(bx - pad) < 30 && by < ground + 8) continue
        context.fillStyle = '#1f4d2c'
        context.fillRect(bx - 1, by, 4, 2)
        context.fillStyle = '#6aa84f'
        context.fillRect(bx, by - 1, 2, 1)
      }
      context.fillStyle = '#7c8797'
      context.fillRect(pad + 24, ground + 2, this.width, 2)
      context.fillStyle = '#b8c1cc'
      context.fillRect(pad + 24, ground + 2, this.width, 1)
      context.fillStyle = '#4a5362'
      context.fillRect(pad - 24, ground - 1, 49, 5)
      context.fillStyle = '#b8c1cc'
      context.fillRect(pad - 24, ground - 1, 49, 1)
      context.fillStyle = '#7c8797'
      context.fillRect(pad - 23, ground, 47, 2)
      context.fillStyle = '#161a22'
      context.fillRect(pad - 6, ground, 13, 3)
      const left = pad - 21
      for (let y = 4; y <= ground; y++) {
        context.fillStyle = '#b8c1cc'
        context.fillRect(left, y, 1, 1)
        context.fillStyle = '#4a5362'
        context.fillRect(left + 6, y, 1, 1)
        const step = (y - 4) % 8
        context.fillStyle = '#7c8797'
        context.fillRect(left + 1 + Math.min(4, step), y, 1, 1)
        context.fillRect(left + 5 - Math.min(4, step), y, 1, 1)
      }
      context.fillStyle = '#4a5362'
      for (let y = 4; y < ground; y += 8) context.fillRect(left, y, 7, 1)
      context.fillRect(left + 6, 12, 10, 1)
      context.fillRect(left + 6, 30, 10, 1)
      context.fillStyle = '#b8c1cc'
      context.fillRect(left, 3, 7, 1)
      context.fillStyle = '#c8323f'
      context.fillRect(left + 3, 1, 1, 2)
    })
    return { image, top: this.groundY - tower, depth: 1 }
  }

  private static cloud(width: number, height: number, random: Seeded): SpriteImage {
    const blobs = Array.from({ length: 4 }, (_, at) => ({ x: Math.round((width * (at + 0.5)) / 4), y: height - 2 - Math.floor(random.next() * (height - 2)), r: 2 + Math.floor(random.next() * (height - 1)) }))
    return new SpriteImage(width + 4, height + 4, (context) => {
      for (let y = 0; y < height + 4; y++) {
        for (let x = 0; x < width + 4; x++) {
          const inside = blobs.some((blob) => Math.hypot(x - 2 - blob.x, (y - 2 - blob.y) * 1.4) <= blob.r) && y <= height + 1
          if (!inside) continue
          const shade = y > height - 1 ? (Bayer[(y % 4) * 4 + (x % 4)] < 8 ? '#c5d2e0' : '#7c8797') : y > height - 3 ? '#c5d2e0' : y < 3 ? '#ffffff' : '#eef3f7'
          context.fillStyle = shade
          context.fillRect(x, y, 1, 1)
        }
      }
    })
  }

  private static deckImage(width: number, random: Seeded): SpriteImage {
    const rows = 12
    const heights = Array.from({ length: width }, (_, x) => Math.round(rows / 2 + (rows / 2 - 1) * Math.sin(x / 7 + random.next() * 0.6) * Math.sin(x / 19)))
    return new SpriteImage(width, rows, (context) => {
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < rows; y++) {
          if (rows - y > heights[x] + 1) continue
          const edge = rows - y > heights[x] - 1
          context.fillStyle = edge ? (Bayer[(y % 4) * 4 + (x % 4)] < 8 ? '#c5d2e0' : '#ffffff') : '#eef3f7'
          context.fillRect(x, y, 1, 1)
        }
      }
    })
  }
}
