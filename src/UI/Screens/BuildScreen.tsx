import type { ReactNode } from 'react'
import type { Role } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { BudgetBoard } from '../Components/BudgetBoard'
import { RolePanel } from '../Components/RolePanel'
import { ScenarioHeader } from '../Components/ScenarioHeader'
import { RoleView } from '../RoleView'
import { useBudgetSheet } from '../UseBudgetSheet'

interface BuildScreenProps {
  roles: readonly Role[]
  footer?: ReactNode
}

export function BuildScreen({ roles, footer }: BuildScreenProps) {
  const translator = useTranslator()
  const { launch, backToMenu, session } = useGameStore()
  const sheet = useBudgetSheet()

  return (
    <main className="BuildScreen">
      <ScenarioHeader />
      <div className="BuildLayout">
        <div className="Panels">
          {roles.map((role) => <RolePanel key={role} role={role} editable />)}
        </div>
        <aside className="Sidebar">
          <BudgetBoard sheet={sheet} detailed={RoleView.detailedBudgets(roles)} />
          {footer ?? (
            <div className="ButtonRow">
              <button type="button" onClick={backToMenu}>{translator.t('Build.Back')}</button>
              {!session && <button type="button" className="Primary LaunchButton" onClick={launch}>{translator.t('Build.Launch')}</button>}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
