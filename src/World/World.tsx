import { Line, PerformanceMonitor, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CubeCamera, HalfFloatType, Matrix4, Quaternion, Vector3, WebGLCubeRenderTarget, type DirectionalLight, type Group, type Object3D } from 'three'
import { useGameStore } from '../State/GameStore'
import { Screen } from '../State/Screen'
import { useMission } from '../State/UseMission'
import { CameraDirector, type CraftFrame } from './CameraDirector'
import { DockControls } from './DockControls'
import { CoveragePainter } from './Earth/CoveragePainter'
import { Globe } from './Earth/Globe'
import { OrbitPath } from './Earth/OrbitPath'
import { MotionPreference } from './MotionPreference'
import { Shot, ShotList } from './Shot'
import { SpacecraftBlueprint } from './Spacecraft/SpacecraftBlueprint'
import { SpacecraftModel } from './Spacecraft/SpacecraftModel'

const SunlightIntensity = 3.8

function Scene({ detailed }: { detailed: boolean }) {
  const { gl, scene } = useThree()
  const { resolved } = useMission()
  const screen = useGameStore((state) => state.screen)
  const seed = useGameStore((state) => state.result?.seed)
  const markWorldReady = useGameStore((state) => state.markWorldReady)
  const airborne = screen === Screen.Flight || screen === Screen.Debrief
  const flightKey = airborne ? seed : undefined

  const path = useMemo(() => new OrbitPath(resolved.orbit), [resolved.orbit])
  const blueprint = useMemo(() => new SpacecraftBlueprint(resolved), [resolved])
  const painter = useMemo(() => new CoveragePainter(path, resolved.copies), [path, resolved.copies, flightKey])
  const ring = useMemo(() => path.ring(), [path])
  const director = useMemo(() => new CameraDirector(), [])
  const dock = useMemo(() => new DockControls(), [])
  const reflection = useMemo(() => {
    const target = new WebGLCubeRenderTarget(256, { type: HalfFloatType })
    return { target, camera: new CubeCamera(0.01, 800, target) }
  }, [])

  const earth = useRef<Group>(null)
  const sun = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const fleetGroup = useRef<Group>(null)
  const ringGroup = useRef<Group>(null)
  const fleet = useRef<(Group | null)[]>([])
  const wings = useRef(new WeakMap<Group, Object3D[]>())
  const state = useRef({ u: 0.9, spin: 0, painted: 0, tumble: 0, frame: 0 })
  const dockAngle = useMemo(() => path.sunlitAngle, [path])
  const craft = useMemo<CraftFrame>(() => ({ position: new Vector3(), radial: new Vector3(), tangent: new Vector3(), normal: new Vector3() }), [])
  const scratch = useMemo(() => ({ ahead: new Vector3(), basis: new Matrix4(), sunLocal: new Vector3(), inverse: new Quaternion() }), [])
  const reflectionEvery = detailed ? 4 : 24

  useEffect(() => dock.attach(gl.domElement), [dock, gl])
  useEffect(() => dock.frame(path.dockPitch), [dock, path])
  useEffect(() => () => painter.dispose(), [painter])
  useEffect(() => {
    state.current.painted = 0
  }, [painter])
  useEffect(() => {
    scene.environment = reflection.target.texture
    scene.environmentIntensity = 1.7
    return () => {
      scene.environment = null
      reflection.target.dispose()
    }
  }, [scene, reflection])

  const locate = (u: number) => {
    path.position(u, craft.position)
    path.position(u + 0.01, scratch.ahead)
    craft.tangent.subVectors(scratch.ahead, craft.position).normalize()
    craft.radial.copy(path.isHalo ? OrbitPath.sunDirection : craft.position).normalize()
    craft.normal.crossVectors(craft.radial, craft.tangent).normalize()
    craft.tangent.crossVectors(craft.normal, craft.radial).normalize()
  }

  useFrame(({ camera, size }, delta) => {
    const game = useGameStore.getState()
    const shot = ShotList.for(game.screen, game.flight.view)
    const flying = ShotList.isAirborne(shot)
    const current = state.current
    const step = Math.min(delta, 0.1)
    const lost = flying && game.flight.lost
    const coverage = flying ? game.flight.coverage : 0

    if (!flying) {
      current.u = dockAngle
      if (!MotionPreference.reduced) current.spin += step * 0.012
    } else if (!MotionPreference.reduced) {
      current.u += ((Math.PI * 2) / path.visualPeriodSeconds) * step
    }
    current.tumble = lost ? current.tumble + step * 0.9 : 0
    current.painted += (coverage - current.painted) * (1 - Math.exp(-1.6 * Math.min(delta, 1)))
    painter.paintTo(current.painted)
    if (earth.current) earth.current.rotation.y = path.earthRotation(current.u) + current.spin

    fleet.current.forEach((member, index) => {
      if (!member) return
      locate(current.u + (index / resolved.copies) * Math.PI * 2)
      scratch.basis.makeBasis(craft.normal, craft.radial, craft.tangent)
      member.position.copy(craft.position)
      member.quaternion.setFromRotationMatrix(scratch.basis)
      if (lost) member.rotateZ(current.tumble).rotateX(current.tumble * 0.7)
      let arrays = wings.current.get(member)
      if (!arrays || arrays.length === 0) {
        arrays = member.getObjectsByProperty('name', 'SolarWing')
        wings.current.set(member, arrays)
      }
      scratch.sunLocal.copy(OrbitPath.sunDirection).applyQuaternion(scratch.inverse.copy(member.quaternion).invert())
      const tilt = Math.atan2(-scratch.sunLocal.y, scratch.sunLocal.z)
      arrays.forEach((array) => { array.rotation.x = tilt })
    })

    locate(current.u)
    if (fleetGroup.current) fleetGroup.current.visible = shot !== Shot.Start
    if (ringGroup.current) ringGroup.current.visible = flying

    if (current.frame++ % reflectionEvery === 0 && fleetGroup.current) {
      const shown = fleetGroup.current.visible
      fleetGroup.current.visible = false
      reflection.camera.position.copy(shot === Shot.Start ? camera.position : craft.position)
      reflection.camera.update(gl, scene)
      reflection.target.texture.needsPMREMUpdate = true
      fleetGroup.current.visible = shown
    }

    const size3 = path.craftSize
    const ease = 1 - Math.exp(-3 * Math.min(delta, 1))
    if (sun.current) {
      const along = craft.position.dot(OrbitPath.sunDirection)
      const offAxis = Math.sqrt(Math.max(0, craft.position.lengthSq() - along * along))
      const eclipsed = flying && !path.isHalo && along < 0 && offAxis < 1
      sun.current.intensity += ((eclipsed ? 0.02 : SunlightIntensity) - sun.current.intensity) * ease
      sun.current.position.copy(craft.position).addScaledVector(OrbitPath.sunDirection, size3 * 8)
      sun.current.target.position.copy(craft.position)
      sun.current.target.updateMatrixWorld()
    }

    dock.enabled = shot === Shot.Dock
    dock.advance(delta)
    director.update(camera, shot, craft, path, dock, size.width / size.height, delta)

    if (fill.current) {
      fill.current.intensity += ((shot === Shot.Dock ? 1.5 : 0) - fill.current.intensity) * ease
      fill.current.position.copy(camera.position)
      fill.current.target.position.copy(craft.position)
      fill.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <ambientLight intensity={0.015} />
      <directionalLight
        ref={sun}
        intensity={SunlightIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-path.craftSize * 1.3}
        shadow-camera-right={path.craftSize * 1.3}
        shadow-camera-top={path.craftSize * 1.3}
        shadow-camera-bottom={-path.craftSize * 1.3}
        shadow-camera-near={path.craftSize * 0.5}
        shadow-camera-far={path.craftSize * 16}
        shadow-bias={-0.0024 * path.craftSize}
        shadow-normalBias={path.craftSize * 0.012}
      />
      <directionalLight ref={fill} intensity={0} />
      <mesh position={OrbitPath.sunDirection.clone().multiplyScalar(400)}>
        <sphereGeometry args={[3.2, 24, 16]} />
        <meshBasicMaterial color={[12, 11, 9.5]} toneMapped={false} />
      </mesh>
      <Stars radius={300} depth={80} count={2600} factor={5} saturation={0} fade speed={0} />
      <group ref={earth}>
        <Globe painter={painter} onLoaded={markWorldReady} />
      </group>
      <group ref={ringGroup}>
        <Line points={ring} color="#f0bc4f" lineWidth={1} transparent opacity={0.28} />
      </group>
      <group ref={fleetGroup}>
        {Array.from({ length: resolved.copies }, (_, index) => (
          <group key={index} ref={(node) => { fleet.current[index] = node }}>
            <group scale={path.craftSize}>
              <SpacecraftModel blueprint={blueprint} shadows detailed={index === 0} />
            </group>
          </group>
        ))}
      </group>
      <EffectComposer multisampling={detailed ? 4 : 0}>
        <Bloom mipmapBlur luminanceThreshold={1.2} luminanceSmoothing={0.2} intensity={0.32} radius={0.62} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}

export default function World() {
  const [detailed, setDetailed] = useState(true)
  return (
    <Canvas className="World" flat shadows style={{ touchAction: 'pan-y' }} dpr={detailed ? [1, 1.75] : 1} camera={{ fov: 50, near: 0.003, far: 900, position: [0, 0.6, 1.6] }} aria-hidden="true">
      <color attach="background" args={['#000000']} />
      <PerformanceMonitor onDecline={() => setDetailed(false)} />
      <Scene detailed={detailed} />
    </Canvas>
  )
}
