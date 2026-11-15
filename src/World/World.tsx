import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3, type Group } from 'three'
import { useGameStore } from '../State/GameStore'
import { Screen } from '../State/Screen'
import { Globe } from './Earth/Globe'
import { MotionPreference } from './MotionPreference'

const SunDirection = new Vector3(0.82, 0.3, 0.49).normalize()
const TurnPerSecond = 0.012
const EasePerSecond = 1.6

interface Framing {
  x: number
  y: number
  scale: number
}

const Framings: Readonly<Record<Screen, Framing>> = {
  [Screen.Home]: { x: 0.62, y: -0.08, scale: 1 },
  [Screen.Week]: { x: 0, y: -1.72, scale: 1.55 },
  [Screen.Hangar]: { x: -0.1, y: -1.5, scale: 1.5 },
  [Screen.Flight]: { x: 0.15, y: -1.62, scale: 1.7 },
  [Screen.Debrief]: { x: 1.05, y: 0.42, scale: 0.62 },
  [Screen.Lab]: { x: 1.28, y: -0.62, scale: 0.6 },
}

function Planet() {
  const frame = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const markWorldReady = useGameStore((state) => state.markWorldReady)

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1)
    if (spin.current && !MotionPreference.reduced) spin.current.rotation.y += step * TurnPerSecond
    const group = frame.current
    if (!group) return
    const target = Framings[useGameStore.getState().screen]
    const blend = MotionPreference.reduced ? 1 : 1 - Math.exp(-EasePerSecond * step)
    group.position.x += (target.x - group.position.x) * blend
    group.position.y += (target.y - group.position.y) * blend
    const scale = group.scale.x + (target.scale - group.scale.x) * blend
    group.scale.setScalar(scale)
  })

  const start = Framings[useGameStore.getState().screen]
  return (
    <group ref={frame} position={[start.x, start.y, 0]} scale={start.scale} rotation={[0.38, 0, 0.12]}>
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
