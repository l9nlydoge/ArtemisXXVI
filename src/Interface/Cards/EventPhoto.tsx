import { Images } from '../../Data/Curated/Images'
import { useWording } from '../../I18n/UseTranslator'

export function EventPhoto({ imageId, compact = false }: { imageId: string; compact?: boolean }) {
  const wording = useWording()
  const image = Images.get(imageId)
  if (!image) return <div className="EventPhoto IsMissing" />
  return (
    <figure className={`EventPhoto ${compact ? 'IsCompact' : ''}`}>
      <img src={`${import.meta.env.BASE_URL}${image.file}`} alt="" loading="lazy" />
      <figcaption>
        <span>{wording.t(image.captionKey)}</span>
        <span className="Credit">{image.credit}</span>
      </figcaption>
    </figure>
  )
}
