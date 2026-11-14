import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getDatabase, onDisconnect, onValue, ref, remove, set, update, type Database } from 'firebase/database'
import type { Role } from '../Engine/Design/Role'
import { RoomSync, type RoomListener } from './RoomSync'
import type { RoomState } from './RoomState'

export class FirebaseRoomSync extends RoomSync {
  readonly transport = 'Firebase'
  private readonly database: Database

  constructor(options: FirebaseOptions) {
    super()
    this.database = getDatabase(initializeApp(options))
  }

  protected put(code: string, path: string, value: unknown): Promise<void> {
    return set(this.ref(code, path), value)
  }

  protected merge(code: string, path: string, value: object): Promise<void> {
    return update(this.ref(code, path), value)
  }

  protected remove(code: string, path: string): Promise<void> {
    return remove(this.ref(code, path))
  }

  protected watch(code: string, listener: RoomListener): () => void {
    return onValue(this.ref(code, ''), (snapshot) => listener(snapshot.val() as RoomState | null))
  }

  protected trackPresence(code: string, role: Role): void {
    const connected = this.ref(code, `seats/${role}/connected`)
    void set(connected, true)
    void onDisconnect(connected).set(false)
  }

  private ref(code: string, path: string) {
    return ref(this.database, path ? `Rooms/${code}/${path}` : `Rooms/${code}`)
  }
}
