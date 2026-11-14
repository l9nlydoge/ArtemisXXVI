import { useState } from 'react'
import { AllRoles } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { useMission } from '../../State/UseMission'
import { RoleView } from '../RoleView'
import { VotePanel } from '../Team/VotePanel'
import { BuildScreen } from './BuildScreen'

export function JoinScreen() {
  const translator = useTranslator()
  const { session, claimRole, backToMenu } = useGameStore()
  useGameStore((state) => state.sessionTick)
  const { sheet } = useMission()
  const [name, setName] = useState('')
  if (!session) return null

  if (!session.state) {
    return (
      <main>
        <section className="RolePick Panel">
          <h1>{translator.t('Join.NotFound')}</h1>
          <button type="button" onClick={backToMenu}>{translator.t('Build.Back')}</button>
        </section>
      </main>
    )
  }

  const role = session.role
  if (!role) {
    return (
      <main>
        <section className="RolePick Panel">
          <h1>{translator.t('Join.PickRole')}</h1>
          <label htmlFor="PlayerNameInput">{translator.t('Join.YourName')}</label>
          <input id="PlayerNameInput" value={name} maxLength={20} autoComplete="given-name" onChange={(event) => setName(event.target.value)} />
          <ul className="RoleList">
            {AllRoles.map((option) => {
              const free = session.isSeatFree(option)
              return (
                <li key={option}>
                  <button type="button" disabled={!free || !name.trim()} onClick={() => void claimRole(option, name.trim())}>
                    <strong>{translator.t(`Role.${option}`)}</strong>
                    <span>{free ? translator.t(`Owns.${option}`) : translator.t('Join.Taken')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    )
  }

  const owned = RoleView.detailedBudgets([role])
  return (
    <BuildScreen
      roles={[role]}
      actions={<VotePanel ownBudgets={sheet.all.filter((budget) => owned.includes(budget.kind))} current={session.state.ballots?.[role]} onVote={(ballot) => void session.vote(ballot)} />}
    />
  )
}
