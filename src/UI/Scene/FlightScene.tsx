import { Line, PerformanceMonitor, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CubeCamera, HalfFloatType, Matrix4, Quaternion, Vector3, WebGLCubeRenderTarget, type DirectionalLight, type Group, type Object3D } from 'three'
import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { SpacecraftBlueprint } from '../Visuals/SpacecraftBlueprint'
import { CameraView } from './CameraView'
import { CoveragePainter } from './CoveragePainter'
import { Globe } from './Globe'
import { MotionPreference } from './MotionPreference'
import { OrbitPath } from './OrbitPath'
import { SpacecraftModel } from './SpacecraftModel'

export interface FlightSceneProps {
  design: ResolvedDesign
  coverage: number
  lost: boolean
  view: CameraView
}

const WideDirection = new Vector3(0.15, 0.4, 1).normalize()

function Mission({ design, coverage, lost, view, detailed }: FlightSceneProps & { detailed: boolean }) {
  const reflectionEvery = detailed ? 4 : 24
  const { gl, scene } = useThree()
  const path = useMemo(() => new OrbitPath(design.orbit), [design.orbit])
  const blueprint = useMemo(() => new SpacecraftBlueprint(design), [design])
  const painter = useMemo(() => new CoveragePainter(path, design.copies), [path, design.copies])
  const ring = useMemo(() => path.ring(), [path])
  const reflection = useMemo(() => {
    const target = new WebGLCubeRenderTarget(256, { type: HalfFloatType })
    return { target, camera: new CubeCamera(0.01, 800, target) }
  }, [])
  const earth = useRef<Group>(null)
  const sun = useRef<DirectionalLight>(null)
  const fleetGroup = useRef<Group>(null)
  const fleet = useRef<(Group | null)[]>([])
  const wings = useRef(new WeakMap<Group, Object3D[]>())
  const state = useRef({ u: 0.9, painted: 0, tumble: 0, blend: 0, frame: 0, look: new Vector3(), ready: false })
  const scratch = useMemo(() => ({ position: new Vector3(), ahead: new Vector3(), radial: new Vector3(), tangent: new Vector3(), normal: new Vector3(), wide: new Vector3(), wideLook: new Vector3(), chase: new Vector3(), chaseLook: new Vector3(), basis: new Matrix4(), sunLocal: new Vector3(), inverse: new Quaternion() }), [])
  const speed = (Math.PI * 2) / path.visualPeriodSeconds

  useEffect(() => () => painter.dispose(), [painter])
  useEffect(() => {
    scene.environment = reflection.target.texture
    scene.environmentIntensity = 1.7
    return () => {
      scene.environment = null
      reflection.target.dispose()
    }
  }, [scene, reflection])

  const frameOf = (u: number) => {
    path.position(u, scratch.position)
    path.position(u + 0.01, scratch.ahead)
    scratch.tangent.subVectors(scratch.ahead, scratch.position).normalize()
    scratch.radial.copy(path.isHalo ? OrbitPath.sunDirection : scratch.position).normalize()
    scratch.normal.crossVectors(scratch.radial, scratch.tangent).normalize()
    scratch.tangent.crossVectors(scratch.normal, scratch.radial).normalize()
  }

  useFrame(({ camera }, delta) => {
    const step = Math.min(delta, 0.1)
    const current = state.current
    if (!MotionPreference.reduced) current.u += speed * step
    if (lost) current.tumble += step * 0.9
    current.painted += (coverage - current.painted) * (1 - Math.exp(-1.6 * Math.min(delta, 1)))
    painter.paintTo(current.painted)
    if (earth.current) earth.current.rotation.y = path.earthRotation(current.u)

    fleet.current.forEach((craft, index) => {
      if (!craft) return
      frameOf(current.u + (index / design.copies) * Math.PI * 2)
      scratch.basis.makeBasis(scratch.normal, scratch.radial, scratch.tangent)
      craft.position.copy(scratch.position)
      craft.quaternion.setFromRotationMatrix(scratch.basis)
      if (lost) craft.rotateZ(current.tumble).rotateX(current.tumble * 0.7)
      let arrays = wings.current.get(craft)
      if (!arrays || arrays.length === 0) {
        arrays = craft.getObjectsByProperty('name', 'SolarWing')
        wings.current.set(craft, arrays)
      }
      scratch.sunLocal.copy(OrbitPath.sunDirection).applyQuaternion(scratch.inverse.copy(craft.quaternion).invert())
      const tilt = Math.atan2(-scratch.sunLocal.y, scratch.sunLocal.z)
      arrays.forEach((array) => { array.rotation.x = tilt })
    })

    frameOf(current.u)
    if (current.frame++ % reflectionEvery === 0 && fleetGroup.current) {
      fleetGroup.current.visible = false
      reflection.camera.position.copy(scratch.position)
      reflection.camera.update(gl, scene)
      reflection.target.texture.needsPMREMUpdate = true
      fleetGroup.current.visible = true
    }

    const size = path.craftSize
    if (sun.current) {
      const along = scratch.position.dot(OrbitPath.sunDirection)
      const offAxis = Math.sqrt(Math.max(0, scratch.position.lengthSq() - along * along))
      const eclipsed = !path.isHalo && along < 0 && offAxis < 1
      sun.current.intensity += ((eclipsed ? 0.02 : 3.8) - sun.current.intensity) * (1 - Math.exp(-3 * Math.min(delta, 1)))
      sun.current.position.copy(scratch.position).addScaledVector(OrbitPath.sunDirection, size * 8)
      sun.current.target.position.copy(scratch.position)
      sun.current.target.updateMatrixWorld()
    }
    const target = view === CameraView.Chase ? 1 : 0
    current.blend = current.ready ? current.blend + (target - current.blend) * (1 - Math.exp(-2.4 * Math.min(delta, 1))) : target
    const mix = current.blend * current.blend * (3 - 2 * current.blend)

    scratch.wide.copy(WideDirection).multiplyScalar(path.viewDistance)
    scratch.wideLook.set(0, 0, 0)
    if (path.isHalo) scratch.wideLook.copy(scratch.position).multiplyScalar(0.5)
    scratch.chase.copy(scratch.position).addScaledVector(scratch.radial, size * 0.4).addScaledVector(scratch.tangent, -size * 1.25).addScaledVector(scratch.normal, size * 0.9)
    scratch.chaseLook.copy(scratch.position).addScaledVector(scratch.tangent, size * 1.1).addScaledVector(scratch.radial, -size * 0.5).addScaledVector(scratch.normal, size * 0.52)

    camera.position.copy(scratch.wide).lerp(scratch.chase, mix)
    current.look.copy(scratch.wideLook).lerp(scratch.chaseLook, mix)
    camera.up.set(0, 1, 0).lerp(scratch.radial, mix).normalize()
    camera.lookAt(current.look)
    current.ready = true
  })

  return (
    <>
      <ambientLight intensity={0.015} />
      <directionalLight
        ref={sun}
        intensity={3.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-path.craftSize * 1.3}
        shadow-camera-right={path.craftSize * 1.3}
        shadow-camera-top={path.craftSize * 1.3}
        shadow-camera-bottom={-path.craftSize * 1.3}
        shadow-camera-near={path.craftSize * 0.5}
        shadow-camera-far={path.craftSize * 16}
        shadow-bias={-0.00012}
        shadow-normalBias={path.craftSize * 0.012}
      />
      <mesh position={OrbitPath.sunDirection.clone().multiplyScalar(400)}>
        <sphereGeometry args={[3.2, 24, 16]} />
        <meshBasicMaterial color={[12, 11, 9.5]} toneMapped={false} />
      </mesh>
      <Stars radius={300} depth={80} count={2600} factor={5} saturation={0} fade speed={0} />
      <group ref={earth}>
        <Globe painter={painter} />
      </group>
      <Line points={ring} color="#f0bc4f" lineWidth={1} transparent opacity={0.28} />
      <group ref={fleetGroup}>
        {Array.from({ length: design.copies }, (_, index) => (
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

export default function FlightScene(props: FlightSceneProps & { label: string }) {
  const [detailed, setDetailed] = useState(true)
  return (
    <Canvas className="FlightScene" flat shadows dpr={detailed ? [1, 1.75] : 1} camera={{ fov: 50, near: 0.003, far: 900, position: [3, 2, 6] }} role="img" aria-label={props.label}>
      <color attach="background" args={['#000000']} />
      <PerformanceMonitor onDecline={() => setDetailed(false)} />
      <Mission {...props} detailed={detailed} />
    </Canvas>
  )
}
