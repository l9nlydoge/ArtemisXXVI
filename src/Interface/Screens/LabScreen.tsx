import { useMemo } from 'react'
import { ModuleFamily } from '../../Engine/Modules/ModuleFamily'
import { Lab, OfferState, type LabOffer } from '../../Engine/Progress/Lab'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { ModuleDrawing } from '../Cards/ModuleDrawing'
import { ModuleWording } from '../Cards/ModuleWording'
import { RankBadge } from '../Shared/RankBadge'

const lab = new Lab()
const Families = [ModuleFamily.Instrument, ModuleFamily.Power, ModuleFamily.Protection, ModuleFamily.Utility, ModuleFamily.Mobility, ModuleFamily.Crew]

function OfferCard({ offer }: { offer: LabOffer }) {
  const wording = useWording()
  const words = useMemo(() => new ModuleWording(wording), [wording])
  const buy = useGameStore((state) => state.buy)
  const { card, mark, state } = offer
  const shown = mark ?? 3
  const markName = wording.t(`Mark.${shown}`)

  return (
    <li className={`OfferCard Panel Is${state} ${offer.ownedMark === 3 ? 'IsTop' : ''}`}>
      <p className="OfferFamily">{wording.t(`Family.${card.family}`)}</p>
      <header>
        <h3>{words.name(card)}</h3>
        <span className="OwnedMark">{offer.ownedMark > 0 ? wording.t('Lab.Owned', { mark: wording.t(`Mark.${offer.ownedMark}`) }) : state === OfferState.InDevelopment ? '' : wording.t('Lab.NotOwned')}</span>
      </header>
      <ModuleDrawing moduleId={card.id} />
      {state === OfferState.InDevelopment ? (
        <p className="OfferEffect">{wording.t(`Module.${card.id}.Effect`)}</p>
      ) : (
        <>
          <p className="OfferEffect"><span className="OfferMark">{markName}</span> {words.effect(card, shown)}</p>
          <p className="ModuleStats"><span>{words.cost(card, shown)}</span><span>{words.bay(card, shown)}</span><span>{words.power(card)}</span></p>
        </>
      )}
      <footer>
        {state === OfferState.Available && <button type="button" className="Primary" onClick={() => buy(card.id)}>{wording.t('Lab.Unlock', { mark: markName, points: offer.cost })}</button>}
        {state === OfferState.TooExpensive && <p className="Muted">{wording.t('Lab.Short', { points: offer.shortBy ?? 0, mark: markName })}</p>}
        {state === OfferState.RankLocked && <p className="Muted">{wording.t('Lab.Rank', { mark: markName, rank: offer.needsRank ?? 0 })}</p>}
        {state === OfferState.Maxed && <p className="IsMaxed">{wording.t('Lab.Maxed')}</p>}
        {state === OfferState.InDevelopment && <p className="Muted">{wording.t('Lab.InDevelopment')}</p>}
      </footer>
    </li>
  )
}

export function LabScreen() {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const go = useGameStore((state) => state.go)
  const offers = useMemo(() => lab.offers(profile), [profile])

  return (
    <main className="LabScreen">
      <header className="ScreenHead LabHead">
        <button type="button" className="Quiet" onClick={() => go(Screen.Home)}>‹ {wording.t('Lab.Back')}</button>
        <h1>{wording.t('Lab.Title')}</h1>
        <p className="LabPoints">{wording.t('Lab.Points', { points: profile.points })}</p>
        <button type="button" className="Primary" onClick={() => go(Screen.Week)}>{wording.t('Home.Fly')}</button>
      </header>
      <div className="LabBody">
        <aside className="Panel LabRank"><RankBadge /></aside>
        <div className="LabScroll">
          <ul className="OfferGrid">
            {Families.flatMap((family) => offers.filter((offer) => offer.card.family === family)).map((offer) => <OfferCard key={offer.card.id} offer={offer} />)}
          </ul>
        </div>
      </div>
    </main>
  )
}
