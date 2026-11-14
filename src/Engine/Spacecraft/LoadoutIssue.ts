export enum LoadoutIssueKind {
  OverBudget = 'OverBudget',
  OverBay = 'OverBay',
  NotOwned = 'NotOwned',
  TooManyCopies = 'TooManyCopies',
  NoInstrument = 'NoInstrument',
  BusLocked = 'BusLocked',
}

export interface LoadoutIssue {
  kind: LoadoutIssueKind
  moduleId?: string
  amount?: number
}

export interface Ownership {
  readonly rank: number
  owns(moduleId: string, mark: number): boolean
}
