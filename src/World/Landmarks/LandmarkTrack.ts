import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Landmark } from '../../Engine/Catalog/Landmark'
import { OrbitClass } from '../../Engine/Catalog/OrbitClass'
import type { CraftFrame } from '../CameraDirector'
import { OrbitPath } from '../Earth/OrbitPath'

export class LandmarkTrack {
  private static readonly sizes: Record<string, number> = { Station: 0.11, Hubble: 0.045, Landsat: 0.05, Goes: 0.6, Webb: 0.62 }
  private static readonly phases: Record<string, number> = { Station: 2.1, Hubble: 4.4, Landsat: 3.3, Goes: 1.2, Webb: Math.PI }

  readonly path: OrbitPath
  readonly size: number
  readonly frame: CraftFrame = { position: new Vector3(), radial: new Vector3(), tangent: new Vector3(), normal: new Vector3() }
  readonly quaternion = new Quaternion()
  private readonly ahead = new Vector3()
  private readonly basis = new Matrix4()
  private readonly sunlitAngle: number
  private angle: number

  constructor(readonly landmark: Landmark) {
    const { altitudeKm, inclinationDeg, periodMin, orbitClass } = landmark.spec
    this.path = new OrbitPath({ altitudeKm, inclinationDeg, periodMin, halo: orbitClass === OrbitClass.L2 })
    this.size = LandmarkTrack.sizes[landmark.id] ?? 0.05
    this.angle = LandmarkTrack.phases[landmark.id] ?? 0
    this.sunlitAngle = this.path.sunlitAngle - (this.path.radius > 3 && !this.path.isHalo ? 0.7 : 0)
  }

  advance(seconds: number, held: boolean): void {
    if (held) this.angle = this.sunlitAngle
    else this.angle += ((Math.PI * 2) / this.path.visualPeriodSeconds) * seconds
    const { position, radial, tangent, normal } = this.frame
    this.path.position(this.angle, position)
    this.path.position(this.angle + 0.01, this.ahead)
    tangent.subVectors(this.ahead, position).normalize()
    radial.copy(this.path.isHalo ? OrbitPath.sunDirection : position).normalize()
    normal.crossVectors(radial, tangent).normalize()
    tangent.crossVectors(normal, radial).normalize()
    this.quaternion.setFromRotationMatrix(this.basis.makeBasis(normal, radial, tangent))
  }

  isHiddenFrom(eye: Vector3): boolean {
    const toTarget = this.ahead.subVectors(this.frame.position, eye)
    const distance = toTarget.length()
    toTarget.divideScalar(distance)
    const closest = -eye.dot(toTarget)
    if (closest < 0 || closest > distance) return false
    return eye.lengthSq() - closest * closest < 1
  }
}
