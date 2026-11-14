import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { SpacecraftBlueprint } from '../Visuals/SpacecraftBlueprint'
import { MotionPreference } from './MotionPreference'
import { SpacecraftModel } from './SpacecraftModel'

export function StudioLight() {
  return (
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[-4, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={1} position={[4, 0, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} />
    </Environment>
  )
}

export default function Workshop({ design, label }: { design: ResolvedDesign; label: string }) {
  const blueprint = useMemo(() => new SpacecraftBlueprint(design), [design])
  return (
    <Canvas className="Workshop" style={{ touchAction: 'pan-y' }} camera={{ position: [0.95, 0.55, 1.5], fov: 34 }} dpr={[1, 2]} aria-label={label} role="img">
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={2.6} />
      <StudioLight />
      <SpacecraftModel blueprint={blueprint} />
      <ContactShadows position={[0, -0.52, 0]} opacity={0.32} blur={2.6} scale={3.4} far={1.4} resolution={512} />
      <OrbitControls makeDefault enableZoom={false} enablePan={false} autoRotate={!MotionPreference.reduced} autoRotateSpeed={0.9} minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.62} />
    </Canvas>
  )
}
