import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { BallotBoard } from '../Components/BallotBoard'
import { BudgetBoard } from '../Components/BudgetBoard'
import { QrCode } from '../Components/QrCode'
import { ScenarioHeader } from '../Components/ScenarioHeader'
import { useBudgetSheet } from '../UseBudgetSheet'

export function HostScreen() {
  const translator = useTranslator()
  const session = useGameStore((state) => state.session)
  useGameStore((state) => state.sessionTick)
  const sheet = useBudgetSheet()
  if (!session?.state) return null
  const joinUrl = `${location.origin}${location.pathname}#join=${session.code}`

  return (
    <main className="HostScreen">
      <ScenarioHeader />
      <div className="HostLayout">
        <section className="JoinCard">
          <QrCode value={joinUrl} label={translator.t('Host.ScanToJoin')} />
          <p className="RoomCode Numeric">{session.code}</p>
          <p>{translator.t('Host.ScanToJoin')}</p>
          <small>{session.sync.transport}</small>
        </section>
        <section>
          <h2>{translator.t('Vote.Board')}</h2>
          <BallotBoard room={session.state} />
          <button type="button" className="Primary LaunchButton" disabled={!session.unanimousGo} onClick={() => void session.launch()}>
            {translator.t('Vote.LaunchNow')}
          </button>
          {!session.unanimousGo && <p className="Hint">{translator.t('Vote.NeedUnanimous')}</p>}
        </section>
        <BudgetBoard sheet={sheet} detailed={[]} />
      </div>
    </main>
  )
}
