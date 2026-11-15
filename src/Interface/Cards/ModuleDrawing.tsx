import type { CSSProperties } from 'react'

const SpriteOrder = [
  'SolarArray',
  'Battery',
  'Camera',
  'Spectrometer',
  'Radar',
  'ParticleDetector',
  'HighEnergyDetector',
  'RadiationShielding',
  'MagneticShield',
  'FlightComputer',
  'Thrusters',
  'Antenna',
  'RepairDrone',
  'CrewCapsule',
]

const SheetUrl = `url("${import.meta.env.BASE_URL}Art/ModuleSprites.png")`

export function ModuleDrawing({ moduleId }: { moduleId: string }) {
  const index = SpriteOrder.indexOf(moduleId)
  const style = index < 0 ? undefined : ({ '--Sprite': index, backgroundImage: SheetUrl } as CSSProperties)
  return <span className="ModuleDrawing" style={style} aria-hidden="true" />
}
