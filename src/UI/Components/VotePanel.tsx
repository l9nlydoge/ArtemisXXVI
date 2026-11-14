import type { Budget } from '../../Engine/Models/Budget'
import { BudgetStatus } from '../../Engine/Models/Budget'
import { useTranslator } from '../../I18n/UseTranslator'
import { Vote, type Ballot } from '../../Sync/RoomState'

interface VotePanelProps {
  ownBudgets: readonly Budget[]
  current?: Ballot
  onVote(ballot: Ballot): void
}

export function VotePanel({ ownBudgets, current, onVote }: VotePanelProps) {
  const translator = useTranslator()
  const problems = ownBudgets.filter((budget) => budget.status !== BudgetStatus.Green)
  const reason = problems.map((budget) => `${translator.t(`Budget.${budget.kind}`)}: ${translator.t(`Status.${budget.status}`)}`).join(', ')
  return (
    <div className="VotePanel" role="group" aria-label={translator.t('Vote.Board')}>
      <button type="button" className="VoteButton IsGo" aria-pressed={current?.vote === Vote.Go} onClick={() => onVote({ vote: Vote.Go })}>
        {translator.t('Vote.Go')}
      </button>
      <button type="button" className="VoteButton IsNoGo" aria-pressed={current?.vote === Vote.NoGo} onClick={() => onVote(reason ? { vote: Vote.NoGo, reason } : { vote: Vote.NoGo })}>
        {translator.t('Vote.NoGo')}
      </button>
    </div>
  )
}
