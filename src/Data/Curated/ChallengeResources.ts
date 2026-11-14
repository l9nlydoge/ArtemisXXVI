export interface ChallengeResource {
  title: string
  url: string
  group: 'Nasa' | 'Partner'
}

export class ChallengeResources {
  static readonly pageUrl = 'https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources'
  static readonly readOn = '2026-11-14'

  static readonly all: readonly ChallengeResource[] = [
    { title: 'Design and Develop Science Missions', url: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf', group: 'Nasa' },
    { title: 'General Mission Analysis Tool (GMAT)', url: 'https://software.nasa.gov/software/GSC-19468-1', group: 'Nasa' },
    { title: 'Concept Maturity Levels (CMLs)', url: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299', group: 'Nasa' },
    { title: 'Mission Design Lab (MDL)', url: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/', group: 'Nasa' },
    { title: 'NASA Mission Viz', url: 'https://nasa.github.io/mission-viz/', group: 'Nasa' },
    { title: 'A Learning Game About Telescopes', url: 'https://science.nasa.gov/mission/webb/game-build-it-yourself/', group: 'Nasa' },
    { title: 'Cubesat 101 - Basic Concepts and Processes for First-Time CubeSat Developers', url: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf', group: 'Nasa' },
    { title: 'Digital Games and Activities (Canadian Space Agency)', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp', group: 'Partner' },
  ]
}
