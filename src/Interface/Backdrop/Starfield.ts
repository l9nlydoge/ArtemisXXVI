import { SeededRandom } from '../../Engine/Core/SeededRandom'

interface Star {
  x: number
  y: number
  level: number
  large: boolean
  phase: number
}

const Levels = ['#1b2a4e', '#4a5362', '#7c8797', '#b8c1cc', '#ffffff']
const TileWidth = 480
const TileHeight = 320
const StarCount = 420
const TwinkleShare = 0.3

export class Starfield {
  private readonly stars: readonly Star[]

  constructor(seed = 26) {
    const random = new SeededRandom(seed)
    this.stars = Array.from({ length: StarCount }, () => {
      const roll = random.next()
      const large = roll > 0.975
      const level = large ? 4 : roll > 0.88 ? 3 : roll > 0.6 ? 2 : 1
      const phase = random.next() < TwinkleShare ? 1 + Math.floor(random.next() * 3) : 0
      return { x: Math.floor(random.next() * TileWidth), y: Math.floor(random.next() * TileHeight), level, large, phase }
    })
  }

  paint(context: CanvasRenderingContext2D, width: number, height: number, driftX: number, driftY: number, beat: number, streak = 0) {
    for (let tileY = Math.floor(driftY / TileHeight) * TileHeight - driftY; tileY < height; tileY += TileHeight) {
      for (let tileX = Math.floor(driftX / TileWidth) * TileWidth - driftX; tileX < width; tileX += TileWidth) {
        for (const star of this.stars) {
          const x = tileX + star.x
          const y = tileY + star.y
          if (x < -1 || y < -1 || x > width || y > height) continue
          const dimmed = star.phase > 0 && (star.phase + beat) % 3 === 0
          const level = Math.max(0, star.level - (dimmed ? 1 : 0))
          if (streak > 0 && star.level >= 2) {
            const tail = Math.round(streak * (star.level / 4))
            context.fillStyle = Levels[Math.max(0, level - 2)]
            context.fillRect(x + 1, y, tail, 1)
            context.fillStyle = Levels[Math.max(0, level - 1)]
            context.fillRect(x + 1, y, Math.ceil(tail / 3), 1)
          }
          context.fillStyle = Levels[level]
          context.fillRect(x, y, 1, 1)
          if (star.large && !dimmed && streak === 0) {
            context.fillStyle = Levels[1]
            context.fillRect(x - 1, y, 1, 1)
            context.fillRect(x + 1, y, 1, 1)
            context.fillRect(x, y - 1, 1, 1)
            context.fillRect(x, y + 1, 1, 1)
          }
        }
      }
    }
  }
}
