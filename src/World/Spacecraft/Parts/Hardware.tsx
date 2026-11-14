import { useMemo, type ReactNode } from 'react'
import { CatmullRomCurve3, Quaternion, Vector2, Vector3 } from 'three'
import { Aluminium, Carbon } from './Materials'

export type Point = [number, number, number]

const Up = new Vector3(0, 1, 0)

export function Rod({ from, to, radius, material }: { from: Point; to: Point; radius: number; material?: ReactNode }) {
  const key = [...from, ...to].join(',')
  const placement = useMemo(() => {
    const start = new Vector3(...from)
    const direction = new Vector3(...to).sub(start)
    const length = direction.length()
    return { length, middle: start.addScaledVector(direction, 0.5), quaternion: new Quaternion().setFromUnitVectors(Up, direction.normalize()) }
  }, [key])
  return (
    <mesh position={placement.middle} quaternion={placement.quaternion}>
      <cylinderGeometry args={[radius, radius, placement.length, 12]} />
      {material ?? <Carbon />}
    </mesh>
  )
}

export function Cable({ points, radius }: { points: Point[]; radius: number }) {
  const key = points.flat().join(',')
  const curve = useMemo(() => new CatmullRomCurve3(points.map((point) => new Vector3(...point))), [key])
  return (
    <mesh>
      <tubeGeometry args={[curve, 28, radius, 6, false]} />
      <meshStandardMaterial color="#1b1c20" roughness={0.6} metalness={0.2} />
    </mesh>
  )
}

export function Nozzle({ size }: { size: number }) {
  const profile = useMemo(() => [0.32, 0.26, 0.3, 0.46, 0.66, 0.84, 1].map((radius, index) => new Vector2(radius * size * 0.5, (index / 6) * size)), [size])
  return (
    <mesh>
      <latheGeometry args={[profile, 20]} />
      <meshStandardMaterial color="#3a3531" roughness={0.42} metalness={1} side={2} />
    </mesh>
  )
}

export function ThrusterQuad({ size }: { size: number }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[size * 1.3, size * 0.7, size * 1.3]} />
        <Aluminium dark />
      </mesh>
      <group position={[0, size * 0.35, 0]}>
        <Nozzle size={size} />
      </group>
      <group position={[size * 0.65, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <Nozzle size={size * 0.8} />
      </group>
      <group position={[0, 0, size * 0.65]} rotation={[Math.PI / 2, 0, 0]}>
        <Nozzle size={size * 0.8} />
      </group>
    </group>
  )
}

export function StarTracker({ size }: { size: number }) {
  return (
    <group>
      <mesh position={[0, size * 0.25, 0]}>
        <boxGeometry args={[size * 0.8, size * 0.5, size * 0.8]} />
        <Aluminium />
      </mesh>
      <mesh position={[0, size * 0.95, 0]}>
        <cylinderGeometry args={[size * 0.5, size * 0.32, size * 0.9, 24, 1, true]} />
        <meshStandardMaterial color="#111216" roughness={0.9} side={2} />
      </mesh>
      <mesh position={[0, size * 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.3, 20]} />
        <meshStandardMaterial color="#04060a" roughness={0.03} metalness={1} />
      </mesh>
    </group>
  )
}

export function BoltRing({ radius, count, size }: { radius: number; count: number; size: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
            <cylinderGeometry args={[size, size, size * 1.4, 6]} />
            <Aluminium />
          </mesh>
        )
      })}
    </group>
  )
}

export function Reflector({ radius, depth, detailed }: { radius: number; depth: number; detailed: boolean }) {
  const dish = useMemo(() => Array.from({ length: 25 }, (_, index) => new Vector2((radius * index) / 24, depth * Math.pow(index / 24, 2))), [radius, depth])
  const focus = depth + radius * 0.75
  return (
    <group>
      <mesh>
        <latheGeometry args={[dish, 64]} />
        <meshStandardMaterial color="#eceef1" roughness={0.5} metalness={0.05} side={2} />
      </mesh>
      <mesh position={[0, depth, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, radius * 0.022, 8, 64]} />
        <Aluminium />
      </mesh>
      <mesh position={[0, focus, 0]}>
        <cylinderGeometry args={[radius * 0.12, radius * 0.07, radius * 0.16, 20]} />
        <Aluminium />
      </mesh>
      {[0, 1, 2].map((strut) => {
        const angle = (strut / 3) * Math.PI * 2 + 0.4
        return <Rod key={strut} from={[Math.cos(angle) * radius * 0.94, depth * 0.9, Math.sin(angle) * radius * 0.94]} to={[0, focus, 0]} radius={radius * 0.014} />
      })}
      {detailed && Array.from({ length: 8 }, (_, rib) => {
        const angle = (rib / 8) * Math.PI * 2
        return <Rod key={rib} from={[Math.cos(angle) * radius * 0.16, -radius * 0.05, Math.sin(angle) * radius * 0.16]} to={[Math.cos(angle) * radius * 0.9, depth * 0.78, Math.sin(angle) * radius * 0.9]} radius={radius * 0.016} material={<Aluminium />} />
      })}
      {detailed && (
        <mesh position={[0, -radius * 0.06, 0]}>
          <cylinderGeometry args={[radius * 0.18, radius * 0.14, radius * 0.14, 20]} />
          <Aluminium dark />
        </mesh>
      )}
    </group>
  )
}
