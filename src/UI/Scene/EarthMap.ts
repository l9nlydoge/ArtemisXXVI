import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import landUrl from 'world-atlas/land-50m.json?url'
import { Palette } from './Palette'

export class EarthMap {
  readonly texture: CanvasTexture
  private readonly canvas = document.createElement('canvas')
  private readonly context: CanvasRenderingContext2D

  constructor(width = 4096) {
    this.canvas.width = width
    this.canvas.height = width / 2
    this.context = this.canvas.getContext('2d')!
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.anisotropy = 8
    this.draw()
  }

  async loadLand(): Promise<void> {
    const response = await fetch(landUrl)
    const topology = (await response.json()) as Topology
    this.draw(feature(topology, topology.objects.land) as unknown as FeatureCollection)
  }

  dispose(): void {
    this.texture.dispose()
  }

  private draw(land?: FeatureCollection): void {
    const { width, height } = this.canvas
    const context = this.context
    const projection = geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2])
    const path = geoPath(projection, context)

    context.fillStyle = Palette.Ocean
    context.fillRect(0, 0, width, height)

    if (land) {
      context.beginPath()
      path(land)
      context.fillStyle = Palette.Land
      context.fill()
      context.strokeStyle = 'rgba(18, 22, 27, 0.45)'
      context.lineWidth = width / 2048
      context.stroke()
    }

    context.beginPath()
    path(geoGraticule10())
    context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    context.lineWidth = width / 2048
    context.stroke()
    this.texture.needsUpdate = true
  }
}
