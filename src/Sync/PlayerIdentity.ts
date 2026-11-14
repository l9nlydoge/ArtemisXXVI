export class PlayerIdentity {
  private static readonly storageKey = 'GoNoGo.PlayerId'
  private static cached?: string

  static get id(): string {
    if (PlayerIdentity.cached) return PlayerIdentity.cached
    let id: string | null = null
    try {
      id = localStorage.getItem(PlayerIdentity.storageKey)
    } catch {
      id = null
    }
    if (!id) {
      id = crypto.randomUUID()
      try {
        localStorage.setItem(PlayerIdentity.storageKey, id)
      } catch {
        /* storage unavailable */
      }
    }
    PlayerIdentity.cached = id
    return id
  }
}
