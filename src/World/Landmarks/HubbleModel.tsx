import { useMemo } from 'react'
import { BlanketGeometry } from '../Spacecraft/BlanketGeometry'
import { Reflector, Rod } from '../Spacecraft/Parts/Hardware'
import { Aluminium, Baffle, Foil, Glass } from '../Spacecraft/Parts/Materials'
import { PanelSheet } from './PanelSheet'

export function HubbleModel() {
  const tube = useMemo(() => BlanketGeometry.cylinder(0.118, 0.56, 5), [])
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={tube} position={[0, 0.2, 0]}>
        <Foil tone="Silver" repeat={4} />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.162, 0.162, 0.42, 48]} />
        <Aluminium />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.122, 0.162, 0.04, 48]} />
        <Aluminium />
      </mesh>
      {[0.02, 0.2, 0.38].map((level) => (
        <mesh key={level} position={[0, level, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.122, 0.006, 8, 48]} />
          <Aluminium />
        </mesh>
      ))}
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.112, 0.112, 0.03, 48, 1, true]} />
        <Baffle />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.11, 40]} />
        <Glass />
      </mesh>
      <group position={[0, 0.485, 0.118]} rotation={[-1.9, 0, 0]}>
        <mesh position={[0, 0, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.008, 48]} />
          <Foil tone="Silver" repeat={2} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Rod from={[side * 0.12, 0.05, 0]} to={[side * 0.23, 0.05, 0]} radius={0.008} material={<Aluminium />} />
          <group position={[side * 0.335, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <PanelSheet position={[0, 0, 0]} size={[0.54, 0.006, 0.2]} tiles={[6, 3]} back="#c3c7cd" />
          </group>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0.1, side * 0.125]}>
          <Rod from={[0, 0, 0]} to={[0, 0.12, side * 0.16]} radius={0.006} material={<Aluminium />} />
          <group position={[0, 0.12, side * 0.16]} rotation={[side * 1.2, 0, 0]}>
            <Reflector radius={0.055} depth={0.014} detailed={false} />
          </group>
        </group>
      ))}
    </group>
  )
}
