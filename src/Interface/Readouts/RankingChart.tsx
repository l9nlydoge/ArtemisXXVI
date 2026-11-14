import { useMemo } from 'react'
import { Numbers } from '../../Engine/Numbers'
import { MissionRanking } from '../../Engine/Simulation/MissionRanking'
import type { SimulationResult } from '../../Engine/Simulation/SimulationResult'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

const Width = 640
const Height = 300
const Left = 52
const Bottom = 40
const Top = 14
const Right = 16

export function RankingChart({ result }: { result: SimulationResult }) {
  const translator = useTranslator()
  const difficulty = useGameStore((state) => state.difficulty)
  const scenario = result.design.scenario
  const ranking = useMemo(() => MissionRanking.for(scenario, difficulty), [scenario, difficulty])
  const { budgetMusd, requiredScience } = scenario.spec

  const highest = Math.max(requiredScience * 1.4, result.score, ...ranking.field.map((mission) => mission.score))
  const widest = budgetMusd * 1.04
  const x = (cost: number) => Left + (Math.min(cost, widest) / widest) * (Width - Left - Right)
  const y = (score: number) => Height - Bottom - (score / highest) * (Height - Bottom - Top)
  const beaten = Numbers.percent(ranking.beatenBy(result))

  return (
    <section className="Ranking">
      <h2>{translator.t('Ranking.Title')}</h2>
      <p className="RankingHeadline">
        {result.flew ? translator.t('Ranking.Beat', { percent: beaten, count: ranking.field.length }) : translator.t('Ranking.NotFlown', { count: ranking.field.length })}
      </p>
      <svg className="RankingChart" viewBox={`0 0 ${Width} ${Height}`} role="img" aria-label={translator.t('Ranking.Title')}>
        <line className="Axis" x1={Left} y1={Height - Bottom} x2={Width - Right} y2={Height - Bottom} />
        <line className="Axis" x1={Left} y1={Top} x2={Left} y2={Height - Bottom} />
        <line className="GoalLine" x1={Left} y1={y(requiredScience)} x2={Width - Right} y2={y(requiredScience)} />
        <line className="BudgetLine" x1={x(budgetMusd)} y1={Top} x2={x(budgetMusd)} y2={Height - Bottom} />
        <text className="ChartNote" x={Left + 6} y={y(requiredScience) - 6}>{translator.t('Ranking.Goal', { science: requiredScience })}</text>
        <text className="ChartNote" x={x(budgetMusd)} y={Height - Bottom + 16} textAnchor="end">{translator.t('Ranking.Budget', { budget: budgetMusd })}</text>
        <text className="ChartAxis" x={(Left + Width - Right) / 2} y={Height - 8} textAnchor="middle">{translator.t('Ranking.AxisCost')}</text>
        <text className="ChartAxis" x={14} y={(Top + Height - Bottom) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(Top + Height - Bottom) / 2})`}>{translator.t('Ranking.AxisScience')}</text>
        <text className="ChartAxis" x={Left} y={Height - Bottom + 16} textAnchor="middle">0</text>
        <text className="ChartAxis" x={Left - 8} y={y(requiredScience) + 4} textAnchor="end">{requiredScience}</text>
        {ranking.field.map((mission, index) => (
          <circle key={index} className={`FieldDot ${mission.succeeded ? 'IsSuccess' : ''}`} cx={x(mission.costMusd)} cy={y(mission.score)} r={2.6} />
        ))}
        {result.flew && (
          <g>
            <circle className="YourDot" cx={x(result.costMusd)} cy={y(result.score)} r={7} />
            <text className="YourLabel" x={x(result.costMusd) + 12} y={y(result.score) + 5}>{translator.t('Ranking.You')}</text>
          </g>
        )}
      </svg>
      <p className="Hint">{translator.t('Ranking.Note')}</p>
    </section>
  )
}
