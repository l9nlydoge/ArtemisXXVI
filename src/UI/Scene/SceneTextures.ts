import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { Palette } from './Palette'

export class SceneTextures {
  private static cells?: CanvasTexture

  static solarCells(): CanvasTexture {
    if (SceneTextures.cells) return SceneTextures.cells
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = Palette.Cell
    context.fillRect(0, 0, 128, 128)
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    context.lineWidth = 3
    context.strokeRect(0, 0, 128, 128)
    context.lineWidth = 1
    for (let line = 32; line < 128; line += 32) {
      context.beginPath()
      context.moveTo(line, 0)
      context.lineTo(line, 128)
      context.moveTo(0, line)
      context.lineTo(128, line)
      context.stroke()
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.colorSpace = SRGBColorSpace
    SceneTextures.cells = texture
    return texture
  }
}
