import { Vector3, type Camera } from 'three'
import type { DockControls } from './DockControls'
import { OrbitPath } from './Earth/OrbitPath'
import { Shot } from './Shot'

export interface CraftFrame {
  position: Vector3
  radial: Vector3
  tangent: Vector3
  normal: Vector3
}

class Pose {
  readonly position = new Vector3()
  readonly look = new Vector3()
  readonly up = new Vector3(0, 1, 0)

  copy(other: Pose): this {
    this.position.copy(other.position)
    this.look.copy(other.look)
    this.up.copy(other.up)
    return this
  }

  blend(from: Pose, to: Pose, amount: number): this {
    this.position.lerpVectors(from.position, to.position, amount)
    this.look.lerpVectors(from.look, to.look, amount)
    this.up.lerpVectors(from.up, to.up, amount).normalize()
    return this
  }
}

export class CameraDirector {
  private static readonly wideDirection = new Vector3(0.15, 0.4, 1).normalize()
  private static readonly startAltitude = 1.17
  private static readonly startLapSeconds = 340

  private shot?: Shot
  private progress = 1
  private startAngle = -0.5
  private readonly from = new Pose()
  private readonly target = new Pose()
  private readonly current = new Pose()
  private readonly forward = new Vector3()
  private readonly right = new Vector3()
  private readonly facing = new Vector3()
  private readonly screenUp = new Vector3()
  private readonly offset = new Vector3()
  private readonly sideways = new Vector3().crossVectors(OrbitPath.sunDirection, new Vector3(0, 1, 0)).normalize()
  private readonly startRadial = new Vector3()
  private readonly startTangent = new Vector3()
  private readonly startNormal = new Vector3()

  constructor(private readonly transitionSeconds = 2.4) {}

  update(camera: Camera, shot: Shot, craft: CraftFrame, path: OrbitPath, dock: DockControls, aspect: number, delta: number): void {
    this.startAngle += (delta * Math.PI * 2) / CameraDirector.startLapSeconds
    this.compose(shot, craft, path, dock, aspect)
    if (this.shot === undefined) {
      this.current.copy(this.target)
    } else if (shot !== this.shot) {
      this.from.copy(this.current)
      this.progress = 0
    }
    this.shot = shot
    this.progress = Math.min(1, this.progress + Math.min(delta, 0.25) / this.transitionSeconds)
    const eased = this.progress * this.progress * (3 - 2 * this.progress)
    if (this.progress < 1) this.current.blend(this.from, this.target, eased)
    else this.current.copy(this.target)
    camera.position.copy(this.current.position)
    camera.up.copy(this.current.up)
    camera.lookAt(this.current.look)
  }

  private compose(shot: Shot, craft: CraftFrame, path: OrbitPath, dock: DockControls, aspect: number): void {
    const size = path.craftSize
    const portrait = aspect < 0.9
    const { position, look, up } = this.target
    switch (shot) {
      case Shot.Start: {
        const angle = this.startAngle
        this.startRadial.copy(OrbitPath.sunDirection).multiplyScalar(Math.cos(angle)).addScaledVector(this.sideways, Math.sin(angle))
        this.startTangent.copy(OrbitPath.sunDirection).multiplyScalar(-Math.sin(angle)).addScaledVector(this.sideways, Math.cos(angle))
        this.startNormal.crossVectors(this.startRadial, this.startTangent)
        position.copy(this.startRadial).multiplyScalar(CameraDirector.startAltitude)
        look.copy(position).add(this.startTangent).addScaledVector(this.startRadial, portrait ? -0.62 : -0.5)
        up.copy(this.startRadial).addScaledVector(this.startNormal, 0.2).normalize()
        return
      }
      case Shot.Dock: {
        const distance = size * (portrait ? 3 : 1.6)
        this.offset
          .copy(craft.normal).multiplyScalar(Math.sin(dock.yaw) * Math.cos(dock.pitch))
          .addScaledVector(craft.radial, Math.sin(dock.pitch))
          .addScaledVector(craft.tangent, -Math.cos(dock.yaw) * Math.cos(dock.pitch))
        position.copy(craft.position).addScaledVector(this.offset, distance)
        this.forward.copy(this.offset).negate()
        this.facing.copy(craft.tangent).multiplyScalar(Math.cos(dock.yaw)).addScaledVector(craft.normal, -Math.sin(dock.yaw))
        up.copy(craft.radial).multiplyScalar(Math.cos(dock.pitch)).addScaledVector(this.facing, Math.sin(dock.pitch)).normalize()
        this.right.crossVectors(this.forward, up).normalize()
        this.screenUp.crossVectors(this.right, this.forward).normalize()
        look.copy(craft.position)
        if (portrait) look.addScaledVector(this.screenUp, -size * 0.55)
        else look.addScaledVector(this.right, size * 0.52).addScaledVector(this.screenUp, -size * 0.08)
        return
      }
      case Shot.Chase:
        position.copy(craft.position).addScaledVector(craft.radial, size * 0.4).addScaledVector(craft.tangent, -size * 1.25).addScaledVector(craft.normal, size * 0.9)
        look.copy(craft.position).addScaledVector(craft.tangent, size * 1.1).addScaledVector(craft.radial, -size * 0.5).addScaledVector(craft.normal, size * (portrait ? 0.9 : 0.52))
        up.copy(craft.radial)
        return
      case Shot.Wide:
        position.copy(CameraDirector.wideDirection).multiplyScalar(path.viewDistance * (portrait ? 1.7 : 1))
        look.set(0, 0, 0)
        if (path.isHalo) look.copy(craft.position).multiplyScalar(0.5)
        up.set(0, 1, 0)
        return
      case Shot.Report:
        position.copy(CameraDirector.wideDirection).multiplyScalar(path.viewDistance * 1.2)
        this.right.crossVectors(CameraDirector.wideDirection, up.set(0, 1, 0)).normalize()
        look.set(0, 0, 0)
        if (portrait) look.y = -path.radius * 0.9
        else look.addScaledVector(this.right, path.radius * 1.9)
        return
    }
  }
}
