export class SoundSettings {
  static readonly key = 'Artemis26.Sound'

  static loadEnabled(): boolean {
    try {
      const raw = localStorage.getItem(SoundSettings.key)
      if (raw === null) return true
      const saved = JSON.parse(raw) as unknown
      if (typeof saved === 'object' && saved !== null && 'enabled' in saved) return (saved as { enabled: unknown }).enabled !== false
      return saved !== false
    } catch {
      return true
    }
  }

  static saveEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(SoundSettings.key, JSON.stringify({ enabled }))
    } catch {
      return
    }
  }
}
