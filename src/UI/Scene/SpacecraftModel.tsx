import { Center, Edges } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, Vector2, type Group } from 'three'
import { AntennaShape, InstrumentShape, type Box, type InstrumentPart, type SpacecraftBlueprint, type WingPart } from '../Visuals/SpacecraftBlueprint'
import { Palette } from './Palette'
import { SceneTextures } from './SceneTextures'

const centre = (box: Box): [number, number] => [box.x + box.w / 2, -(box.y + box.h / 2)]

function Outline() {
  return <Edges color={Palette.Ink} threshold={20} />
}

function Paint({ color = Palette.White }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} side={DoubleSide} />
}

function Paraboloid({ radius, depth }: { radius: number; depth: number }) {
  const points = useMemo(() => Array.from({ length: 13 }, (_, index) => new Vector2((radius * index) / 12, depth * Math.pow(index / 12, 2))), [radius, depth])
  return (
    <mesh>
      <latheGeometry args={[points, 40]} />
      <Paint />
    </mesh>
  )
}

function Wing({ wing, rollOut, depth }: { wing: WingPart; rollOut: boolean; depth: number }) {
  const [x, y] = centre(wing.box)
  const root = wing.side === 1 ? wing.box.x : wing.box.x + wing.box.w
  const texture = useMemo(() => {
    const cells = SceneTextures.solarCells().clone()
    cells.repeat.set(wing.panels * 2, 3)
    cells.needsUpdate = true
    return cells
  }, [wing.panels])
  const strut = Math.abs(root)
  return (
    <group>
      <mesh position={[(root * 0.5), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[wing.box.h * 0.03, wing.box.h * 0.03, strut, 10]} />
        <Paint color={Palette.Ink} />
      </mesh>
      <mesh position={[x, y, 0]}>
        <boxGeometry args={[wing.box.w, wing.box.h, Math.max(0.006, depth * 0.03)]} />
        {rollOut ? <meshStandardMaterial color={Palette.CellLight} roughness={0.4} metalness={0.2} /> : <meshStandardMaterial map={texture} roughness={0.35} metalness={0.25} />}
        <Outline />
      </mesh>
      {rollOut && (
        <mesh position={[root, 0, 0]}>
          <cylinderGeometry args={[wing.box.h * 0.12, wing.box.h * 0.12, wing.box.h * 1.04, 20]} />
          <Paint />
        </mesh>
      )}
    </group>
  )
}

function Instrument({ part }: { part: InstrumentPart }) {
  const [x, y] = centre(part.box)
  const { w, h } = part.box
  switch (part.shape) {
    case InstrumentShape.Telescope:
      return (
        <group position={[x, y, 0]}>
          <mesh position={[0, h * 0.09, 0]}>
            <cylinderGeometry args={[w * 0.38, w * 0.38, h * 0.82, 32]} />
            <Paint />
          </mesh>
          <mesh position={[0, -h * 0.41, 0]}>
            <cylinderGeometry args={[w * 0.38, w * 0.5, h * 0.18, 32, 1, true]} />
            <Paint color={Palette.Ink} />
          </mesh>
        </group>
      )
    case InstrumentShape.Radiator:
      return (
        <group position={[x, y, 0]}>
          <mesh>
            <boxGeometry args={[w * 0.8, h, w * 0.7]} />
            <Paint />
            <Outline />
          </mesh>
          <mesh position={[-w * 0.47, 0, 0]}>
            <boxGeometry args={[w * 0.06, h * 0.75, w * 0.9]} />
            <meshStandardMaterial color="#cfd6dc" roughness={0.25} metalness={0.7} />
          </mesh>
        </group>
      )
    case InstrumentShape.Dish:
      return (
        <group position={[x, y - h / 2, 0]}>
          <Paraboloid radius={w / 2} depth={h * 0.8} />
          <mesh position={[0, h * 0.75, 0]}>
            <cylinderGeometry args={[w * 0.03, w * 0.03, h * 0.5, 8]} />
            <Paint color={Palette.Ink} />
          </mesh>
        </group>
      )
    case InstrumentShape.Panel:
      return (
        <group position={[x, y, 0]}>
          <mesh>
            <boxGeometry args={[w, h, h * 0.12]} />
            <Paint />
            <Outline />
          </mesh>
          <mesh position={[0, h * 0.9, 0]}>
            <cylinderGeometry args={[h * 0.05, h * 0.05, h * 0.9, 8]} />
            <Paint color={Palette.Ink} />
          </mesh>
        </group>
      )
  }
}

function Antenna({ shape, box }: { shape: AntennaShape; box: Box }) {
  const [x] = centre(box)
  const base = -(box.y + box.h)
  const size = box.w
  switch (shape) {
    case AntennaShape.Whip:
      return (
        <group position={[x, base, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * size * 0.25, size * 0.5, 0]} rotation={[0, 0, -side * 0.35]}>
              <cylinderGeometry args={[size * 0.015, size * 0.015, size * 1.05, 6]} />
              <Paint color={Palette.Ink} />
            </mesh>
          ))}
        </group>
      )
    case AntennaShape.Patch:
      return (
        <mesh position={[x, base + size * 0.08, 0]}>
          <boxGeometry args={[size, size * 0.16, size]} />
          <Paint />
          <Outline />
        </mesh>
      )
    case AntennaShape.Dish:
      return (
        <group position={[x, base, 0]}>
          <mesh position={[0, size * 0.2, 0]}>
            <cylinderGeometry args={[size * 0.04, size * 0.04, size * 0.4, 8]} />
            <Paint color={Palette.Ink} />
          </mesh>
          <group position={[0, size * 0.4, 0]}>
            <Paraboloid radius={size / 2} depth={size * 0.3} />
          </group>
        </group>
      )
    case AntennaShape.Laser:
      return (
        <group position={[x, base, 0]}>
          <mesh position={[0, size * 0.3, 0]}>
            <cylinderGeometry args={[size * 0.22, size * 0.22, size * 0.6, 20]} />
            <Paint />
          </mesh>
          <mesh position={[0, size * 0.62, 0]}>
            <sphereGeometry args={[size * 0.16, 16, 12]} />
            <meshStandardMaterial color={Palette.Lost} emissive={Palette.Lost} emissiveIntensity={1.4} />
          </mesh>
        </group>
      )
  }
}

interface SpacecraftModelProps {
  blueprint: SpacecraftBlueprint
  shadows?: boolean
}

export function SpacecraftModel({ blueprint, shadows = false }: SpacecraftModelProps) {
  const group = useRef<Group>(null)
  const { body } = blueprint
  const depth = body.w * 0.9
  const extent = Math.max(blueprint.spanM, blueprint.bounds.h * 0.62)

  useLayoutEffect(() => {
    group.current?.traverse((object) => {
      object.castShadow = shadows
      object.receiveShadow = shadows
    })
  })

  return (
    <group ref={group} scale={1 / extent}>
      <Center>
        <mesh>
          <boxGeometry args={[body.w, body.h, depth]} />
          <meshStandardMaterial color={Palette.Foil} roughness={0.42} metalness={0.45} />
          <Outline />
        </mesh>
        {blueprint.shielded && (
          <mesh>
            <boxGeometry args={[body.w * 1.1, body.h * 1.06, depth * 1.1]} />
            <meshStandardMaterial color={Palette.White} transparent opacity={0.16} roughness={0.2} />
            <Outline />
          </mesh>
        )}
        {blueprint.wings.map((wing) => <Wing key={wing.side} wing={wing} rollOut={blueprint.rollOut} depth={depth} />)}
        {blueprint.instruments.map((part) => <Instrument key={part.id} part={part} />)}
        <Antenna shape={blueprint.antenna.shape} box={blueprint.antenna.box} />
      </Center>
    </group>
  )
}
