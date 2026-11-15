import { useMemo } from 'react'
import { AllChannels } from '../../Engine/Events/Channel'
import { AllMarks, type Mark } from '../../Engine/Modules/MarkSpec'
import type { ModuleCard } from '../../Engine/Modules/ModuleCard'
import { ModuleCatalog } from '../../Engine/Modules/ModuleCatalog'
import { ModuleFamily } from '../../Engine/Modules/ModuleFamily'
import type { LoadoutIssue } from '../../Engine/Spacecraft/LoadoutIssue'
import { Spacecraft } from '../../Engine/Spacecraft/Spacecraft'
import { WeekCatalog } from '../../Engine/Weeks/WeekCatalog'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { ModuleDrawing } from '../Cards/ModuleDrawing'
import { ModuleWording } from '../Cards/ModuleWording'
import { Meter } from '../Meters/Meter'
import { ForecastLines } from '../Shared/ForecastLines'
import { SpacecraftSprite } from '../Spacecraft/SpacecraftSprite'
import { LaunchCue } from '../Scene/UseLaunch'

const Families = [ModuleFamily.Power, ModuleFamily.Instrument, ModuleFamily.Protection, ModuleFamily.Mobility, ModuleFamily.Utility, ModuleFamily.Crew]
const WantedShare = 0.12

function shortText(card: ModuleCard, mark: Mark, bayLeft: number, budgetLeft: number, t: (key: string, params?: Record<string, string | number>) => string): string | undefined {
  const spec = card.mark(mark)
  const bay = Math.max(0, spec.bayUnits - bayLeft)
  const budget = Math.max(0, spec.costMusd - budgetLeft)
  if (bay > 0 && budget > 0) return t('Hangar.NeedsBoth', { bay, budget })
  if (bay > 0) return t('Hangar.NeedsBay', { bay })
  if (budget > 0) return t('Hangar.NeedsBudget', { budget })
  return undefined
}

function ModuleRow({ card }: { card: ModuleCard }) {
  const wording = useWording()
  const words = useMemo(() => new ModuleWording(wording), [wording])
  const profile = useGameStore((state) => state.profile)
  const loadout = useGameStore((state) => state.loadout)
  const editLoadout = useGameStore((state) => state.editLoadout)
  const owned = profile.ownedMark(card.id)
  const copies = loadout.copiesOf(card.id)

  if (!card.isObtainable) {
    return (
      <li className="ModuleRow IsLocked">
        <ModuleDrawing moduleId={card.id} />
        <div className="ModuleMain">
          <h3>{words.name(card)}</h3>
          <p className="ModuleEffect">{wording.t('Hangar.InDevelopment')}</p>
        </div>
      </li>
    )
  }
  if (owned === 0) {
    const locked = profile.rank < card.minRankFor(1)
    return (
      <li className="ModuleRow IsLocked">
        <ModuleDrawing moduleId={card.id} />
        <div className="ModuleMain">
          <h3>{words.name(card)}</h3>
          <p className="ModuleEffect">{locked ? wording.t('Hangar.RankLocked', { rank: card.minRankFor(1) }) : wording.t('Hangar.NotOwned', { points: card.mark(1).unlockPoints })}</p>
        </div>
      </li>
    )
  }

  const best = owned as Mark
  const short = shortText(card, best, loadout.bayLeft, loadout.budgetLeft, (key, params) => wording.t(key, params))
  return (
    <>
      {copies.length === 0 && (
        <li className={`ModuleRow ${short ? 'IsShort' : ''}`}>
          <ModuleDrawing moduleId={card.id} />
          <div className="ModuleMain">
            <h3>{words.name(card)}</h3>
            <p className="ModuleEffect">{words.effect(card, best)}</p>
            <p className="ModuleStats"><span>{words.cost(card, best)}</span><span>{words.bay(card, best)}</span><span>{words.power(card)}</span></p>
            {short && <p className="ModuleShort">{short}</p>}
          </div>
          <button type="button" className={short ? 'IsShort' : ''} onClick={() => editLoadout((current) => current.install(card, best))}>{wording.t('Hangar.Fit')} {words.mark(best)}</button>
        </li>
      )}
      {copies.map((module) => (
        <li key={module.key} className="ModuleRow IsFitted">
          <ModuleDrawing moduleId={card.id} />
          <div className="ModuleMain">
            <h3>{words.name(card)}</h3>
            <p className="ModuleEffect">{words.effect(card, module.mark)}</p>
            <p className="ModuleStats"><span>{words.cost(card, module.mark)}</span><span>{words.bay(card, module.mark)}</span><span>{words.power(card)}</span></p>
          </div>
          <div className="ModuleControls">
            <div className="MarkStepper" role="group" aria-label={words.name(card)}>
              {AllMarks.map((mark) => (
                <button key={mark} type="button" aria-pressed={module.mark === mark} disabled={mark > owned} title={mark > owned ? `${words.mark(mark)}: ${wording.t('Hangar.MarkLocked')}` : words.mark(mark)} aria-label={words.mark(mark)} onClick={() => editLoadout((current) => current.setMark(module.key, mark))}>
                  {'I'.repeat(mark)}
                </button>
              ))}
            </div>
            <button type="button" className="Quiet" onClick={() => editLoadout((current) => current.remove(module.key))}>{wording.t('Hangar.Remove')}</button>
          </div>
        </li>
      ))}
      {copies.length > 0 && loadout.canAdd(card) && (
        <li className="ModuleRow IsExtra">
          <button type="button" className="Quiet" onClick={() => editLoadout((current) => current.install(card, best))}>+ {wording.t('Hangar.AddSecond')}</button>
          {short && <span className="ModuleShort">{short}</span>}
        </li>
      )}
    </>
  )
}

function issueText(issue: LoadoutIssue, t: (key: string, params?: Record<string, string | number>) => string): string {
  return t(`Issue.${issue.kind}`, { amount: issue.amount ?? 0 })
}

export function HangarScreen() {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const loadout = useGameStore((state) => state.loadout)
  const weekId = useGameStore((state) => state.weekId)
  const launch = useGameStore((state) => state.launch)
  const go = useGameStore((state) => state.go)
  const week = WeekCatalog.shared.get(weekId)
  const craft = useMemo(() => new Spacecraft(loadout), [loadout])
  const issues = loadout.issues(profile)
  const offered = AllChannels.filter((channel) => week.forecast.channelDemand(channel) > 0)
  const can = offered.filter((channel) => craft.canRecord(channel))
  const cannot = offered.filter((channel) => !craft.canRecord(channel))

  return (
    <main className="HangarScreen">
      <header className="ScreenHead">
        <button type="button" className="Quiet" onClick={() => go(Screen.Week)}>‹ {wording.t('Hangar.Back')}</button>
        <h1>{wording.t(`Week.${week.id}.Name`)}</h1>
        <p className="Muted">{wording.dayRange(week.startUtc, week.endUtc)} {new Date(week.startUtc).getUTCFullYear()}</p>
        <p className="HangarInstruction">{wording.t('Hangar.Instruction')}</p>
      </header>

      <div className="HangarLeft">
        <section className="Panel HangarForecast">
          <h2>{wording.t('Forecast.Title')}</h2>
          <ForecastLines forecast={week.forecast} />
        </section>

        <section className="Panel HangarCraft">
          <h2>{wording.t('Hangar.Spacecraft')}: {wording.t(`Bus.${loadout.bus.id}`)}</h2>
          <div className="HangarLimits">
            <Meter label={wording.t('Hangar.Budget')} value={loadout.costMusd} max={loadout.bus.budgetMusd} text={wording.t('Hangar.BudgetValue', { used: loadout.costMusd, limit: loadout.bus.budgetMusd })} tone={loadout.costMusd > loadout.bus.budgetMusd ? 'Danger' : 'Foil'} />
            <Meter label={wording.t('Hangar.Bay')} value={loadout.bayUsed} max={loadout.bus.bayUnits} text={wording.t('Hangar.BayValue', { used: loadout.bayUsed, limit: loadout.bus.bayUnits })} tone={loadout.bayUsed > loadout.bus.bayUnits ? 'Danger' : 'Foil'} />
          </div>
          {loadout.bayLeft === 0 && <p className="BayFull">{wording.t('Hangar.BayFull')}</p>}
          <p>{wording.t('Hangar.Power', { generation: craft.generation, capacity: craft.capacity })}</p>
          <p>{craft.passiveShield > 0 ? wording.t('Hangar.Hull', { hull: craft.maxHull, shield: craft.passiveShield }) : wording.t('Hangar.HullBare', { hull: craft.maxHull })}</p>
          <dl className="RecordLists">
            <div>
              <dt>{wording.t('Hangar.CanRecord')}</dt>
              <dd>{can.length ? can.map((channel) => wording.t(`Channel.${channel}`)).join(', ') : '—'}</dd>
            </div>
            <div>
              <dt>{wording.t('Hangar.CannotRecord')}</dt>
              <dd>
                {cannot.length
                  ? cannot.map((channel) => (
                      <span key={channel} className={week.forecast.demandShare(channel) >= WantedShare ? 'IsWanted' : ''}>
                        {wording.t(`Channel.${channel}`)}
                        {week.forecast.demandShare(channel) >= WantedShare && <em> ({wording.t('Hangar.Wanted')})</em>}
                      </span>
                    ))
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="HangarStage">
        <SpacecraftSprite loadout={loadout} maxScale={4} label={wording.t('Hangar.Spacecraft')} />
      </div>

      <aside className="Panel HangarModules">
        <h2>{wording.t('Hangar.Modules')}</h2>
        <div className="ModuleScroll">
          {Families.map((family) => {
            const cards = ModuleCatalog.shared.ofFamily(family)
            return (
              <section key={family}>
                <h3 className="FamilyName">{wording.t(`Family.${family}`)}</h3>
                <ul>{cards.map((card) => <ModuleRow key={card.id} card={card} />)}</ul>
              </section>
            )
          })}
        </div>
        <footer className="HangarLaunch">
          {issues.length > 0 && <p className="IssueLine">{issues.map((issue) => issueText(issue, (key, params) => wording.t(key, params))).join('. ')}</p>}
          <button type="button" className="Primary IsLarge" disabled={issues.length > 0} onClick={() => { LaunchCue.ask(); launch() }}>{wording.t('Hangar.Launch')}</button>
        </footer>
      </aside>
    </main>
  )
}
