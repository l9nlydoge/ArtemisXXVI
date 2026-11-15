import { useMemo } from 'react'
import type { WingPart } from '../SpacecraftBlueprint'
import { SceneTextures } from '../SceneTextures'
import { Cable, Rod } from './Hardware'
import { Aluminium, Carbon } from './Materials'

interface SolarWingProps {
  wing: WingPart
  rollOut: boolean
  bodyWidth: number
  detailed: boolean
}

function Panel({ width, height, thickness, x, columns, detailed }: { width: number; height: number; thickness: number; x: number; columns: number; detailed: boolean }) {
  const cells = useMemo(() => {
    const texture = SceneTextures.solarCells().clone()
    texture.repeat.set(columns / 4, 0.75)
    texture.needsUpdate = true
    return texture
  }, [columns])
  const frame = height * 0.014
  return (
    <group position={[x, 0, 0]}>
      <mesh>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial attach="material-0" color="#8f96a1" metalness={1} roughness={0.35} />
        <meshStandardMaterial attach="material-1" color="#8f96a1" metalness={1} roughness={0.35} />
        <meshStandardMaterial attach="material-2" color="#8f96a1" metalness={1} roughness={0.35} />
        <meshStandardMaterial attach="material-3" color="#8f96a1" metalness={1} roughness={0.35} />
        <meshStandardMaterial attach="material-4" map={cells} metalness={0.7} roughness={0.16} envMapIntensity={1.6} />
        <meshStandardMaterial attach="material-5" color="#c3c7cd" metalness={0.15} roughness={0.55} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`h${side}`} position={[0, side * (height / 2 - frame / 2), 0]}>
          <boxGeometry args={[width, frame, thickness * 1.5]} />
          <Aluminium />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`v${side}`} position={[side * (width / 2 - frame / 2), 0, 0]}>
          <boxGeometry args={[frame, height, thickness * 1.5]} />
          <Aluminium />
        </mesh>
      ))}
      {detailed && [-0.28, 0, 0.28].map((level) => (
        <mesh key={level} position={[0, height * level, -thickness * 0.9]}>
          <boxGeometry args={[width * 0.96, frame * 1.2, thickness * 1.2]} />
          <Carbon />
        </mesh>
      ))}
    </group>
  )
}

export function SolarWing({ wing, rollOut, bodyWidth, detailed }: SolarWingProps) {
  const { w, h } = wing.box
  const side = wing.side
  const inner = side === 1 ? wing.box.x : wing.box.x + w
  const hub = (side * bodyWidth) / 2
  const thickness = Math.max(0.004, h * 0.016)
  const gap = Math.max(h * 0.02, w * 0.008)
  const panel = (w - gap * (wing.panels - 1)) / wing.panels
  const columns = Math.max(2, Math.round((panel / h) * 4))
  const tube = h * 0.018
  const offset = (index: number) => inner + side * (panel / 2 + index * (panel + gap))

  return (
    <group name="SolarWing">
      <Rod from={[hub, 0, 0]} to={[inner, h * 0.38, 0]} radius={tube} />
      <Rod from={[hub, 0, 0]} to={[inner, -h * 0.38, 0]} radius={tube} />
      <Rod from={[hub + (inner - hub) * 0.55, h * 0.21, 0]} to={[hub + (inner - hub) * 0.55, -h * 0.21, 0]} radius={tube * 0.8} />
      <Rod from={[hub, 0, 0]} to={[inner, 0, 0]} radius={tube * 1.2} material={<Aluminium />} />
      {detailed && <Cable radius={tube * 0.45} points={[[hub, tube * 2, tube], [hub + (inner - hub) * 0.5, h * 0.16, tube * 2], [inner, h * 0.3, -thickness]]} />}

      {rollOut ? (
        <>
          <mesh position={[wing.box.x + w / 2, 0, 0]}>
            <boxGeometry args={[w, h * 0.94, thickness * 0.4]} />
            <meshStandardMaterial attach="material-0" color="#8f96a1" />
            <meshStandardMaterial attach="material-1" color="#8f96a1" />
            <meshStandardMaterial attach="material-2" color="#8f96a1" />
            <meshStandardMaterial attach="material-3" color="#8f96a1" />
            <meshStandardMaterial attach="material-4" color="#1d2670" metalness={0.6} roughness={0.22} envMapIntensity={1.5} />
            <meshStandardMaterial attach="material-5" color="#b9741c" metalness={0.8} roughness={0.35} />
          </mesh>
          {[-1, 1].map((edge) => (
            <Rod key={edge} from={[inner, edge * h * 0.49, 0]} to={[inner + side * w, edge * h * 0.49, 0]} radius={tube * 0.9} />
          ))}
          {[inner, inner + side * w].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <cylinderGeometry args={[h * 0.06, h * 0.06, h * 1.04, 28]} />
              <Aluminium />
            </mesh>
          ))}
        </>
      ) : (
        Array.from({ length: wing.panels }, (_, index) => (
          <group key={index}>
            <Panel width={panel} height={h} thickness={thickness} x={offset(index)} columns={columns} detailed={detailed} />
            {detailed && index > 0 && [-0.3, 0.3].map((level) => (
              <mesh key={level} position={[offset(index) - side * (panel / 2 + gap / 2), h * level, 0]}>
                <cylinderGeometry args={[thickness * 1.3, thickness * 1.3, h * 0.07, 12]} />
                <Aluminium dark />
              </mesh>
            ))}
          </group>
        ))
      )}
    </group>
  )
}
