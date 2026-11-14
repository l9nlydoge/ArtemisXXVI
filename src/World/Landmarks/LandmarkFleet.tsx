import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { LandmarkModel } from './LandmarkModel'
import type { LandmarkTrack } from './LandmarkTrack'

interface LandmarkFleetProps {
  tracks: readonly LandmarkTrack[]
  labelled: () => boolean
  visiting: () => string | undefined
}

export function LandmarkFleet({ tracks, labelled, visiting }: LandmarkFleetProps) {
  const groups = useRef<(Group | null)[]>([])
  const labels = useRef<(HTMLDivElement | null)[]>([])

  useFrame(({ camera }) => {
    const show = labelled()
    const visited = visiting()
    tracks.forEach((track, index) => {
      const group = groups.current[index]
      if (group) {
        group.position.copy(track.frame.position)
        group.quaternion.copy(track.quaternion)
      }
      const label = labels.current[index]
      if (label) label.style.opacity = show && track.landmark.id !== visited && !track.isHiddenFrom(camera.position) ? '1' : '0'
    })
  }, -1)

  return (
    <>
      {tracks.map((track, index) => (
        <group key={track.landmark.id} ref={(node) => { groups.current[index] = node }}>
          <group scale={track.size}>
            <LandmarkModel id={track.landmark.id} />
          </group>
          <Html ref={(node) => { labels.current[index] = node }} position={[0, track.size * 0.75, 0]} center className="WorldLabel" zIndexRange={[0, 0]}>
            {track.landmark.name}
          </Html>
        </group>
      ))}
    </>
  )
}
