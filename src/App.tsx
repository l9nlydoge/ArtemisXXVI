import type { ReactNode } from 'react'
import { HomeScreen } from './Interface/Screens/HomeScreen'
import { useGameStore } from './State/GameStore'
import { GraphicsSupport } from './World/GraphicsSupport'
import { World } from './World/World'

function CurrentScreen(): ReactNode {
  const screen = useGameStore((state) => state.screen)
  switch (screen) {
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
