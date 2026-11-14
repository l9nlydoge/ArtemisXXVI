import { useMemo } from 'react'
import { BlanketGeometry } from '../BlanketGeometry'
import { BoltRing, Cable, StarTracker, ThrusterQuad } from './Hardware'
import { Aluminium, Foil, MirrorTiles, Paint } from './Materials'

interface BusProps {
  width: number
  height: number
  depth: number
  shielded: boolean
  detailed: boolean
}

export function Bus({ width: w, height: h, depth: d, shielded, detailed }: BusProps) {
  const blanket = useMemo(() => BlanketGeometry.box(w, h, d), [w, h, d])
  const unit = Math.min(w, h)
  const ring = unit * 0.34
  const top = h / 2
  const front = d / 2
  return (
    <group>
      <mesh geometry={blanket}>
        <Foil repeat={4} />
      </mesh>

      {[-0.22, 0.24].map((level) => (
        <mesh key={level} position={[0, h * level, 0]}>
          <boxGeometry args={[w * 1.016, unit * 0.014, d * 1.016]} />
          <Foil tone="Amber" repeat={6} />
        </mesh>
      ))}

      <mesh position={[0, h * 0.02, front + unit * 0.012]}>
        <boxGeometry args={[w * 0.66, h * 0.4, unit * 0.012]} />
        <Aluminium dark />
      </mesh>
      <mesh position={[0, h * 0.02, front + unit * 0.02]}>
        <boxGeometry args={[w * 0.62, h * 0.36, unit * 0.012]} />
        <MirrorTiles columns={8} rows={Math.max(2, Math.round((8 * h * 0.36) / (w * 0.62)))} />
      </mesh>
      <mesh position={[0, -h * 0.36, front + unit * 0.01]}>
        <boxGeometry args={[w * 0.5, h * 0.14, unit * 0.01]} />
        <Foil tone="Black" repeat={2} />
      </mesh>
      <mesh position={[0, h * 0.37, front + unit * 0.01]}>
        <boxGeometry args={[w * 0.56, h * 0.12, unit * 0.01]} />
        <Foil tone="Silver" repeat={2} />
      </mesh>

      <group position={[0, 0, -front]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, unit * 0.05, 0]}>
          <cylinderGeometry args={[ring, ring, unit * 0.1, 64, 1, true]} />
          <meshStandardMaterial color="#aeb4bd" roughness={0.3} metalness={1} side={2} />
        </mesh>
        <mesh position={[0, unit * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ring, unit * 0.014, 8, 64]} />
          <Aluminium />
        </mesh>
        {detailed && (
          <group position={[0, unit * 0.11, 0]}>
            <BoltRing radius={ring} count={20} size={unit * 0.008} />
          </group>
        )}
      </group>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 + unit * 0.02), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[unit * 0.075, unit * 0.09, unit * 0.06, 28]} />
          <Aluminium />
        </mesh>
      ))}

      {detailed && (
        <>
          <group position={[-w * 0.3, top, -d * 0.26]} rotation={[-0.35, 0, 0.25]}>
            <StarTracker size={unit * 0.11} />
          </group>
          <group position={[-w * 0.08, top, -d * 0.3]} rotation={[-0.3, 0, -0.2]}>
            <StarTracker size={unit * 0.11} />
          </group>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.34, top + unit * 0.012, d * 0.3]}>
              <boxGeometry args={[unit * 0.1, unit * 0.022, unit * 0.1]} />
              <Paint />
            </mesh>
          ))}
          {[-1, 1].flatMap((x) => [-1, 1].map((y) => (
            <group key={`${x}${y}`} position={[x * (w / 2 + unit * 0.035), y * h * 0.38, -d * 0.3]} rotation={[0, 0, -x * Math.PI / 2]}>
              <ThrusterQuad size={unit * 0.055} />
            </group>
          )))}
          <mesh position={[w * 0.36, top + unit * 0.05, -d * 0.36]}>
            <coneGeometry args={[unit * 0.025, unit * 0.1, 16]} />
            <Aluminium />
          </mesh>
          <Cable radius={unit * 0.007} points={[[-w * 0.3, top + unit * 0.01, -d * 0.2], [-w * 0.42, top + unit * 0.012, 0], [-w * 0.505, h * 0.3, d * 0.1], [-w * 0.508, h * 0.05, d * 0.12]]} />
          <Cable radius={unit * 0.007} points={[[w * 0.34, top + unit * 0.012, d * 0.26], [w * 0.44, top + unit * 0.012, d * 0.1], [w * 0.507, h * 0.32, 0], [w * 0.508, h * 0.08, -d * 0.05]]} />
        </>
      )}

      {shielded && [-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * (front + unit * 0.07)]}>
          <mesh>
            <boxGeometry args={[w * 0.94, h * 0.94, unit * 0.012]} />
            <meshStandardMaterial color="#c7ccd4" roughness={0.26} metalness={1} transparent opacity={side === 1 ? 0.5 : 1} />
          </mesh>
          {[-1, 1].flatMap((x) => [-1, 1].map((y) => (
            <mesh key={`${x}${y}`} position={[x * w * 0.42, y * h * 0.42, -side * unit * 0.035]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[unit * 0.012, unit * 0.012, unit * 0.07, 8]} />
              <Aluminium dark />
            </mesh>
          )))}
        </group>
      ))}
    </group>
  )
}
