import { RocketProfile } from './RocketProfile'

export function RocketSilhouette({ vehicleId }: { vehicleId: string }) {
  const profile = RocketProfile.of(vehicleId)
  const width = 16
  const ground = RocketProfile.tallestM + 2
  const top = ground - profile.heightM
  const body = profile.diameterM
  const fairing = profile.fairingDiameterM
  const fairingHeight = profile.heightM * 0.2
  const noseHeight = fairing * 1.3
  const shoulder = top + noseHeight
  const fairingEnd = top + fairingHeight
  const centre = width / 2
  const boosterHeight = profile.heightM * 0.32
  return (
    <svg className="RocketSilhouette" viewBox={`0 0 ${width} ${ground + 1}`} aria-hidden="true">
      <line className="Ground" x1={0} y1={ground} x2={width} y2={ground} />
      {Array.from({ length: profile.visibleBoosters }, (_, index) => {
        const side = index === 0 ? -1 : 1
        const x = centre + side * (body / 2 + 1.1) - 1
        return <path key={index} className="Hull" d={`M ${x} ${ground} L ${x} ${ground - boosterHeight} Q ${x + 1} ${ground - boosterHeight - 3} ${x + 2} ${ground - boosterHeight} L ${x + 2} ${ground} Z`} />
      })}
      <rect className="Hull" x={centre - body / 2} y={fairingEnd} width={body} height={ground - fairingEnd} />
      <path
        className="Hull"
        d={`M ${centre - fairing / 2} ${fairingEnd} L ${centre - fairing / 2} ${shoulder} Q ${centre - fairing / 2} ${top + noseHeight * 0.3} ${centre} ${top} Q ${centre + fairing / 2} ${top + noseHeight * 0.3} ${centre + fairing / 2} ${shoulder} L ${centre + fairing / 2} ${fairingEnd} Z`}
      />
      {profile.shared && [0.35, 0.6, 0.85].map((step) => (
        <line key={step} className="Slot" x1={centre - fairing / 2} y1={top + fairingHeight * step} x2={centre + fairing / 2} y2={top + fairingHeight * step} />
      ))}
    </svg>
  )
}
