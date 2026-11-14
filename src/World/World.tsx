import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3, type Group } from 'three'
import { useGameStore } from '../State/GameStore'
import { Globe } from './Earth/Globe'
import { MotionPreference } from './MotionPreference'

const SunDirection = new Vector3(0.82, 0.3, 0.49).normalize()
const TurnPerSecond = 0.012

function Planet() {
  const spin = useRef<Group>(null)
  const markWorldReady = useGameStore((state) => state.markWorldReady)

  useFrame((_, delta) => {
    if (spin.current && !MotionPreference.reduced) spin.current.rotation.y += Math.min(delta, 0.1) * TurnPerSecond
  })

  return (
    <group position={[0.62, -0.08, 0]} rotation={[0.38, 0, 0.12]}>
      <group ref={spin} rotation={[0, 2.2, 0]}>
        <Globe sunDirection={SunDirection} onLoaded={markWorldReady} />
      </group>
    </group>
  )
}

export function World() {
  return (
    <Canvas className="World" dpr={[1, 2]} camera={{ position: [0, 0, 2.55], fov: 42, near: 0.01, far: 50 }} gl={{ antialias: true }}>
      <color attach="background" args={['#000000']} />
      <Planet />
    </Canvas>
  )
}
