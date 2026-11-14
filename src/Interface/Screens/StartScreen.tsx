import { useEffect, useState } from 'react'
import { Catalog } from '../../Engine/Catalog/Catalog'
import { Difficulty } from '../../Engine/Design/Difficulty'
import { Language } from '../../I18n/Language'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { RoomCode } from '../../Sync/RoomCode'
import { MissionWall } from '../Readouts/MissionWall'

export function StartScreen() {
  const translator = useTranslator()
  const { difficulty, language, setDifficulty, setLanguage, startSolo, hostTeam, joinTeam } = useGameStore()
  const [code, setCode] = useState('')

  useEffect(() => {
    const match = /join=([A-Za-z]{4})/.exec(location.hash)
    if (!match) return
    history.replaceState(null, '', location.pathname)
    void joinTeam(RoomCode.normalize(match[1]))
  }, [joinTeam])

  return (
    <main className="StartScreen">
      <div className="Settings">
        <div className="Segmented" role="group" aria-label={translator.t('Menu.Difficulty')}>
          {Object.values(Difficulty).map((option) => (
            <button key={option} type="button" aria-pressed={difficulty === option} onClick={() => setDifficulty(option)}>{translator.t(`Difficulty.${option}`)}</button>
          ))}
        </div>
        <div className="Segmented" role="group" aria-label={translator.t('Menu.Language')}>
          <button type="button" aria-pressed={language === Language.English} onClick={() => setLanguage(Language.English)}>English</button>
          <button type="button" aria-pressed={language === Language.Turkish} onClick={() => setLanguage(Language.Turkish)}>Türkçe</button>
        </div>
      </div>

      <header className="Hero">
        <h1>{translator.t('App.Title')}</h1>
        <p>{translator.t('App.Tagline')}</p>
      </header>

      <div className="Deck">
        <section className="MissionList Panel">
          {Catalog.shared.scenarios.items.map((scenario) => (
            <article key={scenario.id} className="MissionRow">
              <div>
                <h2>{scenario.name}</h2>
                <p>{translator.t(`Scenario.${scenario.id}.Briefing`)}</p>
                <dl>
                  <div><dt>{translator.t('Brief.Budget')}</dt><dd>{translator.t('Fact.Cost', { cost: scenario.spec.budgetMusd })}</dd></div>
                  <div><dt>{translator.t('Brief.Duration')}</dt><dd>{translator.t('Brief.Years', { years: scenario.spec.targetYears })}</dd></div>
                </dl>
              </div>
              <div className="Actions">
                <button type="button" className="Primary" onClick={() => startSolo(scenario.id)}>{translator.t('Menu.PlaySolo')}</button>
                <button type="button" onClick={() => void hostTeam(scenario.id)}>{translator.t('Menu.HostTeam')}</button>
              </div>
            </article>
          ))}
          <form className="JoinForm" onSubmit={(event) => { event.preventDefault(); if (RoomCode.isValid(code)) void joinTeam(code) }}>
            <label htmlFor="RoomCodeInput">{translator.t('Menu.JoinPrompt')}</label>
            <input id="RoomCodeInput" value={code} autoCapitalize="characters" autoComplete="off" maxLength={4} placeholder="ABCD" onChange={(event) => setCode(RoomCode.normalize(event.target.value))} />
            <button type="submit" disabled={!RoomCode.isValid(code)}>{translator.t('Menu.JoinTeam')}</button>
          </form>
        </section>
        <MissionWall />
      </div>

      <p className="Colophon">{translator.t('App.Colophon')}</p>
    </main>
  )
}
