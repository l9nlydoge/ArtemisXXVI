import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { useMission } from '../../State/UseMission'
import { GraphicsSupport } from '../../World/GraphicsSupport'
import { SpacecraftDrawing } from '../Diagrams/SpacecraftDrawing'
import { CraftFacts } from '../Readouts/CraftFacts'
import { Ledger } from '../Readouts/Ledger'
import { MissionBrief } from '../Readouts/MissionBrief'
import { CrewBoard } from '../Team/CrewBoard'
import { QrCode } from '../Team/QrCode'

export function HostScreen() {
  const translator = useTranslator()
  const session = useGameStore((state) => state.session)
  const backToMenu = useGameStore((state) => state.backToMenu)
  useGameStore((state) => state.sessionTick)
  const mission = useMission()
  if (!session?.state) return null
  const joinUrl = `${location.origin}${location.pathname}#join=${session.code}`

  return (
    <main className="DockScreen">
      <section className="BriefPanel Panel">
        <MissionBrief scenario={mission.scenario} />
      </section>

      <div className="Window">
        {!GraphicsSupport.webgl && <SpacecraftDrawing design={mission.resolved} label={translator.t('Stage.Spacecraft')} />}
      </div>

      <section className="StatusPanel Panel">
        <CraftFacts mission={mission} />
        <Ledger sheet={mission.sheet} detailed={[]} />
      </section>

      <aside className="ControlPanel Panel">
        <div className="ControlScroll">
          <div className="JoinBlock">
            <QrCode value={joinUrl} label={translator.t('Host.ScanToJoin')} />
            <div>
              <p className="RoomCode">{session.code}</p>
              <p>{translator.t('Host.ScanToJoin')}</p>
              {session.sync.transport === 'Local' && <p className="Notice">{translator.t('Host.LocalOnly')}</p>}
            </div>
          </div>
          <h2>{translator.t('Vote.Board')}</h2>
          <CrewBoard room={session.state} />
        </div>
        <footer className="ControlFooter">
          <span className="Hint">{session.unanimousGo ? '' : translator.t('Vote.NeedUnanimous')}</span>
          <div className="Actions">
            <button type="button" className="Quiet" onClick={backToMenu}>{translator.t('Build.Back')}</button>
            <button type="button" className="Launch" disabled={!session.unanimousGo} onClick={() => void session.launch()}>
              {translator.t('Vote.LaunchNow')}
            </button>
          </div>
        </footer>
      </aside>
    </main>
  )
}
