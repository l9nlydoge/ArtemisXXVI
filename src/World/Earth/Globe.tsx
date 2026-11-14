import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AtmosphereMaterial } from './AtmosphereMaterial'
import type { CoveragePainter } from './CoveragePainter'
import { EarthMaterial } from './EarthMaterial'
import { OrbitPath } from './OrbitPath'

export function Globe({ painter, onLoaded }: { painter: CoveragePainter; onLoaded(): void }) {
  const announced = useRef(false)
  const earth = useMemo(() => new EarthMaterial(OrbitPath.sunDirection), [])
  const atmosphere = useMemo(() => new AtmosphereMaterial(OrbitPath.sunDirection), [])

  useEffect(() => {
    earth.coverage = painter.texture
  }, [earth, painter])
  useFrame(() => {
    if (announced.current || !earth.isLoaded) return
    announced.current = true
    onLoaded()
  })
  useEffect(() => () => earth.dispose(), [earth])
  useEffect(() => () => atmosphere.dispose(), [atmosphere])

  return (
    <group>
      <mesh material={earth}>
        <sphereGeometry args={[1, 192, 128]} />
      </mesh>
      <mesh scale={1.028} material={atmosphere}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
    </group>
  )
}
