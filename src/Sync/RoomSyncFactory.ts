import type { RoomSync } from './RoomSync'

export class RoomSyncFactory {
  static get firebaseConfigured(): boolean {
    return Boolean(import.meta.env.VITE_FIREBASE_DATABASE_URL)
  }

  static async create(): Promise<RoomSync> {
    if (!RoomSyncFactory.firebaseConfigured) {
      const { LocalRoomSync } = await import('./LocalRoomSync')
      return new LocalRoomSync()
    }
    const { FirebaseRoomSync } = await import('./FirebaseRoomSync')
    const env = import.meta.env
    return new FirebaseRoomSync({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: env.VITE_FIREBASE_DATABASE_URL,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  }
}
