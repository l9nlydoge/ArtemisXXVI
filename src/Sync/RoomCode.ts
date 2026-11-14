export class RoomCode {
  private static readonly alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

  static generate(): string {
    return Array.from({ length: 4 }, () => RoomCode.alphabet[Math.floor(Math.random() * RoomCode.alphabet.length)]).join('')
  }

  static normalize(input: string): string {
    return input.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
  }

  static isValid(code: string): boolean {
    return /^[A-Z]{4}$/.test(code)
  }
}
