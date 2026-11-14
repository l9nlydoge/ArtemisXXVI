import { Rank } from '../../Engine/Progress/Rank'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

export function RankBadge() {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const progress = Rank.progress(profile.lifetimePoints)
  return (
    <section className="RankBadge" aria-label={wording.t('Home.Rank', { rank: progress.rank })}>
      <p className="RankTitle">
        <span className="RankNumber">{wording.t('Home.Rank', { rank: progress.rank })}</span>
        <span>{wording.t(`Rank.${progress.rank}`)}</span>
      </p>
      <div className="RankTrack">
        <div className="RankFill" style={{ width: `${progress.isTop ? 100 : (progress.into / progress.span) * 100}%` }} />
      </div>
      <p className="RankNote">{progress.isTop ? wording.t('Home.TopRank') : wording.t('Home.ToNext', { points: progress.toNext, rank: progress.rank + 1 })}</p>
      <p className="RankPoints">{wording.t('Home.Points', { points: profile.points })}</p>
    </section>
  )
}
