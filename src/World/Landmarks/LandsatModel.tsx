import { useMemo } from 'react'
import { Catalog } from '../../Engine/Catalog/Catalog'
import { MissionDesign } from '../../Engine/Design/MissionDesign'
import { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { SpacecraftBlueprint } from '../Spacecraft/SpacecraftBlueprint'
import { SpacecraftModel } from '../Spacecraft/SpacecraftModel'

export function LandsatModel() {
  const blueprint = useMemo(() => {
    const design = new MissionDesign({
      Science: { instrumentIds: ['LandsatImager', 'ThermalImager'], designLifeYears: 5 },
      Spacecraft: { busId: 'Large', arrayTypeId: 'Rigid', arrayAreaM2: 9, batteryWh: 4000, shielded: false },
      Operations: { orbitId: 'Sso705', commsId: 'XBand', groundStations: 5 },
      Program: { launchVehicleId: 'Falcon9', copies: 1 },
    })
    return new SpacecraftBlueprint(new ResolvedDesign(design, Catalog.shared.scenarios.get('CropWatch')))
  }, [])
  return <SpacecraftModel blueprint={blueprint} detailed={false} />
}
