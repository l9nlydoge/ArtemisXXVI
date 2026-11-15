export interface SoundMeasure {
  duration: number
  peakDb: number
  rmsDb: number
  loudness: number
  clips: boolean
  dcOffset: number
  tailDb: number
  endsSilent: boolean
  centroid: number
  lowShare: number
  bandShare: number
}

export interface Spectrogram {
  columns: number
  rows: number
  seconds: number
  lowHz: number
  highHz: number
  cells: Uint8Array
}

export class SoundMeter {
  static decibels(value: number): number {
    return value <= 1e-10 ? -200 : 20 * Math.log10(value)
  }

  static measure(left: Float32Array, right: Float32Array, sampleRate: number): SoundMeasure {
    let peak = 0
    let sum = 0
    let squares = 0
    let clipped = 0
    for (let index = 0; index < left.length; index++) {
      for (const sample of [left[index], right[index]]) {
        const size = Math.abs(sample)
        if (size > peak) peak = size
        if (size >= 0.999) clipped += 1
        sum += sample
        squares += sample * sample
      }
    }
    const count = Math.max(1, left.length * 2)
    const tailLength = Math.min(left.length, Math.floor(sampleRate * 0.02))
    let tail = 0
    for (let index = left.length - tailLength; index < left.length; index++) tail = Math.max(tail, Math.abs(left[index]), Math.abs(right[index]))
    const spectrum = SoundMeter.spectrum(left, right, sampleRate)
    return {
      duration: left.length / sampleRate,
      peakDb: SoundMeter.decibels(peak),
      rmsDb: SoundMeter.decibels(Math.sqrt(squares / count)),
      loudness: SoundMeter.loudness(left, right, sampleRate),
      clips: clipped > 2,
      dcOffset: sum / count,
      tailDb: SoundMeter.decibels(tail),
      endsSilent: SoundMeter.decibels(tail) < -60,
      ...spectrum,
    }
  }

  static loudness(left: Float32Array, right: Float32Array, sampleRate: number): number {
    const block = Math.floor(sampleRate * 0.4)
    const hop = Math.floor(block / 4)
    const weighted = [SoundMeter.kWeight(left, sampleRate), SoundMeter.kWeight(right, sampleRate)]
    const blocks: number[] = []
    if (left.length < block) {
      let total = 0
      for (const channel of weighted) for (let index = 0; index < channel.length; index++) total += channel[index] * channel[index]
      return -0.691 + 10 * Math.log10(Math.max(1e-12, total / Math.max(1, left.length)))
    }
    for (let start = 0; start + block <= left.length; start += hop) {
      let total = 0
      for (const channel of weighted) for (let index = start; index < start + block; index++) total += channel[index] * channel[index]
      blocks.push(total / block)
    }
    const loud = (value: number) => -0.691 + 10 * Math.log10(Math.max(1e-12, value))
    const absolute = blocks.filter((value) => loud(value) > -70)
    if (absolute.length === 0) return -70
    const mean = absolute.reduce((a, b) => a + b, 0) / absolute.length
    const relative = absolute.filter((value) => loud(value) > loud(mean) - 10)
    return loud(relative.reduce((a, b) => a + b, 0) / Math.max(1, relative.length))
  }

  static kWeight(samples: Float32Array, sampleRate: number): Float32Array {
    const shelfFrequency = 1681.974450955533
    const shelfGain = 3.999843853973347
    const shelfQ = 0.7071752369554196
    const k = Math.tan((Math.PI * shelfFrequency) / sampleRate)
    const vh = Math.pow(10, shelfGain / 20)
    const vb = Math.pow(vh, 0.4996667741545416)
    const a0 = 1 + k / shelfQ + k * k
    const shelf = [(vh + (vb * k) / shelfQ + k * k) / a0, (2 * (k * k - vh)) / a0, (vh - (vb * k) / shelfQ + k * k) / a0, (2 * (k * k - 1)) / a0, (1 - k / shelfQ + k * k) / a0]
    const passFrequency = 38.13547087602444
    const passQ = 0.5003270373238773
    const kp = Math.tan((Math.PI * passFrequency) / sampleRate)
    const ap = 1 + kp / passQ + kp * kp
    const pass = [1, -2, 1, (2 * (kp * kp - 1)) / ap, (1 - kp / passQ + kp * kp) / ap]
    return SoundMeter.biquad(SoundMeter.biquad(samples, shelf), pass)
  }

  static biquad(input: Float32Array, [b0, b1, b2, a1, a2]: number[]): Float32Array {
    const output = new Float32Array(input.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let index = 0; index < input.length; index++) {
      const x = input[index]
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      x2 = x1
      x1 = x
      y2 = y1
      y1 = y
      output[index] = y
    }
    return output
  }

  static fft(real: Float64Array, imaginary: Float64Array): void {
    const size = real.length
    for (let index = 1, swap = 0; index < size; index++) {
      let bit = size >> 1
      for (; swap & bit; bit >>= 1) swap ^= bit
      swap ^= bit
      if (index < swap) {
        ;[real[index], real[swap]] = [real[swap], real[index]]
        ;[imaginary[index], imaginary[swap]] = [imaginary[swap], imaginary[index]]
      }
    }
    for (let length = 2; length <= size; length <<= 1) {
      const angle = (-2 * Math.PI) / length
      const stepReal = Math.cos(angle)
      const stepImaginary = Math.sin(angle)
      for (let start = 0; start < size; start += length) {
        let wReal = 1
        let wImaginary = 0
        for (let offset = 0; offset < length / 2; offset++) {
          const a = start + offset
          const b = a + length / 2
          const tReal = real[b] * wReal - imaginary[b] * wImaginary
          const tImaginary = real[b] * wImaginary + imaginary[b] * wReal
          real[b] = real[a] - tReal
          imaginary[b] = imaginary[a] - tImaginary
          real[a] += tReal
          imaginary[a] += tImaginary
          const next = wReal * stepReal - wImaginary * stepImaginary
          wImaginary = wReal * stepImaginary + wImaginary * stepReal
          wReal = next
        }
      }
    }
  }

  private static spectrum(left: Float32Array, right: Float32Array, sampleRate: number): { centroid: number; lowShare: number; bandShare: number } {
    const size = 2048
    const power = new Float64Array(size / 2)
    const real = new Float64Array(size)
    const imaginary = new Float64Array(size)
    for (let start = 0; start + size <= left.length; start += size) {
      for (let index = 0; index < size; index++) {
        const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1))
        real[index] = ((left[start + index] + right[start + index]) / 2) * window
        imaginary[index] = 0
      }
      SoundMeter.fft(real, imaginary)
      for (let bin = 0; bin < size / 2; bin++) power[bin] += real[bin] * real[bin] + imaginary[bin] * imaginary[bin]
    }
    let total = 0, weighted = 0, low = 0, band = 0
    for (let bin = 1; bin < size / 2; bin++) {
      const frequency = (bin * sampleRate) / size
      total += power[bin]
      weighted += power[bin] * frequency
      if (frequency < 150) low += power[bin]
      if (frequency >= 300 && frequency <= 4000) band += power[bin]
    }
    if (total <= 0) return { centroid: 0, lowShare: 0, bandShare: 0 }
    return { centroid: weighted / total, lowShare: low / total, bandShare: band / total }
  }

  static spectrogram(left: Float32Array, right: Float32Array, sampleRate: number, columns = 1200, rows = 240): Spectrogram {
    const size = 2048
    const lowHz = 40
    const highHz = 16000
    const cells = new Uint8Array(columns * rows)
    const real = new Float64Array(size)
    const imaginary = new Float64Array(size)
    const span = Math.max(1, left.length - size)
    for (let column = 0; column < columns; column++) {
      const start = Math.floor((column / columns) * span)
      for (let index = 0; index < size; index++) {
        const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1))
        const at = start + index
        real[index] = at < left.length ? ((left[at] + right[at]) / 2) * window : 0
        imaginary[index] = 0
      }
      SoundMeter.fft(real, imaginary)
      for (let row = 0; row < rows; row++) {
        const frequency = lowHz * Math.pow(highHz / lowHz, row / (rows - 1))
        const bin = Math.min(size / 2 - 1, Math.max(1, Math.round((frequency * size) / sampleRate)))
        const magnitude = Math.sqrt(real[bin] * real[bin] + imaginary[bin] * imaginary[bin]) / (size / 4)
        const level = SoundMeter.decibels(magnitude)
        cells[(rows - 1 - row) * columns + column] = Math.max(0, Math.min(255, Math.round(((level + 110) / 100) * 255)))
      }
    }
    return { columns, rows, seconds: left.length / sampleRate, lowHz, highHz, cells }
  }
}
