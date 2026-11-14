import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { CrewBoard } from '../Components/CrewBoard'
import { Ledger } from '../Components/Ledger'
import { MissionBrief } from '../Components/MissionBrief'
import { QrCode } from '../Components/QrCode'
import { Stage } from '../Components/Stage'
import { useMission } from '../UseMission'

export function HostScreen() {
  const translator = useTranslator()
  const session = useGameStore((state) => state.session)
  useGameStore((state) => state.sessionTick)
  const mission = useMission()
  if (!session?.state) return null
  const joinUrl = `${location.origin}${location.pathname}#join=${session.code}`

  return (
    <main className="HostScreen">
      <MissionBrief scenario={mission.scenario} />
      <div className="Workbench">
        <div className="WorkbenchStage">
          <Stage mission={mission} />
          <Ledger sheet={mission.sheet} detailed={[]} />
        </div>
        <div className="WorkbenchControls">
          <section className="JoinBlock">
            <QrCode value={joinUrl} label={translator.t('Host.ScanToJoin')} />
            <div>
              <p className="RoomCode">{session.code}</p>
              <p>{translator.t('Host.ScanToJoin')}</p>
              {session.sync.transport === 'Local' && <p className="Notice">{translator.t('Host.LocalOnly')}</p>}
            </div>
          </section>
          <section>
            <h2>{translator.t('Vote.Board')}</h2>
            <CrewBoard room={session.state} />
            <button type="button" className="Primary LaunchButton" disabled={!session.unanimousGo} onClick={() => void session.launch()}>
              {translator.t('Vote.LaunchNow')}
            </button>
            {!session.unanimousGo && <p className="ControlHint">{translator.t('Vote.NeedUnanimous')}</p>}
          </section>
        </div>
      </div>
    </main>
  )
}
