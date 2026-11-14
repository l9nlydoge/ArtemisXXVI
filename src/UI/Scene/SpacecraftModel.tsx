import { Center } from '@react-three/drei'
import { useLayoutEffect, useRef } from 'react'
import type { Group } from 'three'
import type { SpacecraftBlueprint } from '../Visuals/SpacecraftBlueprint'
import { Antenna } from './Parts/Antenna'
import { Bus } from './Parts/Bus'
import { Instrument } from './Parts/Instruments'
import { SolarWing } from './Parts/SolarWing'

interface SpacecraftModelProps {
  blueprint: SpacecraftBlueprint
  shadows?: boolean
  detailed?: boolean
}

export function SpacecraftModel({ blueprint, shadows = false, detailed = true }: SpacecraftModelProps) {
  const group = useRef<Group>(null)
  const { body } = blueprint
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
        <Bus width={body.w} height={body.h} depth={body.w * 0.9} shielded={blueprint.shielded} detailed={detailed} />
        {blueprint.wings.map((wing) => <SolarWing key={wing.side} wing={wing} rollOut={blueprint.rollOut} bodyWidth={body.w} detailed={detailed} />)}
        {blueprint.instruments.map((part) => <Instrument key={part.id} part={part} detailed={detailed} />)}
        <Antenna shape={blueprint.antenna.shape} box={blueprint.antenna.box} detailed={detailed} />
      </Center>
    </group>
  )
}
