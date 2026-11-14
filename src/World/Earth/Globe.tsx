import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Vector3 } from 'three'
import { AtmosphereMaterial } from './AtmosphereMaterial'
import { EarthMaterial } from './EarthMaterial'

export function Globe({ sunDirection, onLoaded }: { sunDirection: Vector3; onLoaded(): void }) {
  const announced = useRef(false)
  const earth = useMemo(() => new EarthMaterial(sunDirection), [sunDirection])
  const atmosphere = useMemo(() => new AtmosphereMaterial(sunDirection), [sunDirection])

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
