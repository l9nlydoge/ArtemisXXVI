import { useEffect, useMemo } from 'react'
import { AdditiveBlending, BackSide, Color } from 'three'
import type { CoveragePainter } from './CoveragePainter'
import { EarthMap } from './EarthMap'
import { Palette } from './Palette'

const AtmosphereVertex = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-world.xyz);
    gl_Position = projectionMatrix * world;
  }
`

const AtmosphereFragment = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), 2.6);
    gl_FragColor = vec4(uColor, rim * 0.9);
  }
`

export function Globe({ painter }: { painter: CoveragePainter }) {
  const map = useMemo(() => new EarthMap(window.innerWidth * window.devicePixelRatio > 1500 ? 4096 : 2048), [])
  const uniforms = useMemo(() => ({ uColor: { value: new Color('#7fb4ff') } }), [])

  useEffect(() => {
    void map.loadLand()
    return () => map.dispose()
  }, [map])

  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial map={map.texture} roughness={0.9} metalness={0} />
      </mesh>
      <mesh scale={1.003}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshBasicMaterial map={painter.texture} color={Palette.White} transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[1, 64, 48]} />
        <shaderMaterial vertexShader={AtmosphereVertex} fragmentShader={AtmosphereFragment} uniforms={uniforms} side={BackSide} blending={AdditiveBlending} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}
