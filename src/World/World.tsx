import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CubeCamera, HalfFloatType, Vector3, WebGLCubeRenderTarget, type Group } from 'three'
import { Spacecraft } from '../Engine/Spacecraft/Spacecraft'
import { useGameStore } from '../State/GameStore'
import { Screen } from '../State/Screen'
import { Globe } from './Earth/Globe'
import { MotionPreference } from './MotionPreference'
import { SpacecraftBlueprint } from './Spacecraft/SpacecraftBlueprint'
import { SpacecraftModel } from './Spacecraft/SpacecraftModel'

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

interface Station {
  x: number
  y: number
  size: number
}

const Stations: Partial<Record<Screen, Station>> = {
  [Screen.Hangar]: { x: 0.02, y: 0.1, size: 0.52 },
  [Screen.Flight]: { x: 0.06, y: 0.12, size: 0.4 },
}
const CraftDepth = 1.1
const ReflectEvery = 24

function Craft() {
  const loadout = useGameStore((state) => state.loadout)
  const blueprint = useMemo(() => new SpacecraftBlueprint(new Spacecraft(loadout)), [loadout])
  const group = useRef<Group>(null)
  const frames = useRef(0)
  const { gl, scene } = useThree()
  const reflection = useMemo(() => {
    const target = new WebGLCubeRenderTarget(128, { type: HalfFloatType })
    return { target, camera: new CubeCamera(0.01, 60, target) }
  }, [])

  useEffect(() => {
    scene.environment = reflection.target.texture
    scene.environmentIntensity = 1.6
    return () => {
      scene.environment = null
      reflection.target.dispose()
    }
  }, [scene, reflection])

  useFrame((_, delta) => {
    const craft = group.current
    if (!craft) return
    const game = useGameStore.getState()
    const station = game.screen === Screen.Flight && !game.flight?.encounter ? undefined : Stations[game.screen]
    const step = Math.min(delta, 0.1)
    const blend = MotionPreference.reduced ? 1 : 1 - Math.exp(-2.2 * step)
    const size = craft.scale.x + ((station?.size ?? 0) - craft.scale.x) * blend
    craft.scale.setScalar(size)
    craft.visible = size > 0.01
    if (station) {
      craft.position.x += (station.x - craft.position.x) * blend
      craft.position.y += (station.y - craft.position.y) * blend
    }
    if (!MotionPreference.reduced) craft.rotation.y += step * 0.16
    if (craft.visible && frames.current++ % ReflectEvery === 0) {
      craft.visible = false
      reflection.camera.position.copy(craft.position)
      reflection.camera.update(gl, scene)
      craft.visible = true
    }
  })

  return (
    <>
      <ambientLight intensity={0.03} />
      <directionalLight position={SunDirection.clone().multiplyScalar(8)} intensity={3.4} />
      <directionalLight position={[0, -4, 1.5]} intensity={0.55} color="#9bb6ff" />
      <group ref={group} position={[0, 0.1, CraftDepth]} scale={0} rotation={[0.42, 0.6, 0.12]}>
        <SpacecraftModel key={blueprint.key} blueprint={blueprint} />
      </group>
    </>
  )
}

export function World() {
  return (
    <Canvas className="World" dpr={[1, 2]} camera={{ position: [0, 0, 2.55], fov: 42, near: 0.01, far: 50 }} gl={{ antialias: true }}>
      <color attach="background" args={['#000000']} />
      <Planet />
      <Craft />
    </Canvas>
  )
}
