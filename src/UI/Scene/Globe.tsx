import { useEffect, useMemo } from 'react'
import { AtmosphereMaterial } from './AtmosphereMaterial'
import type { CoveragePainter } from './CoveragePainter'
import { EarthMaterial } from './EarthMaterial'
import { OrbitPath } from './OrbitPath'

export function Globe({ painter }: { painter: CoveragePainter }) {
  const earth = useMemo(() => new EarthMaterial(painter.texture, OrbitPath.sunDirection), [painter])
  const atmosphere = useMemo(() => new AtmosphereMaterial(OrbitPath.sunDirection), [])

  useEffect(() => () => earth.dispose(), [earth])
  useEffect(() => () => atmosphere.dispose(), [atmosphere])

  return (
    <group>
      <mesh castShadow material={earth}>
        <sphereGeometry args={[1, 192, 128]} />
      </mesh>
      <mesh scale={1.028} material={atmosphere}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
    </group>
  )
}
