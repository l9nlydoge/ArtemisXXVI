import { Center } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, Quaternion, Vector2, Vector3, type Group } from 'three'
import { AntennaShape, InstrumentShape, type Box, type InstrumentPart, type SpacecraftBlueprint, type WingPart } from '../Visuals/SpacecraftBlueprint'
import { SceneTextures } from './SceneTextures'

const centre = (box: Box): [number, number] => [box.x + box.w / 2, -(box.y + box.h / 2)]

function Foil({ repeat = 2 }: { repeat?: number }) {
  const normal = useMemo(() => {
    const texture = SceneTextures.foilNormal().clone()
    texture.repeat.set(repeat, repeat)
    texture.needsUpdate = true
    return texture
  }, [repeat])
  return <meshStandardMaterial color="#e9aa3c" metalness={0.78} roughness={0.34} normalMap={normal} normalScale={new Vector2(0.5, 0.5)} envMapIntensity={1.3} />
}

function Paint() {
  return <meshStandardMaterial color="#eef0f2" roughness={0.55} metalness={0.05} side={DoubleSide} />
}

function Metal({ dark = false }: { dark?: boolean }) {
  return <meshStandardMaterial color={dark ? '#2b2f36' : '#b9bfc8'} roughness={dark ? 0.5 : 0.28} metalness={1} />
}

function Mirror() {
  return <meshStandardMaterial color="#dfe6ee" roughness={0.06} metalness={1} envMapIntensity={1.6} />
}

function Glass() {
  return <meshStandardMaterial color="#05070c" roughness={0.04} metalness={1} envMapIntensity={2} />
}

function Rod({ from, to, radius, dark = true }: { from: [number, number, number]; to: [number, number, number]; radius: number; dark?: boolean }) {
  const key = [...from, ...to].join(',')
  const placement = useMemo(() => {
    const start = new Vector3(...from)
    const direction = new Vector3(...to).sub(start)
    const length = direction.length()
    return {
      length,
      middle: start.addScaledVector(direction, 0.5),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    }
  }, [key])
  return (
    <mesh position={placement.middle} quaternion={placement.quaternion}>
      <cylinderGeometry args={[radius, radius, placement.length, 8]} />
      <Metal dark={dark} />
    </mesh>
  )
}

function Reflector({ radius, depth }: { radius: number; depth: number }) {
  const points = useMemo(() => Array.from({ length: 17 }, (_, index) => new Vector2((radius * index) / 16, depth * Math.pow(index / 16, 2))), [radius, depth])
  const feed = depth * 1.9
  return (
    <group>
      <mesh>
        <latheGeometry args={[points, 48]} />
        <Paint />
      </mesh>
      <mesh position={[0, feed, 0]}>
        <cylinderGeometry args={[radius * 0.09, radius * 0.13, radius * 0.16, 16]} />
        <Metal />
      </mesh>
      {[0, 1, 2].map((strut) => {
        const angle = (strut / 3) * Math.PI * 2
        return <Rod key={strut} from={[Math.cos(angle) * radius * 0.92, depth * 0.85, Math.sin(angle) * radius * 0.92]} to={[0, feed, 0]} radius={radius * 0.018} />
      })}
    </group>
  )
}

function Wing({ wing, rollOut, body }: { wing: WingPart; rollOut: boolean; body: Box }) {
  const [, y] = centre(wing.box)
  const { w, h } = wing.box
  const inner = wing.side === 1 ? wing.box.x : wing.box.x + w
  const edge = (wing.side * body.w) / 2
  const thickness = Math.max(0.006, h * 0.022)
  const gap = w * 0.012
  const panel = (w - gap * (wing.panels - 1)) / wing.panels
  const cells = useMemo(() => {
    const texture = SceneTextures.solarCells().clone()
    const across = Math.max(1, Math.round((panel / h) * 3))
    texture.repeat.set(rollOut ? Math.max(2, Math.round((w / h) * 3)) : across, 3)
    texture.needsUpdate = true
    return texture
  }, [panel, h, w, rollOut])

  const sheet = (width: number, x: number, key: number) => (
    <mesh key={key} position={[x, y, 0]}>
      <boxGeometry args={[width, h, thickness]} />
      <meshStandardMaterial attach="material-0" color="#9aa1ab" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-1" color="#9aa1ab" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-2" color="#9aa1ab" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-3" color="#9aa1ab" metalness={1} roughness={0.35} />
      <meshStandardMaterial attach="material-4" map={cells} metalness={0.65} roughness={0.2} envMapIntensity={1.5} />
      <meshStandardMaterial attach="material-5" color="#b0782a" metalness={0.6} roughness={0.5} />
    </mesh>
  )

  return (
    <group>
      <Rod from={[edge, 0, 0]} to={[inner, h * 0.36, 0]} radius={h * 0.016} />
      <Rod from={[edge, 0, 0]} to={[inner, -h * 0.36, 0]} radius={h * 0.016} />
      <Rod from={[edge, 0, 0]} to={[inner, 0, 0]} radius={h * 0.022} />
      {rollOut
        ? sheet(w, wing.box.x + w / 2, 0)
        : Array.from({ length: wing.panels }, (_, index) => sheet(panel, wing.box.x + panel / 2 + index * (panel + gap), index))}
      {rollOut && (
        <mesh position={[inner, 0, 0]}>
          <cylinderGeometry args={[h * 0.07, h * 0.07, h * 1.05, 24]} />
          <Metal />
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
          <mesh position={[0, h * 0.12, 0]}>
            <cylinderGeometry args={[w * 0.38, w * 0.38, h * 0.76, 40]} />
            <Paint />
          </mesh>
          <mesh position={[0, h * 0.4, 0]}>
            <cylinderGeometry args={[w * 0.4, w * 0.4, h * 0.14, 40]} />
            <Foil repeat={3} />
          </mesh>
          <mesh position={[0, -h * 0.38, 0]}>
            <cylinderGeometry args={[w * 0.38, w * 0.48, h * 0.24, 40, 1, true]} />
            <meshStandardMaterial color="#111318" roughness={0.9} side={DoubleSide} />
          </mesh>
          <mesh position={[0, -h * 0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[w * 0.36, 40]} />
            <Glass />
          </mesh>
        </group>
      )
    case InstrumentShape.Radiator:
      return (
        <group position={[x, y, 0]}>
          <mesh>
            <boxGeometry args={[w * 0.8, h, w * 0.7]} />
            <Foil repeat={2} />
          </mesh>
          <mesh position={[-w * 0.44, 0, 0]}>
            <boxGeometry args={[w * 0.04, h * 0.85, w * 0.95]} />
            <Mirror />
          </mesh>
          <mesh position={[0, -h * 0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.4, w * 0.3]} />
            <Glass />
          </mesh>
        </group>
      )
    case InstrumentShape.Dish:
      return (
        <group position={[x, y + h / 2, 0]} rotation={[Math.PI, 0, 0]}>
          <Reflector radius={w / 2} depth={h * 0.42} />
        </group>
      )
    case InstrumentShape.Panel:
      return (
        <group position={[x, y, 0]}>
          <mesh>
            <boxGeometry args={[w, h, h * 0.1]} />
            <Paint />
          </mesh>
          <mesh position={[0, 0, -h * 0.07]}>
            <boxGeometry args={[w * 0.98, h * 0.9, h * 0.05]} />
            <Foil repeat={6} />
          </mesh>
          <Rod from={[0, h / 2, 0]} to={[0, h * 1.5, 0]} radius={h * 0.05} />
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
          <Rod from={[-size * 0.2, 0, 0]} to={[-size * 0.5, size, 0]} radius={size * 0.012} dark={false} />
          <Rod from={[size * 0.2, 0, 0]} to={[size * 0.5, size, 0]} radius={size * 0.012} dark={false} />
        </group>
      )
    case AntennaShape.Patch:
      return (
        <mesh position={[x, base + size * 0.05, 0]}>
          <boxGeometry args={[size, size * 0.1, size]} />
          <Paint />
        </mesh>
      )
    case AntennaShape.Dish:
      return (
        <group position={[x, base, 0]}>
          <Rod from={[0, 0, 0]} to={[0, size * 0.32, 0]} radius={size * 0.05} dark={false} />
          <group position={[0, size * 0.32, 0]} rotation={[0.35, 0, -0.3]}>
            <Reflector radius={size / 2} depth={size * 0.16} />
          </group>
        </group>
      )
    case AntennaShape.Laser:
      return (
        <group position={[x, base, 0]}>
          <mesh position={[0, size * 0.3, 0]}>
            <cylinderGeometry args={[size * 0.22, size * 0.22, size * 0.6, 28]} />
            <Metal />
          </mesh>
          <mesh position={[0, size * 0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[size * 0.18, 28]} />
            <Glass />
          </mesh>
        </group>
      )
  }
}

function Bus({ body, depth, shielded }: { body: Box; depth: number; shielded: boolean }) {
  const { w, h } = body
  const nozzle = w * 0.07
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, depth]} />
        <Foil repeat={Math.max(2, Math.round(h / w) * 2)} />
      </mesh>
      <mesh position={[0, h * 0.08, depth / 2 + w * 0.006]}>
        <boxGeometry args={[w * 0.7, h * 0.5, w * 0.012]} />
        <Mirror />
      </mesh>
      <mesh position={[0, -h * 0.05, -depth / 2 - w * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[w * 0.36, w * 0.36, w * 0.06, 40, 1, true]} />
        <Metal />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * w * 0.3, h / 2 + w * 0.07, -depth * 0.3]}>
          <cylinderGeometry args={[w * 0.05, w * 0.06, w * 0.14, 16]} />
          <Metal dark />
        </mesh>
      ))}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}${z}`} position={[x * (w / 2 - nozzle), h / 2 + nozzle * 0.4, z * (depth / 2 - nozzle)]} rotation={[0, 0, x * 0.5]}>
          <coneGeometry args={[nozzle * 0.6, nozzle * 1.1, 14, 1, true]} />
          <Metal dark />
        </mesh>
      )))}
      {shielded && (
        <mesh>
          <boxGeometry args={[w * 1.07, h * 1.04, depth * 1.07]} />
          <meshStandardMaterial color="#c9ced6" metalness={1} roughness={0.22} transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
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
        <Bus body={body} depth={depth} shielded={blueprint.shielded} />
        {blueprint.wings.map((wing) => <Wing key={wing.side} wing={wing} rollOut={blueprint.rollOut} body={body} />)}
        {blueprint.instruments.map((part) => <Instrument key={part.id} part={part} />)}
        <Antenna shape={blueprint.antenna.shape} box={blueprint.antenna.box} />
      </Center>
    </group>
  )
}
