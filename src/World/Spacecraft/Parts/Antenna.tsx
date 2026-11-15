import { AntennaShape, type Box } from '../SpacecraftBlueprint'
import { Reflector, Rod } from './Hardware'
import { Aluminium, Glass, Paint } from './Materials'

export function Antenna({ shape, box, detailed }: { shape: AntennaShape; box: Box; detailed: boolean }) {
  const size = box.w
  return (
    <group position={[box.x + box.w / 2, -(box.y + box.h), 0]}>
      {shape === AntennaShape.Whip && (
        <>
          {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
            <Rod key={`${x}${z}`} from={[x * size * 0.15, 0, z * size * 0.15]} to={[x * size * 0.6, size * 0.9, z * size * 0.6]} radius={size * 0.01} material={<Aluminium />} />
          )))}
          <mesh position={[0, size * 0.03, 0]}>
            <boxGeometry args={[size * 0.4, size * 0.06, size * 0.4]} />
            <Aluminium dark />
          </mesh>
        </>
      )}
      {shape === AntennaShape.Patch && (
        <>
          <mesh position={[0, size * 0.04, 0]}>
            <boxGeometry args={[size, size * 0.08, size]} />
            <Aluminium />
          </mesh>
          <mesh position={[0, size * 0.09, 0]}>
            <boxGeometry args={[size * 0.82, size * 0.02, size * 0.82]} />
            <Paint />
          </mesh>
        </>
      )}
      {shape === AntennaShape.Dish && (
        <>
          <mesh position={[0, size * 0.05, 0]}>
            <cylinderGeometry args={[size * 0.1, size * 0.13, size * 0.1, 24]} />
            <Aluminium />
          </mesh>
          <Rod from={[0, size * 0.1, 0]} to={[size * 0.1, size * 0.34, 0]} radius={size * 0.04} material={<Aluminium />} />
          <mesh position={[size * 0.1, size * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[size * 0.07, size * 0.07, size * 0.2, 20]} />
            <Aluminium dark />
          </mesh>
          <group position={[size * 0.1, size * 0.44, 0]} rotation={[0.3, 0, -0.35]}>
            <Reflector radius={size / 2} depth={size * 0.15} detailed={detailed} />
          </group>
        </>
      )}
      {shape === AntennaShape.Laser && (
        <>
          <mesh position={[0, size * 0.1, 0]}>
            <boxGeometry args={[size * 0.7, size * 0.2, size * 0.7]} />
            <Aluminium dark />
          </mesh>
          <group position={[0, size * 0.42, 0]} rotation={[0.5, 0, -0.3]}>
            <mesh>
              <cylinderGeometry args={[size * 0.24, size * 0.24, size * 0.5, 36]} />
              <Aluminium />
            </mesh>
            <mesh position={[0, size * 0.251, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[size * 0.2, 36]} />
              <Glass />
            </mesh>
          </group>
        </>
      )}
    </group>
  )
}
