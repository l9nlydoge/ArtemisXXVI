import { HomeScreen } from './Interface/Screens/HomeScreen'
import { GraphicsSupport } from './World/GraphicsSupport'
import { World } from './World/World'

export function App() {
  return (
    <>
      <div className="WorldLayer" aria-hidden="true">{GraphicsSupport.webgl && <World />}</div>
      <div className="Interface">
        <HomeScreen />
      </div>
    </>
  )
}
