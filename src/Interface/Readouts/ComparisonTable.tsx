import { useMemo } from 'react'
import type { SimulationResult } from '../../Engine/Simulation/SimulationResult'
import { useTranslator } from '../../I18n/UseTranslator'
import { MissionComparison } from '../MissionComparison'

export function ComparisonTable({ result }: { result: SimulationResult }) {
  const translator = useTranslator()
  const comparison = useMemo(() => new MissionComparison(result, translator), [result, translator])
  const reference = result.design.scenario.reference
  return (
    <section className="Comparison">
      <h2>{translator.t('Debrief.HowNasaDidIt')}</h2>
      <table>
        <thead>
          <tr>
            <td />
            <th scope="col">{translator.t('Compare.Yours')}</th>
            <th scope="col">{reference.name}</th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{translator.t(`Compare.${row.key}`)}</th>
              <td>{row.yours}</td>
              <td>{row.theirs.source ? <a href={row.theirs.source} target="_blank" rel="noreferrer">{row.theirs.value}</a> : row.theirs.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="Lesson">{translator.t(`Scenario.${result.design.scenario.id}.Lesson`)}</p>
    </section>
  )
}
