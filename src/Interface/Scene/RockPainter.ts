import { Seeded, SpriteImage } from './SpriteImage'

const Bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const Grey = { light: '#b8c1cc', mid: '#7c8797', dark: '#4a5362', shade: '#2b313c', line: '#161a22' }
const Brown = { light: '#c9a45c', mid: '#8a6a3a', dark: '#6b4410', shade: '#2b313c', line: '#161a22' }
export const RockFrames = 8

interface Crater {
  angle: number
  distance: number
  size: number
}

export class RockPainter {
  static frames(radius: number, seed: number): SpriteImage[] {
    const random = new Seeded(seed)
    const tones = random.next() < 0.4 ? Brown : Grey
    const waves = [3, 5, 2].map((count) => ({ count, phase: random.next() * Math.PI * 2, size: count === 2 ? 0.16 : count === 3 ? 0.14 : 0.07 }))
    const stretch = 1 + random.next() * 0.35
    const craters: Crater[] = Array.from({ length: radius < 5 ? 1 : radius < 8 ? 3 : 5 }, () => ({ angle: random.next() * Math.PI * 2, distance: 0.2 + random.next() * 0.5, size: radius < 7 ? 1 : 1 + Math.round(random.next()) }))
    const size = Math.ceil(radius * stretch * 1.3) * 2 + 5
    const centre = Math.floor(size / 2)
    return Array.from({ length: RockFrames }, (_, frame) => {
      const spin = (frame / RockFrames) * Math.PI * 2
      const shape = (dx: number, dy: number) => {
        const cos = Math.cos(-spin)
        const sin = Math.sin(-spin)
        const lx = (dx * cos - dy * sin) / stretch
        const ly = dx * sin + dy * cos
        const angle = Math.atan2(ly, lx)
        const edge = radius * (1 + waves.reduce((sum, wave) => sum + wave.size * Math.sin(wave.count * angle + wave.phase), 0))
        return { inside: Math.hypot(lx, ly) <= edge, lx, ly, edge }
      }
      const grid: (string | null)[] = new Array(size * size).fill(null)
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centre + 0.5
          const dy = y - centre + 0.5
          const here = shape(dx, dy)
          if (!here.inside) continue
          const reach = Math.max(1, radius * stretch)
          const nx = dx / reach
          const ny = dy / reach
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
          let light = -0.62 * nx - 0.62 * ny + 0.48 * nz
          for (const crater of craters) {
            const cx = Math.cos(crater.angle + spin) * crater.distance * radius * stretch
            const cy = Math.sin(crater.angle + spin) * crater.distance * radius
            const away = Math.hypot(dx - cx, dy - cy)
            if (away <= crater.size) light = dx - cx + (dy - cy) < 0 ? -0.3 : light
            else if (away <= crater.size + 1 && dx - cx + (dy - cy) > 0) light = Math.max(light, 0.7)
          }
          const threshold = (Bayer[(y % 4) * 4 + (x % 4)] + 0.5) / 16
          const band = light * 3 + 1.2
          const step = Math.floor(band) + (band - Math.floor(band) > threshold ? 1 : 0)
          grid[y * size + x] = step >= 4 ? tones.light : step === 3 ? tones.mid : step === 2 ? tones.dark : tones.shade
        }
      }
      return new SpriteImage(size, size, (context) => {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const colour = grid[y * size + x]
            const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => grid[(y + oy) * size + x + ox])
            if (!colour && !near) continue
            context.fillStyle = colour ?? tones.line
            context.fillRect(x, y, 1, 1)
          }
        }
      })
    })
  }

  static radiusFor(diameterM: number | undefined): number {
    if (diameterM === undefined) return 6
    if (diameterM < 30) return 4
    if (diameterM < 140) return 6
    if (diameterM < 1000) return 8
    return 11
  }
}
