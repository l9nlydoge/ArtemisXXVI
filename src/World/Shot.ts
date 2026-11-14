import { Screen } from '../State/Screen'
import { CameraView } from './CameraView'

export enum Shot {
  Start = 'Start',
  Visit = 'Visit',
  Dock = 'Dock',
  Chase = 'Chase',
  Wide = 'Wide',
  Report = 'Report',
}

export class ShotList {
  static for(screen: Screen, flightView: CameraView, touring: boolean): Shot {
    switch (screen) {
      case Screen.Menu:
        return touring ? Shot.Visit : Shot.Start
      case Screen.Flight:
        return flightView === CameraView.Chase ? Shot.Chase : Shot.Wide
      case Screen.Debrief:
        return Shot.Report
      default:
        return Shot.Dock
    }
  }

  static isAirborne(shot: Shot): boolean {
    return shot === Shot.Chase || shot === Shot.Wide || shot === Shot.Report
  }
}
