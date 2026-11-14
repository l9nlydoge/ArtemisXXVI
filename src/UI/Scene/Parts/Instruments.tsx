import { useMemo } from 'react'
import { InstrumentShape, type InstrumentPart } from '../../Visuals/SpacecraftBlueprint'
import { BlanketGeometry } from '../BlanketGeometry'
import { Cable, Reflector, Rod } from './Hardware'
import { Aluminium, Baffle, Foil, Glass, MirrorTiles, Paint } from './Materials'

interface PartProps {
  width: number
  height: number
  detailed: boolean
}

function Telescope({ width: w, height: h, detailed }: PartProps) {
  const radius = w * 0.38
  const wrap = useMemo(() => BlanketGeometry.cylinder(radius * 1.04, h * 0.26), [radius, h])
  const top = h / 2
  return (
    <group>
      <mesh position={[0, top - h * 0.36, 0]}>
        <cylinderGeometry args={[radius, radius, h * 0.72, 64, 1, true]} />
        <Paint />
      </mesh>
      <mesh position={[0, top - h * 0.13, 0]} geometry={wrap}>
        <Foil repeat={4} />
      </mesh>
      {[0.3, 0.52, 0.72].map((level) => (
        <mesh key={level} position={[0, top - h * level, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.01, radius * 0.03, 8, 64]} />
          <Aluminium />
        </mesh>
      ))}
      <mesh position={[0, top - h * 0.86, 0]}>
        <cylinderGeometry args={[radius * 1.05, radius * 1.22, h * 0.28, 64, 1, true]} />
        <Baffle />
      </mesh>
      <mesh position={[0, top - h * 0.86, 0]}>
        <cylinderGeometry args={[radius * 1.07, radius * 1.24, h * 0.28, 64, 1, true]} />
        <Paint />
      </mesh>
      {detailed && [0.76, 0.84, 0.92].map((level, index) => (
        <mesh key={level} position={[0, top - h * level, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * (0.72 + index * 0.07), radius * (1.06 + index * 0.05), 64]} />
          <Baffle />
        </mesh>
      ))}
      <mesh position={[0, top - h * 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.98, 64]} />
        <Glass />
      </mesh>
      <group position={[radius * 1.24, top - h, 0]} rotation={[0, 0, 0.5]}>
        <mesh position={[radius * 1.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 1.2, radius * 1.2, radius * 0.05, 64]} />
          <Paint />
        </mesh>
      </group>
      {detailed && (
        <>
          <mesh position={[-radius * 1.12, top - h * 0.42, 0]}>
            <boxGeometry args={[radius * 0.22, h * 0.3, radius * 0.9]} />
            <MirrorTiles columns={4} rows={6} />
          </mesh>
          <mesh position={[0, top - h * 0.4, radius * 1.1]}>
            <boxGeometry args={[radius * 0.8, h * 0.16, radius * 0.3]} />
            <Foil tone="Black" repeat={2} />
          </mesh>
          <Cable radius={radius * 0.035} points={[[0, top - h * 0.33, radius * 1.2], [radius * 0.5, top - h * 0.15, radius * 1.15], [radius * 0.6, top, radius * 0.9]]} />
          {[0, 1, 2].flatMap((leg) => {
            const angle = (leg / 3) * Math.PI * 2 + 0.5
            const foot: [number, number, number] = [Math.cos(angle) * radius * 1.02, top - h * 0.3, Math.sin(angle) * radius * 1.02]
            return [-0.5, 0.5].map((spread) => (
              <Rod key={`${leg}${spread}`} from={foot} to={[Math.cos(angle + spread) * radius * 1.5, top + h * 0.02, Math.sin(angle + spread) * radius * 1.5]} radius={radius * 0.03} />
            ))
          })}
        </>
      )}
    </group>
  )
}

function ThermalSensor({ width: w, height: h, detailed }: PartProps) {
  const wrap = useMemo(() => BlanketGeometry.box(w * 0.78, h * 0.9, w * 0.7, 5), [w, h])
  return (
    <group>
      <mesh geometry={wrap} position={[0, h * 0.05, 0]}>
        <Foil repeat={3} />
      </mesh>
      {[0, 1, 2].map((fin) => (
        <mesh key={fin} position={[-w * (0.44 + fin * 0.05), h * (0.08 - fin * 0.06), 0]} rotation={[0, 0, 0.25 + fin * 0.12]}>
          <boxGeometry args={[w * 0.02, h * (0.8 - fin * 0.12), w * (0.92 - fin * 0.08)]} />
          <MirrorTiles columns={6} rows={8} />
        </mesh>
      ))}
      <mesh position={[w * 0.08, -h * 0.47, 0]}>
        <cylinderGeometry args={[w * 0.2, w * 0.25, h * 0.14, 40, 1, true]} />
        <Baffle />
      </mesh>
      <mesh position={[w * 0.08, -h * 0.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[w * 0.19, 40]} />
        <Glass />
      </mesh>
      {detailed && (
        <>
          <mesh position={[w * 0.3, h * 0.2, w * 0.38]}>
            <boxGeometry args={[w * 0.22, h * 0.3, w * 0.08]} />
            <Aluminium />
          </mesh>
          <Cable radius={w * 0.016} points={[[w * 0.3, h * 0.34, w * 0.4], [w * 0.2, h * 0.5, w * 0.38], [w * 0.05, h * 0.56, w * 0.2]]} />
        </>
      )}
    </group>
  )
}

function Radiometer({ width: w, height: h, detailed }: PartProps) {
  return (
    <group>
      <mesh position={[0, h * 0.34, 0]}>
        <boxGeometry args={[w * 0.5, h * 0.3, w * 0.5]} />
        <Foil repeat={2} />
      </mesh>
      <Rod from={[0, h * 0.2, 0]} to={[0, -h * 0.02, 0]} radius={w * 0.05} material={<Aluminium />} />
      <group position={[0, -h * 0.5, 0]} rotation={[0.25, 0, 0]}>
        <Reflector radius={w / 2} depth={h * 0.22} detailed={detailed} />
      </group>
    </group>
  )
}

function RadarAntenna({ width: w, height: h, detailed }: PartProps) {
  const tiles = 8
  const tile = w / tiles
  return (
    <group>
      {Array.from({ length: tiles }, (_, index) => (
        <group key={index} position={[-w / 2 + tile / 2 + index * tile, 0, 0]}>
          <mesh>
            <boxGeometry args={[tile * 0.97, h, h * 0.08]} />
            <meshStandardMaterial attach="material-0" color="#aeb4bd" metalness={1} roughness={0.3} />
            <meshStandardMaterial attach="material-1" color="#aeb4bd" metalness={1} roughness={0.3} />
            <meshStandardMaterial attach="material-2" color="#aeb4bd" metalness={1} roughness={0.3} />
            <meshStandardMaterial attach="material-3" color="#aeb4bd" metalness={1} roughness={0.3} />
            <meshStandardMaterial attach="material-4" color="#eceef1" roughness={0.6} />
            <meshStandardMaterial attach="material-5" color="#e8a838" metalness={0.9} roughness={0.28} />
          </mesh>
        </group>
      ))}
      {detailed && Array.from({ length: tiles - 1 }, (_, index) => {
        const x = -w / 2 + (index + 1) * tile
        return <Rod key={index} from={[x, h * 0.45, -h * 0.1]} to={[x + tile * (index % 2 ? 0.9 : -0.9), -h * 0.45, -h * 0.3]} radius={h * 0.018} />
      })}
      <Rod from={[-w * 0.45, 0, -h * 0.32]} to={[w * 0.45, 0, -h * 0.32]} radius={h * 0.03} />
      {[-0.18, 0.18].map((offset) => (
        <Rod key={offset} from={[w * offset, 0, -h * 0.3]} to={[w * offset * 0.4, h * 1.5, 0]} radius={h * 0.035} />
      ))}
    </group>
  )
}

export function Instrument({ part, detailed }: { part: InstrumentPart; detailed: boolean }) {
  const { x, y, w, h } = part.box
  const props = { width: w, height: h, detailed }
  return (
    <group position={[x + w / 2, -(y + h / 2), 0]}>
      {part.shape === InstrumentShape.Telescope && <Telescope {...props} />}
      {part.shape === InstrumentShape.Radiator && <ThermalSensor {...props} />}
      {part.shape === InstrumentShape.Dish && <Radiometer {...props} />}
      {part.shape === InstrumentShape.Panel && <RadarAntenna {...props} />}
    </group>
  )
}
