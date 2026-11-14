import { useEffect, useState, type ReactNode } from 'react'
import { FieldOwnership } from '../../Engine/Design/DesignField'
import type { Role } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Ledger } from '../Components/Ledger'
import { MissionBrief } from '../Components/MissionBrief'
import { Stage } from '../Components/Stage'
import { StationPanel } from '../Components/StationPanel'
import { StationTabs } from '../Components/StationTabs'
import { StatusStrip } from '../Components/StatusStrip'
import { RoleView } from '../RoleView'
import { useMission } from '../UseMission'

interface BuildScreenProps {
  roles: readonly Role[]
  actions?: ReactNode
}

export function BuildScreen({ roles, actions }: BuildScreenProps) {
  const translator = useTranslator()
  const { launch, backToMenu, focusField } = useGameStore()
  const mission = useMission()
  const [active, setActive] = useState<Role>(roles[0])
  const shown = roles.includes(active) ? active : roles[0]

  useEffect(() => {
    if (!focusField) return
    const owner = FieldOwnership.owner(focusField)
    if (roles.includes(owner)) setActive(owner)
  }, [focusField, roles])

  return (
    <main className="BuildScreen">
      <MissionBrief scenario={mission.scenario} />
      <div className="Workbench">
        <div className="WorkbenchStage">
          <Stage mission={mission} />
          <Ledger sheet={mission.sheet} detailed={RoleView.detailedBudgets(roles)} />
        </div>
        <div className="WorkbenchControls">
          {roles.length > 1 && <StationTabs roles={roles} active={shown} sheet={mission.sheet} onSelect={setActive} />}
          <div className="StationHeading">
            <h2>{translator.t(`Role.${shown}`)}</h2>
            <p>{translator.t(`Owns.${shown}`)}</p>
          </div>
          <StationPanel role={shown} />
        </div>
      </div>
      <footer className="ActionBar">
        <StatusStrip sheet={mission.sheet} />
        {actions ?? (
          <div className="Actions">
            <button type="button" className="Quiet" onClick={backToMenu}>{translator.t('Build.Back')}</button>
            <button type="button" className="Primary LaunchButton" onClick={launch}>{translator.t('Build.Launch')}</button>
          </div>
        )}
      </footer>
    </main>
  )
}
