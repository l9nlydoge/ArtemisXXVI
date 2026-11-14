import { useMemo } from 'react'
import { DoubleSide, Vector2 } from 'three'
import { SceneTextures } from '../SceneTextures'

const FoilTones = { Gold: '#e8a838', Amber: '#b9741c', Silver: '#d5d9df', Black: '#17181c' } as const

export type FoilTone = keyof typeof FoilTones

export function Foil({ tone = 'Gold', repeat = 3 }: { tone?: FoilTone; repeat?: number }) {
  const normal = useMemo(() => {
    const texture = SceneTextures.foilNormal().clone()
    texture.repeat.set(repeat, repeat)
    texture.needsUpdate = true
    return texture
  }, [repeat])
  const dark = tone === 'Black'
  return (
    <meshStandardMaterial
      color={FoilTones[tone]}
      metalness={dark ? 0.55 : 0.92}
      roughness={dark ? 0.42 : 0.3}
      normalMap={normal}
      normalScale={new Vector2(0.12, 0.12)}
      envMapIntensity={dark ? 0.9 : 1.35}
      side={DoubleSide}
    />
  )
}

export function Paint() {
  return <meshStandardMaterial color="#d6d9de" roughness={0.6} metalness={0.02} side={DoubleSide} />
}

export function Aluminium({ dark = false }: { dark?: boolean }) {
  return <meshStandardMaterial color={dark ? '#2a2d33' : '#aeb4bd'} roughness={dark ? 0.55 : 0.32} metalness={1} />
}

export function Carbon() {
  return <meshStandardMaterial color="#141518" roughness={0.38} metalness={0.35} />
}

export function Glass() {
  return <meshStandardMaterial color="#04060a" roughness={0.03} metalness={1} envMapIntensity={2} />
}

export function Baffle() {
  return <meshStandardMaterial color="#0c0d10" roughness={0.95} metalness={0} side={DoubleSide} />
}

export function MirrorTiles({ columns, rows }: { columns: number; rows: number }) {
  const map = useMemo(() => {
    const texture = SceneTextures.mirrorTiles().clone()
    texture.repeat.set(columns / 8, rows / 8)
    texture.needsUpdate = true
    return texture
  }, [columns, rows])
  return <meshStandardMaterial map={map} roughness={0.07} metalness={1} envMapIntensity={1.7} />
}
