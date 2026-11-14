import { useEffect } from 'react'
import { useGameStore } from './State/GameStore'
import { Screen } from './State/Screen'
import { BuildScreen } from './UI/Screens/BuildScreen'
import { DebriefScreen } from './UI/Screens/DebriefScreen'
import { FlightScreen } from './UI/Screens/FlightScreen'
import { HostScreen } from './UI/Screens/HostScreen'
import { JoinScreen } from './UI/Screens/JoinScreen'
import { MenuScreen } from './UI/Screens/MenuScreen'
import { RoleView } from './UI/RoleView'

export function App() {
  const screen = useGameStore((state) => state.screen)
  const language = useGameStore((state) => state.language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    document.body.dataset.theme = screen === Screen.Flight || screen === Screen.Debrief ? 'Space' : 'CleanRoom'
  }, [screen])

  switch (screen) {
    case Screen.Menu:
      return <MenuScreen />
    case Screen.Build:
      return <BuildScreen roles={RoleView.solo} />
    case Screen.Flight:
      return <FlightScreen />
    case Screen.Debrief:
      return <DebriefScreen />
    case Screen.Host:
      return <HostScreen />
    case Screen.Join:
      return <JoinScreen />
  }
}
