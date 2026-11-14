import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

export class SceneTextures {
  private static cells?: CanvasTexture
  private static foil?: CanvasTexture
  private static tiles?: CanvasTexture

  static solarCells(): CanvasTexture {
    if (SceneTextures.cells) return SceneTextures.cells
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    context.fillStyle = '#c9ced6'
    context.fillRect(0, 0, size, size)
    const cell = size / 4
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        const shade = 10 + ((row * 7 + column * 13) % 5) * 3
        context.fillStyle = `rgb(${shade - 4}, ${shade + 2}, ${shade + 34})`
        context.fillRect(column * cell + 1.5, row * cell + 1.5, cell - 3, cell - 3)
        context.fillStyle = 'rgba(190, 200, 215, 0.55)'
        context.fillRect(column * cell + cell / 3, row * cell + 1.5, 1, cell - 3)
        context.fillRect(column * cell + (cell * 2) / 3, row * cell + 1.5, 1, cell - 3)
      }
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    SceneTextures.cells = texture
    return texture
  }

  static mirrorTiles(): CanvasTexture {
    if (SceneTextures.tiles) return SceneTextures.tiles
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    context.fillStyle = '#3a3f47'
    context.fillRect(0, 0, size, size)
    const tile = size / 8
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const tone = 205 + ((row * 5 + column * 11) % 7) * 6
        context.fillStyle = `rgb(${tone}, ${tone + 4}, ${tone + 10})`
        context.fillRect(column * tile + 1, row * tile + 1, tile - 2, tile - 2)
      }
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    SceneTextures.tiles = texture
    return texture
  }

  static foilNormal(): CanvasTexture {
    if (SceneTextures.foil) return SceneTextures.foil
    const size = 256
    const height = SceneTextures.crinkle(size)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    const image = context.createImageData(size, size)
    const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2
        const dy = (at(x, y + 1) - at(x, y - 1)) * 3.2
        const length = Math.hypot(dx, dy, 1)
        const index = (y * size + x) * 4
        image.data[index] = (-dx / length) * 127 + 128
        image.data[index + 1] = (-dy / length) * 127 + 128
        image.data[index + 2] = (1 / length) * 127 + 128
        image.data[index + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    SceneTextures.foil = texture
    return texture
  }

  private static crinkle(size: number): Float32Array {
    let seed = 20261114
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    const sites = Array.from({ length: 90 }, () => ({ x: random() * size, y: random() * size, lift: random() }))
    const height = new Float32Array(size * size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let nearest = Number.POSITIVE_INFINITY
        let second = Number.POSITIVE_INFINITY
        let lift = 0
        for (const site of sites) {
          const dx = Math.min(Math.abs(x - site.x), size - Math.abs(x - site.x))
          const dy = Math.min(Math.abs(y - site.y), size - Math.abs(y - site.y))
          const distance = dx * dx + dy * dy
          if (distance < nearest) {
            second = nearest
            nearest = distance
            lift = site.lift
          } else if (distance < second) {
            second = distance
          }
        }
        const ridge = Math.sqrt(second) - Math.sqrt(nearest)
        height[y * size + x] = lift * 0.6 + Math.min(1, ridge / 9) * 0.8
      }
    }
    return height
  }
}
