import { useMemo } from 'react'
import { DoubleSide, Shape } from 'three'
import { Rod } from '../Spacecraft/Parts/Hardware'
import { Aluminium, Foil } from '../Spacecraft/Parts/Materials'
import { PanelSheet } from './PanelSheet'

const SegmentRadius = 0.037

function Sunshield() {
  const shape = useMemo(() => {
    const kite = new Shape()
    kite.moveTo(-0.5, 0)
    kite.lineTo(-0.3, 0.3)
    kite.lineTo(0.3, 0.3)
    kite.lineTo(0.5, 0)
    kite.lineTo(0.3, -0.3)
    kite.lineTo(-0.3, -0.3)
    kite.closePath()
    return kite
  }, [])
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2, 3, 4].map((layer) => (
        <mesh key={layer} position={[0, 0, -layer * 0.014]} scale={1 - layer * 0.035}>
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial color={layer === 0 ? '#cbb6d6' : '#d9dde2'} metalness={0.7} roughness={0.3} side={DoubleSide} envMapIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}

function PrimaryMirror() {
  const cells = useMemo(() => {
    const list: [number, number][] = []
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
        if (distance === 0 || distance > 2) continue
        list.push([Math.sqrt(3) * SegmentRadius * (q + r / 2), 1.5 * SegmentRadius * r])
      }
    }
    return list
  }, [])
  return (
    <group>
      {cells.map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[SegmentRadius * 0.96, SegmentRadius * 0.96, 0.008, 6]} />
          <meshStandardMaterial color="#f0c05a" metalness={0.72} roughness={0.2} envMapIntensity={1.8} emissive="#7a5412" emissiveIntensity={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.012, 6]} />
        <Aluminium dark />
      </mesh>
    </group>
  )
}

export function WebbModel() {
  return (
    <group>
      <Sunshield />
      <group position={[0, -0.24, 0.02]} rotation={[0.12, 0, 0]}>
        <PrimaryMirror />
        {[0, 1, 2].map((leg) => {
          const angle = (leg / 3) * Math.PI * 2 - Math.PI / 2
          return <Rod key={leg} from={[Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0]} to={[0, 0, 0.3]} radius={0.004} />
        })}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.006, 20]} />
          <meshStandardMaterial color="#f0c05a" metalness={1} roughness={0.1} />
        </mesh>
        <Rod from={[0, -0.16, -0.01]} to={[0, 0.2, -0.04]} radius={0.01} />
      </group>
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[0.13, 0.07, 0.13]} />
        <Foil repeat={2} />
      </mesh>
      <group position={[0, 0.06, -0.2]} rotation={[0.25, 0, 0]}>
        <PanelSheet position={[0, 0, 0]} size={[0.07, 0.004, 0.24]} tiles={[1, 4]} back="#c3c7cd" />
      </group>
      <Rod from={[0.05, 0.08, 0.02]} to={[0.1, 0.16, 0.05]} radius={0.004} material={<Aluminium />} />
      <mesh position={[0.1, 0.17, 0.05]}>
        <cylinderGeometry args={[0.03, 0.012, 0.016, 24]} />
        <Aluminium />
      </mesh>
    </group>
  )
}
