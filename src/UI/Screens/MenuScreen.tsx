import { useEffect, useState } from 'react'
import { Catalog } from '../../Engine/Catalog/Catalog'
import { Difficulty } from '../../Engine/Design/Difficulty'
import { Language } from '../../I18n/Language'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { RoomCode } from '../../Sync/RoomCode'

export function MenuScreen() {
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
    <main className="MenuScreen">
      <header className="Hero">
        <h1>{translator.t('App.Title')}</h1>
        <p>{translator.t('App.Tagline')}</p>
        <div className="Segmented" role="group" aria-label="Language">
          {Object.values(Language).map((option) => (
            <button key={option} type="button" aria-pressed={language === option} onClick={() => setLanguage(option)}>{option.toUpperCase()}</button>
          ))}
        </div>
      </header>

      <div className="Segmented" role="group" aria-label={translator.t('Menu.Difficulty')}>
        {Object.values(Difficulty).map((option) => (
          <button key={option} type="button" aria-pressed={difficulty === option} onClick={() => setDifficulty(option)}>{translator.t(`Difficulty.${option}`)}</button>
        ))}
      </div>

      <div className="ScenarioGrid">
        {Catalog.shared.scenarios.items.map((scenario) => (
          <article key={scenario.id} className="ScenarioCard">
            <h2>{scenario.name}</h2>
            <p>{scenario.briefing}</p>
            <p className="Numeric">{translator.t('Menu.Budget', { budget: scenario.spec.budgetMusd, years: scenario.spec.targetYears })}</p>
            <div className="ButtonRow">
              <button type="button" className="Primary" onClick={() => startSolo(scenario.id)}>{translator.t('Menu.PlaySolo')}</button>
              <button type="button" onClick={() => void hostTeam(scenario.id)}>{translator.t('Menu.HostTeam')}</button>
            </div>
          </article>
        ))}
      </div>

      <form className="JoinForm" onSubmit={(event) => { event.preventDefault(); if (RoomCode.isValid(code)) void joinTeam(code) }}>
        <label className="Field">
          <span className="FieldLabel">{translator.t('Menu.RoomCode')}</span>
          <input value={code} inputMode="text" autoCapitalize="characters" maxLength={4} onChange={(event) => setCode(RoomCode.normalize(event.target.value))} />
        </label>
        <button type="submit" disabled={!RoomCode.isValid(code)}>{translator.t('Menu.JoinTeam')}</button>
      </form>
    </main>
  )
}
