import { useEffect, useState } from 'react'
import { Rank } from '../../Engine/Progress/Rank'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'

export function RankBadge({ from }: { from?: number }) {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const [shown, setShown] = useState(from ?? profile.lifetimePoints)

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(profile.lifetimePoints), from === undefined ? 0 : 450)
    return () => window.clearTimeout(timer)
  }, [profile.lifetimePoints, from])

  const progress = Rank.progress(shown)
  const final = Rank.progress(profile.lifetimePoints)
  const share = progress.rank < final.rank ? 100 : progress.isTop ? 100 : (progress.into / progress.span) * 100
  return (
    <section className="RankBadge" aria-label={wording.t('Home.Rank', { rank: final.rank })}>
      <p className="RankTitle">
        <span className="RankNumber">{wording.t('Home.Rank', { rank: final.rank })}</span>
        <span>{wording.t(`Rank.${final.rank}`)}</span>
      </p>
      <div className="RankTrack">
        <div className="RankFill" style={{ width: `${share}%` }} />
      </div>
      <p className="RankNote">{final.isTop ? wording.t('Home.TopRank') : wording.t('Home.ToNext', { points: final.toNext, rank: final.rank + 1 })}</p>
      <p className="RankPoints">{wording.t('Home.Points', { points: profile.points })}</p>
    </section>
  )
}
