import { CylinderGeometry, Vector3, type BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CrinkleField } from './CrinkleField'

export class BlanketGeometry {
  private static readonly field = new CrinkleField()

  static box(width: number, height: number, depth: number, creases = 5): BufferGeometry {
    const smallest = Math.min(width, height, depth)
    const geometry = new RoundedBoxGeometry(width, height, depth, 16, smallest * 0.05)
    return BlanketGeometry.crinkle(geometry, smallest * 0.03, creases / smallest, () => true)
  }

  static cylinder(radius: number, height: number, creases = 6): BufferGeometry {
    const geometry = new CylinderGeometry(radius, radius, height, 72, 18, true)
    return BlanketGeometry.crinkle(geometry, radius * 0.05, creases / radius, () => true)
  }

  private static crinkle(geometry: BufferGeometry, amplitude: number, frequency: number, affects: (normal: Vector3) => boolean): BufferGeometry {
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    const field = BlanketGeometry.field
    const point = new Vector3()
    const normal = new Vector3()
    const gradient = new Vector3()
    const step = 0.08
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index)
      normal.fromBufferAttribute(normals, index)
      if (!affects(normal)) continue
      const x = point.x * frequency
      const y = point.y * frequency
      const z = point.z * frequency
      const lift = field.sample(x, y, z)
      gradient.set(field.sample(x + step, y, z) - lift, field.sample(x, y + step, z) - lift, field.sample(x, y, z + step) - lift).multiplyScalar((amplitude * frequency) / step)
      gradient.addScaledVector(normal, -gradient.dot(normal))
      point.addScaledVector(normal, (lift - 0.5) * amplitude)
      normal.sub(gradient).normalize()
      positions.setXYZ(index, point.x, point.y, point.z)
      normals.setXYZ(index, normal.x, normal.y, normal.z)
    }
    positions.needsUpdate = true
    normals.needsUpdate = true
    geometry.computeBoundingSphere()
    return geometry
  }
}
