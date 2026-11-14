import { useEffect, useState, type ReactNode } from 'react'
import { FieldOwnership } from '../../Engine/Design/DesignField'
import type { Role } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { useMission } from '../../State/UseMission'
import { GraphicsSupport } from '../../World/GraphicsSupport'
import { StationPanel } from '../Controls/StationPanel'
import { StationTabs } from '../Controls/StationTabs'
import { SpacecraftDrawing } from '../Diagrams/SpacecraftDrawing'
import { CraftFacts } from '../Readouts/CraftFacts'
import { Ledger } from '../Readouts/Ledger'
import { MissionBrief } from '../Readouts/MissionBrief'
import { StatusStrip } from '../Readouts/StatusStrip'
import { RoleView } from '../RoleView'

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
    <main className="DockScreen">
      <section className="BriefPanel Panel">
        <MissionBrief scenario={mission.scenario} />
      </section>

      <div className="Window">
        {!GraphicsSupport.webgl && <SpacecraftDrawing design={mission.resolved} label={translator.t('Stage.Spacecraft')} />}
      </div>

      <section className="StatusPanel Panel">
        <CraftFacts mission={mission} />
        <Ledger sheet={mission.sheet} detailed={RoleView.detailedBudgets(roles)} />
      </section>

      <aside className="ControlPanel Panel">
        {roles.length > 1 && <StationTabs roles={roles} active={shown} sheet={mission.sheet} onSelect={setActive} />}
        <div className="ControlScroll">
          <div className="StationHeading">
            <h2>{translator.t(`Role.${shown}`)}</h2>
            <p>{translator.t(`Owns.${shown}`)}</p>
          </div>
          <StationPanel role={shown} />
        </div>
        <footer className="ControlFooter">
          {actions ?? (
            <>
              <StatusStrip sheet={mission.sheet} />
              <div className="Actions">
                <button type="button" className="Quiet" onClick={backToMenu}>{translator.t('Build.Back')}</button>
                <button type="button" className="Launch" onClick={launch}>{translator.t('Build.Launch')}</button>
              </div>
            </>
          )}
        </footer>
      </aside>
    </main>
  )
}
