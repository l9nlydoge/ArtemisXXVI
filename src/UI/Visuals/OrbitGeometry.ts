import type { Orbit } from '../../Engine/Catalog/Orbit'
import { OrbitClass } from '../../Engine/Catalog/OrbitClass'

export class OrbitGeometry {
  private static readonly earthRadiusKm = 6371

  constructor(private readonly orbit: Orbit) {}

  get isSchematic(): boolean {
    return this.orbit.orbitClass === OrbitClass.L2
  }

  get ringRadius(): number {
    return (OrbitGeometry.earthRadiusKm + this.orbit.spec.altitudeKm) / OrbitGeometry.earthRadiusKm
  }

  get shadowHalfAngle(): number {
    return this.orbit.spec.eclipseMin === 0 ? 0 : Math.asin(1 / this.ringRadius)
  }

  get viewRadius(): number {
    return this.ringRadius * 1.22
  }

  point(angle: number, radius = this.ringRadius): { x: number; y: number } {
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  }

  arc(from: number, to: number): string {
    const start = this.point(from)
    const end = this.point(to)
    const large = Math.abs(to - from) > Math.PI ? 1 : 0
    return `M ${start.x} ${start.y} A ${this.ringRadius} ${this.ringRadius} 0 ${large} 1 ${end.x} ${end.y}`
  }

  satelliteAngles(copies: number): number[] {
    return Array.from({ length: copies }, (_, index) => Math.PI * 1.15 + (index * Math.PI * 2) / copies)
  }

  stationAngles(stations: number): number[] {
    return Array.from({ length: Math.min(stations, 24) }, (_, index) => Math.PI * 0.6 + (index * Math.PI * 2) / Math.max(stations, 3))
  }
}
