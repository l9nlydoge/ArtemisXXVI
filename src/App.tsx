import { lazy, Suspense, useEffect } from 'react'
import { BuildScreen } from './Interface/Screens/BuildScreen'
import { FlightScreen } from './Interface/Screens/FlightScreen'
import { HostScreen } from './Interface/Screens/HostScreen'
import { JoinScreen } from './Interface/Screens/JoinScreen'
import { ReportScreen } from './Interface/Screens/ReportScreen'
import { SourcesScreen } from './Interface/Screens/SourcesScreen'
import { StartScreen } from './Interface/Screens/StartScreen'
import { Veil } from './Interface/Veil'
import { RoleView } from './Interface/RoleView'
import { useGameStore } from './State/GameStore'
import { Screen } from './State/Screen'
import { GraphicsSupport } from './World/GraphicsSupport'

const World = lazy(() => import('./World/World'))

function CurrentScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case Screen.Menu:
      return <StartScreen />
    case Screen.Build:
      return <BuildScreen roles={RoleView.solo} />
    case Screen.Flight:
      return <FlightScreen />
    case Screen.Debrief:
      return <ReportScreen />
    case Screen.Host:
      return <HostScreen />
    case Screen.Join:
      return <JoinScreen />
    case Screen.Sources:
      return <SourcesScreen />
  }
}

export function App() {
  const screen = useGameStore((state) => state.screen)
  const language = useGameStore((state) => state.language)
  const solid = GraphicsSupport.webgl

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <>
      <div className={`WorldLayer ${solid ? '' : 'IsStill'}`}>
        {solid && (
          <Suspense fallback={null}>
            <World />
          </Suspense>
        )}
      </div>
      <div className="Interface">
        <CurrentScreen screen={screen} />
      </div>
      {solid && <Veil />}
    </>
  )
}
