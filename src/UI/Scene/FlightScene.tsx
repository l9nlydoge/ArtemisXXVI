import { Line, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Matrix4, Vector3, type Group } from 'three'
import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { SpacecraftBlueprint } from '../Visuals/SpacecraftBlueprint'
import { CameraView } from './CameraView'
import { CoveragePainter } from './CoveragePainter'
import { Globe } from './Globe'
import { MotionPreference } from './MotionPreference'
import { OrbitPath } from './OrbitPath'
import { Palette } from './Palette'
import { SpacecraftModel } from './SpacecraftModel'
import { StudioLight } from './Workshop'

export interface FlightSceneProps {
  design: ResolvedDesign
  coverage: number
  lost: boolean
  view: CameraView
}

const WideDirection = new Vector3(0.55, 0.42, 1).normalize()

function Mission({ design, coverage, lost, view }: FlightSceneProps) {
  const path = useMemo(() => new OrbitPath(design.orbit), [design.orbit])
  const blueprint = useMemo(() => new SpacecraftBlueprint(design), [design])
  const painter = useMemo(() => new CoveragePainter(path, design.copies), [path, design.copies])
  const ring = useMemo(() => path.ring(), [path])
  const earth = useRef<Group>(null)
  const fleet = useRef<(Group | null)[]>([])
  const state = useRef({ u: 0.6, painted: 0, tumble: 0, blend: 0, look: new Vector3(), ready: false })
  const scratch = useMemo(() => ({ position: new Vector3(), ahead: new Vector3(), radial: new Vector3(), tangent: new Vector3(), normal: new Vector3(), desired: new Vector3(), look: new Vector3(), chase: new Vector3(), chaseLook: new Vector3(), basis: new Matrix4() }), [])
  const speed = (Math.PI * 2) / path.visualPeriodSeconds

  useEffect(() => () => painter.dispose(), [painter])

  useFrame(({ camera }, delta) => {
    const step = Math.min(delta, 0.1)
    const current = state.current
    if (!MotionPreference.reduced) current.u += speed * step
    if (lost) current.tumble += step * 0.9
    current.painted += (coverage - current.painted) * Math.min(1, step * 1.6)
    painter.paintTo(current.painted)
    if (earth.current) earth.current.rotation.y = path.earthRotation(current.u)

    fleet.current.forEach((craft, index) => {
      if (!craft) return
      const u = current.u + (index / design.copies) * Math.PI * 2
      path.position(u, scratch.position)
      path.position(u + 0.01, scratch.ahead)
      scratch.tangent.subVectors(scratch.ahead, scratch.position).normalize()
      scratch.radial.copy(path.isHalo ? OrbitPath.sunDirection : scratch.position).normalize()
      scratch.normal.crossVectors(scratch.radial, scratch.tangent).normalize()
      scratch.tangent.crossVectors(scratch.normal, scratch.radial).normalize()
      scratch.basis.makeBasis(scratch.normal, scratch.radial, scratch.tangent)
      craft.position.copy(scratch.position)
      craft.quaternion.setFromRotationMatrix(scratch.basis)
      if (lost) craft.rotateZ(current.tumble).rotateX(current.tumble * 0.7)
    })

    path.position(current.u, scratch.position)
    path.position(current.u + 0.01, scratch.ahead)
    scratch.tangent.subVectors(scratch.ahead, scratch.position).normalize()
    scratch.radial.copy(path.isHalo ? OrbitPath.sunDirection : scratch.position).normalize()
    scratch.normal.crossVectors(scratch.radial, scratch.tangent).normalize()
    const size = path.craftSize
    const target = view === CameraView.Chase ? 1 : 0
    current.blend = current.ready ? current.blend + (target - current.blend) * Math.min(1, step * 1.8) : target
    const mix = current.blend * current.blend * (3 - 2 * current.blend)

    scratch.desired.copy(WideDirection).multiplyScalar(path.viewDistance)
    scratch.look.set(0, 0, 0)
    if (path.isHalo) scratch.look.copy(scratch.position).multiplyScalar(0.5)
    scratch.chase.copy(scratch.position).addScaledVector(scratch.radial, size * 1.5).addScaledVector(scratch.tangent, -size * 3.6).addScaledVector(scratch.normal, size * 2.1)
    scratch.chaseLook.copy(scratch.position).addScaledVector(scratch.tangent, size * 1.4).addScaledVector(scratch.radial, -size * 0.5)

    camera.position.copy(scratch.desired).lerp(scratch.chase, mix)
    current.look.copy(scratch.look).lerp(scratch.chaseLook, mix)
    camera.up.set(0, 1, 0).lerp(scratch.radial, mix).normalize()
    camera.lookAt(current.look)
    current.ready = true
  })

  const reach = path.radius + 1.5
  return (
    <>
      <ambientLight intensity={0.05} />
      <directionalLight
        position={OrbitPath.sunDirection.clone().multiplyScalar(reach * 3)}
        intensity={3.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={0.1}
        shadow-camera-far={reach * 6}
        shadow-bias={-0.0004}
      />
      <StudioLight />
      <Stars radius={120} depth={60} count={3200} factor={4} saturation={0} fade speed={0} />
      <group ref={earth}>
        <Globe painter={painter} />
      </group>
      <Line points={ring} color={Palette.Coverage} lineWidth={1.4} transparent opacity={0.55} />
      {Array.from({ length: design.copies }, (_, index) => (
        <group key={index} ref={(node) => { fleet.current[index] = node }}>
          <group scale={path.craftSize}>
            <SpacecraftModel blueprint={blueprint} shadows />
          </group>
        </group>
      ))}
    </>
  )
}

export default function FlightScene(props: FlightSceneProps & { label: string }) {
  return (
    <Canvas className="FlightScene" shadows dpr={[1, 2]} camera={{ fov: 46, near: 0.004, far: 600, position: [3, 2, 6] }} role="img" aria-label={props.label} onCreated={({ scene }) => { scene.environmentIntensity = 0.22 }}>
      <color attach="background" args={['#000000']} />
      <Mission {...props} />
    </Canvas>
  )
}
