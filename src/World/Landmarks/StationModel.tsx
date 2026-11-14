import { Rod } from '../Spacecraft/Parts/Hardware'
import { Aluminium, Foil, Paint } from '../Spacecraft/Parts/Materials'
import { PanelSheet } from './PanelSheet'

function Module({ position, length, radius, along = 'Z', wrapped = false }: { position: [number, number, number]; length: number; radius: number; along?: 'X' | 'Z'; wrapped?: boolean }) {
  return (
    <group position={position} rotation={along === 'Z' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 28]} />
        {wrapped ? <Foil tone="Silver" repeat={3} /> : <Paint />}
      </mesh>
      {[-0.5, 0.5].map((end) => (
        <mesh key={end} position={[0, end * length, 0]}>
          <cylinderGeometry args={[radius * 0.72, radius * 0.72, radius * 0.5, 20]} />
          <Aluminium />
        </mesh>
      ))}
    </group>
  )
}

export function StationModel() {
  const wingStations = [-0.46, -0.33, 0.33, 0.46]
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.95, 0.026, 0.03]} />
        <Aluminium dark />
      </mesh>
      {Array.from({ length: 18 }, (_, bay) => -0.45 + bay * 0.053).map((x, bay) => (
        <Rod key={x} from={[x, -0.014, bay % 2 ? -0.016 : 0.016]} to={[x + 0.053, 0.014, bay % 2 ? 0.016 : -0.016]} radius={0.0022} material={<Aluminium />} />
      ))}

      {wingStations.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Rod from={[0, 0, -0.33]} to={[0, 0, 0.33]} radius={0.004} material={<Aluminium />} />
          {[-1, 1].map((side) => (
            <PanelSheet key={side} position={[0, 0, side * 0.185]} size={[0.105, 0.003, 0.3]} tiles={[2, 6]} />
          ))}
        </group>
      ))}

      {[-0.15, 0.15].map((x) => (
        <group key={x} position={[x, -0.004, -0.12]}>
          {[-0.034, 0, 0.034].map((offset) => (
            <mesh key={offset} position={[offset, 0, 0]}>
              <boxGeometry args={[0.03, 0.002, 0.2]} />
              <Paint />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.02, 0.07]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.03, 0.002, 0.12]} />
          <Paint />
        </mesh>
      ))}

      <group position={[0, -0.04, 0]}>
        <Module position={[0, 0, -0.26]} length={0.12} radius={0.019} wrapped />
        <Module position={[0, 0, -0.13]} length={0.115} radius={0.019} wrapped />
        <Module position={[0, 0, -0.035]} length={0.05} radius={0.02} />
        <Module position={[0, 0, 0.045]} length={0.08} radius={0.02} />
        <Module position={[0, 0, 0.125]} length={0.06} radius={0.02} />
        <Module position={[0.07, 0, 0.125]} length={0.065} radius={0.02} along="X" />
        <Module position={[-0.085, 0, 0.125]} length={0.1} radius={0.02} along="X" />
        <Module position={[0.055, 0, -0.035]} length={0.06} radius={0.019} along="X" />
        <Module position={[-0.05, 0, -0.035]} length={0.05} radius={0.017} along="X" />
        <mesh position={[-0.15, -0.012, 0.16]}>
          <boxGeometry args={[0.05, 0.008, 0.05]} />
          <Aluminium />
        </mesh>
        {[-0.26, -0.13].map((z) => [-1, 1].map((side) => (
          <PanelSheet key={`${z}${side}`} position={[side * 0.085, 0, z]} size={[0.11, 0.002, 0.028]} tiles={[4, 1]} back="#8f96a1" />
        )))}
        <mesh position={[0, 0, -0.345]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.014, 0.05, 20]} />
          <Paint />
        </mesh>
        <mesh position={[0, -0.035, 0.125]}>
          <coneGeometry args={[0.016, 0.045, 20]} />
          <Paint />
        </mesh>
      </group>
    </group>
  )
}
