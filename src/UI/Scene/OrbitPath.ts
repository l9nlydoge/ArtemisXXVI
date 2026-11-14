import { Vector3 } from 'three'
import type { Orbit } from '../../Engine/Catalog/Orbit'
import { OrbitClass } from '../../Engine/Catalog/OrbitClass'

export class OrbitPath {
  static readonly sunDirection = new Vector3(-1, 0.22, 0.5).normalize()
  private static readonly earthRadiusKm = 6371
  private static readonly haloDistance = 5.5
  private static readonly haloRadius = 0.75

  readonly isHalo: boolean
  readonly radius: number
  readonly inclination: number
  readonly orbitsPerDay: number
  private readonly haloCentre = OrbitPath.sunDirection.clone().multiplyScalar(-OrbitPath.haloDistance)
  private readonly haloAxisA = new Vector3()
  private readonly haloAxisB = new Vector3()

  constructor(orbit: Orbit) {
    this.isHalo = orbit.orbitClass === OrbitClass.L2
    this.radius = this.isHalo ? OrbitPath.haloDistance : (OrbitPath.earthRadiusKm + orbit.spec.altitudeKm) / OrbitPath.earthRadiusKm
    this.inclination = (orbit.spec.inclinationDeg * Math.PI) / 180
    this.orbitsPerDay = this.isHalo ? Number.POSITIVE_INFINITY : 1440 / orbit.spec.periodMin
    this.haloAxisA.crossVectors(OrbitPath.sunDirection, new Vector3(0, 1, 0)).normalize()
    this.haloAxisB.crossVectors(OrbitPath.sunDirection, this.haloAxisA).normalize()
  }

  get craftSize(): number {
    if (this.isHalo) return 0.5
    return this.radius > 3 ? 0.55 : 0.05
  }

  get visualPeriodSeconds(): number {
    if (this.isHalo) return 36
    return this.radius > 3 ? 44 : 16
  }

  get prefersChase(): boolean {
    return !this.isHalo && this.radius < 3
  }

  get viewDistance(): number {
    return this.radius * 2.5 + 1.4
  }

  earthRotation(u: number): number {
    return Number.isFinite(this.orbitsPerDay) ? u / this.orbitsPerDay : u * 0.05
  }

  position(u: number, target = new Vector3()): Vector3 {
    if (this.isHalo) {
      return target
        .copy(this.haloCentre)
        .addScaledVector(this.haloAxisA, Math.cos(u) * OrbitPath.haloRadius)
        .addScaledVector(this.haloAxisB, Math.sin(u) * OrbitPath.haloRadius * 1.5)
    }
    const latitude = Math.asin(Math.sin(this.inclination) * Math.sin(u))
    const longitude = Math.atan2(Math.cos(this.inclination) * Math.sin(u), Math.cos(u))
    return target.set(
      this.radius * Math.cos(latitude) * Math.cos(longitude),
      this.radius * Math.sin(latitude),
      -this.radius * Math.cos(latitude) * Math.sin(longitude),
    )
  }

  ring(segments = 256): Vector3[] {
    return Array.from({ length: segments + 1 }, (_, index) => this.position((index / segments) * Math.PI * 2))
  }

  groundPoint(u: number): { longitude: number; latitude: number } {
    const latitude = Math.asin(Math.sin(this.inclination) * Math.sin(u))
    const inertial = Math.atan2(Math.cos(this.inclination) * Math.sin(u), Math.cos(u))
    const longitude = inertial - this.earthRotation(u)
    return { longitude: (longitude * 180) / Math.PI, latitude: (latitude * 180) / Math.PI }
  }
}
