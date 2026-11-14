export enum CommandType {
  Survey = 'Survey',
  Choose = 'Choose',
  Hold = 'Hold',
  Commit = 'Commit',
  Continue = 'Continue',
  Chase = 'Chase',
}

export type FlightCommand =
  | { type: CommandType.Survey }
  | { type: CommandType.Choose; contactIndex: number }
  | { type: CommandType.Hold }
  | { type: CommandType.Commit; keys: readonly string[] }
  | { type: CommandType.Continue }
  | { type: CommandType.Chase; contactIndex: number }

export class Commands {
  static readonly survey: FlightCommand = { type: CommandType.Survey }
  static readonly hold: FlightCommand = { type: CommandType.Hold }
  static readonly proceed: FlightCommand = { type: CommandType.Continue }

  static choose(contactIndex: number): FlightCommand {
    return { type: CommandType.Choose, contactIndex }
  }

  static chase(contactIndex: number): FlightCommand {
    return { type: CommandType.Chase, contactIndex }
  }

  static commit(keys: Iterable<string>): FlightCommand {
    return { type: CommandType.Commit, keys: [...keys] }
  }
}
