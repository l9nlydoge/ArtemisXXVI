export enum ImageKind {
  Photograph = 'Photograph',
  Illustration = 'Illustration',
}

export interface ImageCredit {
  id: string
  file: string
  nasaId: string
  title: string
  credit: string
  kind: ImageKind
  representative: boolean
  captionKey: string
  pageUrl: string
}

export class Images {
  private static entry(id: string, nasaId: string, title: string, credit: string, kind: ImageKind, representative: boolean): ImageCredit {
    return { id, file: `Images/Events/${id}.jpg`, nasaId, title, credit, kind, representative, captionKey: `Image.${id}`, pageUrl: `https://images.nasa.gov/details/${nasaId}` }
  }

  static readonly all: readonly ImageCredit[] = [
    Images.entry('AsteroidA', 'PIA00136', 'Asteroid Ida and Its Moon', 'NASA/JPL', ImageKind.Photograph, true),
    Images.entry('AsteroidB', 'PIA00119', 'Highest Resolution Gaspra Mosaic', 'NASA/JPL/USGS', ImageKind.Photograph, true),
    Images.entry('AsteroidC', 'PIA02900', 'Back in the Saddle Again', 'NASA/JPL/JHUAPL', ImageKind.Photograph, true),
    Images.entry('AsteroidD', 'PIA00333', 'Asteroid Ida and its Satellite Dactyl in Enhanced Color', 'NASA/JPL/USGS', ImageKind.Photograph, true),
    Images.entry('Storm', 'iss074e0150531', 'A wispy, multi-colored aurora created by a geomagnetic storm', 'NASA', ImageKind.Photograph, true),
    Images.entry('StormSevere', 'PIA21949', 'Major Solar Flare', 'NASA/GSFC/Solar Dynamics Observatory', ImageKind.Photograph, true),
    Images.entry('ExoplanetVisible', 'PIA21429', 'Transit Illustration of TRAPPIST-1', 'NASA/JPL-Caltech', ImageKind.Illustration, true),
    Images.entry('ExoplanetSpectrum', 'PIA20687', 'Hot Jupiter with Hidden Water (Artist Concept)', 'NASA/JPL-Caltech', ImageKind.Illustration, true),
    Images.entry('DartImpact', 'PIA25329', "NASA's DART at the Didymos System", 'NASA/Johns Hopkins APL/Steve Gribben', ImageKind.Illustration, false),
    Images.entry('Grb221009A', 'GSFC_20171208_Archive_e001889', 'NASA Telescopes Join Forces To Observe Unprecedented Explosion', 'NASA/Swift/Stefan Immler', ImageKind.Photograph, true),
  ]

  static get(id: string): ImageCredit | undefined {
    return Images.all.find((image) => image.id === id)
  }
}
