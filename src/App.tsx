import type { ReactNode } from 'react'
import { DebriefScreen } from './Interface/Screens/DebriefScreen'
import { FlightScreen } from './Interface/Screens/FlightScreen'
import { HangarScreen } from './Interface/Screens/HangarScreen'
import { HomeScreen } from './Interface/Screens/HomeScreen'
import { LabScreen } from './Interface/Screens/LabScreen'
import { WeekScreen } from './Interface/Screens/WeekScreen'
import { useGameStore } from './State/GameStore'
import { Screen } from './State/Screen'
import { GraphicsSupport } from './World/GraphicsSupport'
import { World } from './World/World'

function CurrentScreen(): ReactNode {
  const screen = useGameStore((state) => state.screen)
  switch (screen) {
    case Screen.Week:
      return <WeekScreen />
    case Screen.Hangar:
      return <HangarScreen />
    case Screen.Flight:
      return <FlightScreen />
    case Screen.Debrief:
      return <DebriefScreen />
    case Screen.Lab:
      return <LabScreen />
    default:
      return <HomeScreen />
  }
}

export function App() {
  const screen = useGameStore((state) => state.screen)
  return (
    <>
      <div className={`WorldLayer ${GraphicsSupport.webgl ? '' : 'IsStill'}`} aria-hidden="true">{GraphicsSupport.webgl && <World />}</div>
      <div className={`Interface On${screen}`}>
        <CurrentScreen />
      </div>
    </>
  )
}
