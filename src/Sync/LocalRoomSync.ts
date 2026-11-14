import type { Role } from '../Engine/Design/Role'
import { PathTree } from './PathTree'
import { RoomSync, type RoomListener } from './RoomSync'
import type { RoomState } from './RoomState'

export class LocalRoomSync extends RoomSync {
  readonly transport = 'Local'
  private readonly channel = new BroadcastChannel('Artemis26.Rooms')

  protected async put(code: string, path: string, value: unknown): Promise<void> {
    this.mutate(code, (tree) => tree.put(path, value))
  }

  protected async merge(code: string, path: string, value: object): Promise<void> {
    this.mutate(code, (tree) => tree.merge(path, value))
  }

  protected async remove(code: string, path: string): Promise<void> {
    this.mutate(code, (tree) => tree.remove(path))
  }

  protected watch(code: string, listener: RoomListener): () => void {
    const handler = (event: MessageEvent<string>) => {
      if (event.data === code) listener(this.load(code))
    }
    this.channel.addEventListener('message', handler)
    listener(this.load(code))
    const local = (event: Event) => {
      if ((event as CustomEvent<string>).detail === code) listener(this.load(code))
    }
    window.addEventListener('Artemis26.LocalRoom', local)
    return () => {
      this.channel.removeEventListener('message', handler)
      window.removeEventListener('Artemis26.LocalRoom', local)
    }
  }

  protected trackPresence(code: string, role: Role): void {
    window.addEventListener('pagehide', () => this.mutate(code, (tree) => tree.put(`seats/${role}/connected`, false)))
  }

  private mutate(code: string, change: (tree: PathTree) => void): void {
    const tree = new PathTree((this.load(code) ?? {}) as unknown as Record<string, unknown>)
    change(tree)
    localStorage.setItem(this.key(code), JSON.stringify(tree.value))
    this.channel.postMessage(code)
    window.dispatchEvent(new CustomEvent('Artemis26.LocalRoom', { detail: code }))
  }

  private load(code: string): RoomState | null {
    const raw = localStorage.getItem(this.key(code))
    return raw ? (JSON.parse(raw) as RoomState) : null
  }

  private key(code: string): string {
    return `Artemis26.Room.${code}`
  }
}
