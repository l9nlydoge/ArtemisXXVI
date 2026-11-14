import { CanvasTexture, SRGBColorSpace } from 'three'
import type { OrbitPath } from './OrbitPath'
import { Palette } from './Palette'

export class CoveragePainter {
  private static readonly orbitsToFill = 110
  private static readonly stepsPerOrbit = 90
  private static readonly swathDegrees = 3.4
  private static readonly uploadEvery = 24

  readonly texture: CanvasTexture
  private readonly canvas = document.createElement('canvas')
  private readonly context: CanvasRenderingContext2D
  private cursor = 0
  private pending = 0

  constructor(
    private readonly path: OrbitPath,
    private readonly copies: number,
    width = 2048,
  ) {
    this.canvas.width = width
    this.canvas.height = width / 2
    this.context = this.canvas.getContext('2d')!
    this.context.strokeStyle = Palette.Coverage
    this.context.fillStyle = Palette.Coverage
    this.context.lineCap = 'round'
    this.context.lineWidth = (width / 360) * CoveragePainter.swathDegrees
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
  }

  get paintsTracks(): boolean {
    return !this.path.isHalo
  }

  paintTo(fraction: number): void {
    if (!this.paintsTracks) return
    if (this.path.orbitsPerDay <= 1.01) {
      this.paintFootprints(fraction)
      return
    }
    const total = CoveragePainter.orbitsToFill * CoveragePainter.stepsPerOrbit
    const target = Math.floor(Math.min(1, Math.max(0, fraction)) * total)
    if (target <= this.cursor) return
    for (let step = this.cursor; step < target; step++) this.paintStep(step)
    this.pending += target - this.cursor
    this.cursor = target
    if (this.pending >= CoveragePainter.uploadEvery || target === total) {
      this.pending = 0
      this.texture.needsUpdate = true
    }
  }

  dispose(): void {
    this.texture.dispose()
  }

  private paintStep(step: number): void {
    const copy = step % this.copies
    const index = Math.floor(step / this.copies)
    const phase = (copy / this.copies) * Math.PI * 2
    const from = this.project(this.path.groundPoint(phase + this.angle(index)), copy)
    const to = this.project(this.path.groundPoint(phase + this.angle(index + 1)), copy)
    if (Math.abs(from.x - to.x) > this.canvas.width / 2) return
    this.context.beginPath()
    this.context.moveTo(from.x, from.y)
    this.context.lineTo(to.x, to.y)
    this.context.stroke()
  }

  private paintFootprints(fraction: number): void {
    const { width, height } = this.canvas
    const radius = (width / 360) * 58 * Math.sqrt(Math.min(1, Math.max(0, fraction)))
    this.context.clearRect(0, 0, width, height)
    for (let copy = 0; copy < this.copies; copy++) {
      const x = ((copy / this.copies) * width + width / 2) % width
      for (const offset of [-width, 0, width]) {
        this.context.beginPath()
        this.context.arc(x + offset, height / 2, radius, 0, Math.PI * 2)
        this.context.fill()
      }
    }
    this.texture.needsUpdate = true
  }

  private angle(step: number): number {
    return (step / CoveragePainter.stepsPerOrbit) * Math.PI * 2
  }

  private project(point: { longitude: number; latitude: number }, copy: number): { x: number; y: number } {
    const { width, height } = this.canvas
    const shifted = point.longitude + (copy * 360) / this.copies
    const longitude = ((((shifted + 180) % 360) + 360) % 360) - 180
    return { x: ((longitude + 180) / 360) * width, y: ((90 - point.latitude) / 180) * height }
  }
}
