import { useMemo } from 'react'
import { BlanketGeometry } from '../Spacecraft/BlanketGeometry'
import { Reflector, Rod } from '../Spacecraft/Parts/Hardware'
import { Aluminium, Baffle, Foil, Glass, MirrorTiles } from '../Spacecraft/Parts/Materials'
import { PanelSheet } from './PanelSheet'

export function GoesModel() {
  const bus = useMemo(() => BlanketGeometry.box(0.26, 0.34, 0.26, 5), [])
  return (
    <group>
      <mesh geometry={bus}>
        <Foil repeat={3} />
      </mesh>
      <mesh position={[0, 0.03, 0.134]}>
        <boxGeometry args={[0.18, 0.2, 0.006]} />
        <MirrorTiles columns={6} rows={7} />
      </mesh>

      <Rod from={[-0.13, 0, 0]} to={[-0.24, 0, 0]} radius={0.008} material={<Aluminium />} />
      <Rod from={[-0.15, 0, 0]} to={[-0.24, 0.07, 0]} radius={0.005} />
      <Rod from={[-0.15, 0, 0]} to={[-0.24, -0.07, 0]} radius={0.005} />
      <group position={[-0.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <PanelSheet position={[0, 0, 0]} size={[0.52, 0.006, 0.19]} tiles={[10, 3]} back="#c3c7cd" />
      </group>
      <mesh position={[-0.2, 0.05, 0.04]}>
        <boxGeometry args={[0.05, 0.06, 0.06]} />
        <Aluminium />
      </mesh>

      <Rod from={[0.13, 0.12, 0]} to={[0.62, 0.3, -0.05]} radius={0.004} />
      <mesh position={[0.62, 0.3, -0.05]}>
        <boxGeometry args={[0.02, 0.02, 0.02]} />
        <Aluminium />
      </mesh>

      <group position={[0.04, -0.2, 0.04]}>
        <mesh>
          <boxGeometry args={[0.13, 0.08, 0.13]} />
          <Foil tone="Silver" repeat={2} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.03, 28, 1, true]} />
          <Baffle />
        </mesh>
        <mesh position={[0, -0.036, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.038, 28]} />
          <Glass />
        </mesh>
      </group>
      <mesh position={[-0.07, -0.2, -0.05]}>
        <cylinderGeometry args={[0.03, 0.03, 0.07, 24]} />
        <Aluminium dark />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[0.02, -0.06, side * 0.13]} rotation={[side * 1.9, 0, 0]}>
          <Rod from={[0, 0, 0]} to={[0, 0.07, 0]} radius={0.007} material={<Aluminium />} />
          <group position={[0, 0.07, 0]}>
            <Reflector radius={0.085} depth={0.022} detailed={false} />
          </group>
        </group>
      ))}
    </group>
  )
}
