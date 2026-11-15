export enum ImageKind {
  Photograph = 'Photograph',
  TelescopeImage = 'TelescopeImage',
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
  static readonly downloadedOn = '2026-11-14T20:00:00.000Z'

  private static entry(id: string, nasaId: string, title: string, credit: string, kind: ImageKind, representative: boolean, pageUrl = `https://images.nasa.gov/details/${nasaId}`): ImageCredit {
    return { id, file: `Images/Events/${id}.png`, nasaId, title, credit, kind, representative, captionKey: `Image.${id}`, pageUrl }
  }

  static readonly all: readonly ImageCredit[] = [
    Images.entry('AsteroidA', 'PIA00136', 'Asteroid Ida and Its Moon', 'NASA/JPL', ImageKind.Photograph, true),
    Images.entry('AsteroidB', 'PIA00119', 'Highest Resolution Gaspra Mosaic', 'NASA/JPL/USGS', ImageKind.Photograph, true),
    Images.entry('AsteroidC', 'PIA02900', 'Back in the Saddle Again', 'NASA/JPL/JHUAPL', ImageKind.Photograph, true),
    Images.entry('Storm', 'iss074e0150531', 'A wispy, multi-colored aurora created by a geomagnetic storm', 'NASA', ImageKind.Photograph, true),
    Images.entry('StormSevere', 'PIA21949', 'Major Solar Flare', 'NASA/GSFC/Solar Dynamics Observatory', ImageKind.TelescopeImage, true),
    Images.entry('ExoplanetVisible', 'PIA21429', 'Transit Illustration of TRAPPIST-1', 'NASA/JPL-Caltech', ImageKind.Illustration, true),
    Images.entry('ExoplanetSpectrum', 'PIA20687', 'Hot Jupiter with Hidden Water (Artist Concept)', 'NASA/JPL-Caltech', ImageKind.Illustration, true),
    Images.entry('DartImpact', 'PIA25329', "NASA's DART at the Didymos System", 'NASA/Johns Hopkins APL/Steve Gribben', ImageKind.Illustration, false),
    Images.entry(
      'Grb221009A',
      'xrt_image_crop',
      "X-ray image of GRB 221009A from NASA's Swift",
      'NASA/Swift/A. Beardmore (University of Leicester)',
      ImageKind.TelescopeImage,
      false,
      'https://www.nasa.gov/universe/nasas-swift-fermi-missions-detect-exceptional-cosmic-blast/',
    ),
  ]

  static get(id: string): ImageCredit | undefined {
    return Images.all.find((image) => image.id === id)
  }
}
