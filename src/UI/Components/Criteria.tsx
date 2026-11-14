import { StarBadge, type StarRating } from '../../Engine/Simulation/StarRating'
import { useTranslator } from '../../I18n/UseTranslator'

const Order = [StarBadge.MissionSuccess, StarBadge.SmartSpending, StarBadge.FlightReady]

export function Criteria({ rating }: { rating: StarRating }) {
  const translator = useTranslator()
  return (
    <ol className="Criteria" aria-label={translator.t('Debrief.Stars', { stars: rating.stars })}>
      {Order.map((badge) => {
        const earned = rating.badges.includes(badge)
        return (
          <li key={badge} className={earned ? 'IsEarned' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z" />
            </svg>
            <span>{translator.t(`Badge.${badge}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}
