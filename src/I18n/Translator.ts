import { Language } from './Language'
import English from './StringsEn.json'
import Turkish from './StringsTr.json'

type Dictionary = Readonly<Record<string, string>>
export type TranslationParams = Readonly<Record<string, string | number>>

export class Translator {
  private static readonly dictionaries: Record<Language, Dictionary> = {
    [Language.English]: English,
    [Language.Turkish]: Turkish,
  }

  private readonly numberFormat: Intl.NumberFormat

  constructor(readonly language: Language) {
    this.numberFormat = new Intl.NumberFormat(language)
  }

  t(key: string, params: TranslationParams = {}): string {
    const template = Translator.dictionaries[this.language][key] ?? Translator.dictionaries[Language.English][key] ?? key
    return template.replace(/\{(\w+)\}/g, (_, name: string) => this.format(params[name]))
  }

  number(value: number): string {
    return this.numberFormat.format(value)
  }

  private format(value: string | number | undefined): string {
    if (value === undefined) return ''
    return typeof value === 'number' ? this.number(value) : value
  }

  static detect(): Language {
    return navigator.language?.toLowerCase().startsWith('tr') ? Language.Turkish : Language.English
  }
}
