import { useMemo } from 'react'
import { SceneTextures } from '../Spacecraft/SceneTextures'

interface PanelSheetProps {
  position: [number, number, number]
  size: [number, number, number]
  tiles: [number, number]
  back?: string
}

export function PanelSheet({ position, size, tiles, back = '#b9741c' }: PanelSheetProps) {
  const cells = useMemo(() => {
    const texture = SceneTextures.solarCells().clone()
    texture.repeat.set(tiles[0], tiles[1])
    texture.needsUpdate = true
    return texture
  }, [tiles[0], tiles[1]])
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial attach="material-0" color="#8f96a1" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-1" color="#8f96a1" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-2" map={cells} metalness={0.7} roughness={0.18} envMapIntensity={1.5} />
      <meshStandardMaterial attach="material-3" color={back} metalness={0.7} roughness={0.4} />
      <meshStandardMaterial attach="material-4" color="#8f96a1" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-5" color="#8f96a1" metalness={1} roughness={0.35} />
    </mesh>
  )
}
