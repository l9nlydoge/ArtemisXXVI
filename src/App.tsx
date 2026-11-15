import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Backdrop } from './Interface/Backdrop/Backdrop'
import { DebriefScreen } from './Interface/Screens/DebriefScreen'
import { FlightScreen } from './Interface/Screens/FlightScreen'
import { HangarScreen } from './Interface/Screens/HangarScreen'
import { HomeScreen } from './Interface/Screens/HomeScreen'
import { LabScreen } from './Interface/Screens/LabScreen'
import { LogbookScreen } from './Interface/Screens/LogbookScreen'
import { SourcesScreen } from './Interface/Screens/SourcesScreen'
import { WeekScreen } from './Interface/Screens/WeekScreen'
import { SoundLayer } from './Interface/Sound/SoundLayer'
import { useGameStore } from './State/GameStore'
import { Screen } from './State/Screen'

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
    case Screen.Logbook:
      return <LogbookScreen />
    case Screen.Sources:
      return <SourcesScreen />
    default:
      return <HomeScreen />
  }
}

export function App() {
  const screen = useGameStore((state) => state.screen)
  const viewport = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    viewport.current?.scrollTo(0, 0)
  }, [screen])

  return (
    <>
      <Backdrop />
      <div ref={viewport} className={`Interface On${screen}`}>
        <SoundLayer />
        <CurrentScreen />
      </div>
    </>
  )
}
