import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo } from 'react'
import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { SpacecraftBlueprint } from '../Visuals/SpacecraftBlueprint'
import { MotionPreference } from './MotionPreference'
import { SpacecraftModel } from './SpacecraftModel'

function StudioLight() {
  return (
    <Environment resolution={256}>
      <color attach="background" args={['#4b5059']} />
      <Lightformer form="rect" intensity={6} position={[0, 4, 1]} rotation={[-Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
      <Lightformer form="rect" intensity={3} position={[-4, 1.5, 2]} rotation={[0, Math.PI / 2.4, 0]} scale={[5, 3, 1]} />
      <Lightformer form="rect" intensity={2} position={[4, 0.5, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[0, 0.5, 5]} scale={[8, 4, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#dfe3e8" position={[0, -3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
    </Environment>
  )
}

export default function Workshop({ design, label }: { design: ResolvedDesign; label: string }) {
  const blueprint = useMemo(() => new SpacecraftBlueprint(design), [design])
  return (
    <Canvas className="Workshop" flat shadows style={{ touchAction: 'pan-y' }} camera={{ position: [0.95, 0.5, 1.45], fov: 34, near: 0.1, far: 30 }} dpr={[1, 2]} aria-label={label} role="img">
      <color attach="background" args={[6, 6, 6]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[2.2, 3.4, 2.6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1}
        shadow-camera-right={1}
        shadow-camera-top={1}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={10}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
      />
      <StudioLight />
      <SpacecraftModel blueprint={blueprint} shadows />
      <ContactShadows position={[0, -0.52, 0]} opacity={0.3} blur={2.4} scale={3.4} far={1.4} resolution={512} />
      <OrbitControls makeDefault enableZoom={false} enablePan={false} autoRotate={!MotionPreference.reduced} autoRotateSpeed={0.9} minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.62} />
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.07} distanceFalloff={0.5} intensity={2.4} quality="high" />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}
