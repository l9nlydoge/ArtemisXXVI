import { useState } from 'react'
import { AllRoles } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { VotePanel } from '../Components/VotePanel'
import { RoleView } from '../RoleView'
import { useBudgetSheet } from '../UseBudgetSheet'
import { BuildScreen } from './BuildScreen'

export function JoinScreen() {
  const translator = useTranslator()
  const { session, claimRole } = useGameStore()
  useGameStore((state) => state.sessionTick)
  const sheet = useBudgetSheet()
  const [name, setName] = useState('')
  if (!session) return null
  if (!session.state) return <main className="JoinScreen"><p>{translator.t('Join.NotFound')}</p></main>

  const role = session.role
  if (!role) {
    return (
      <main className="JoinScreen">
        <h1>{translator.t('Join.PickRole')}</h1>
        <label className="Field">
          <span className="FieldLabel">{translator.t('Join.YourName')}</span>
          <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="RoleGrid">
          {AllRoles.map((option) => (
            <button key={option} type="button" disabled={!session.isSeatFree(option) || !name.trim()} onClick={() => void claimRole(option, name.trim())}>
              {translator.t(`Role.${option}`)}
              {!session.isSeatFree(option) && <small>{translator.t('Join.Taken')}</small>}
            </button>
          ))}
        </div>
      </main>
    )
  }

  const owned = RoleView.detailedBudgets([role])
  return (
    <BuildScreen
      roles={[role]}
      footer={<VotePanel ownBudgets={sheet.all.filter((budget) => owned.includes(budget.kind))} current={session.state.ballots?.[role]} onVote={(ballot) => void session.vote(ballot)} />}
    />
  )
}
