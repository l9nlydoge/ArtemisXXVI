import { GoesModel } from './GoesModel'
import { HubbleModel } from './HubbleModel'
import { LandsatModel } from './LandsatModel'
import { StationModel } from './StationModel'
import { WebbModel } from './WebbModel'

export function LandmarkModel({ id }: { id: string }) {
  switch (id) {
    case 'Station':
      return <StationModel />
    case 'Hubble':
      return <HubbleModel />
    case 'Landsat':
      return <LandsatModel />
    case 'Goes':
      return <GoesModel />
    case 'Webb':
      return <WebbModel />
    default:
      return null
  }
}
