import { StarBadge, type StarRating } from '../../Engine/Simulation/StarRating'
import { useTranslator } from '../../I18n/UseTranslator'

const Order = [StarBadge.MissionSuccess, StarBadge.SmartSpending, StarBadge.FlightReady]

export function StarRow({ rating }: { rating: StarRating }) {
  const translator = useTranslator()
  return (
    <ol className="StarRow" aria-label={`${rating.stars} / 3`}>
      {Order.map((badge) => {
        const earned = rating.badges.includes(badge)
        return (
          <li key={badge} className={earned ? 'IsEarned' : ''}>
            <span className="Star" aria-hidden="true">{earned ? '★' : '☆'}</span>
            <span>{translator.t(`Badge.${badge}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}
