export type TextParams = Readonly<Record<string, string | number>>

export class TextRef {
  constructor(
    readonly key: string,
    readonly params: TextParams = {},
  ) {}

  static literal(text: string): TextRef {
    return new TextRef('Text.Literal', { text })
  }
}
