import { Catalog } from '../../Engine/Catalog/Catalog'
import type { Scenario } from '../../Engine/Catalog/Scenario'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'

interface InstrumentTableProps {
  label: string
  scenario: Scenario
  selected: readonly string[]
  disabled?: boolean
  highlighted?: boolean
  onChange(ids: string[]): void
}

export function InstrumentTable({ label, scenario, selected, disabled, highlighted, onChange }: InstrumentTableProps) {
  const translator = useTranslator()
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  return (
    <fieldset className={`Control InstrumentTable ${highlighted ? 'IsHighlighted' : ''}`} disabled={disabled}>
      <legend>{label}</legend>
      <table>
        <thead>
          <tr>
            <th scope="col">{translator.t('Column.Instrument')}</th>
            <th scope="col">{translator.t('Column.Fit')}</th>
            <th scope="col">kg</th>
            <th scope="col">W</th>
            <th scope="col">Gb/{translator.t('Unit.Day')}</th>
            <th scope="col">$M</th>
          </tr>
        </thead>
        <tbody>
          {Catalog.shared.instruments.items.map((instrument) => {
            const fit = scenario.instrumentFit(instrument.id)
            const checked = selected.includes(instrument.id)
            return (
              <tr key={instrument.id} className={checked ? 'IsSelected' : ''} onClick={() => !disabled && toggle(instrument.id)}>
                <th scope="row">
                  <label onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(instrument.id)} />
                    {instrument.name}
                  </label>
                </th>
                <td>
                  <span className="FitMeter" aria-label={`${Numbers.percent(fit)}%`}><span style={{ width: `${fit * 100}%` }} /></span>
                </td>
                <td>{translator.number(instrument.massKg)}</td>
                <td>{translator.number(instrument.powerW)}</td>
                <td>{translator.number(Numbers.round(instrument.gigabitsPerDay, instrument.gigabitsPerDay < 10 ? 1 : 0))}</td>
                <td>{translator.number(instrument.costMusd)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </fieldset>
  )
}
