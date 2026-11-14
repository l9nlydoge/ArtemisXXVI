import { AllRoles } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { Vote, type RoomState } from '../../Sync/RoomState'

export function BallotBoard({ room }: { room: RoomState }) {
  const translator = useTranslator()
  return (
    <ul className="BallotBoard">
      {AllRoles.map((role) => {
        const seat = room.seats?.[role]
        const ballot = room.ballots?.[role]
        const state = !seat?.connected ? 'Empty' : ballot?.vote ?? 'Waiting'
        return (
          <li key={role} className={`Ballot Is${state}`}>
            <span className="BallotRole">{translator.t(`Role.${role}`)}</span>
            <span className="BallotSeat">{seat?.connected ? seat.name : translator.t('Host.Empty')}</span>
            <strong className="BallotVote">
              {state === Vote.Go ? translator.t('Vote.Go') : state === Vote.NoGo ? translator.t('Vote.NoGo') : state === 'Waiting' ? translator.t('Vote.Waiting') : '—'}
            </strong>
            {ballot?.reason && <small>{ballot.reason}</small>}
          </li>
        )
      })}
    </ul>
  )
}
