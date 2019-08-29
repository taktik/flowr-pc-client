import { LocalisedMessage } from '~/local';

export class Translator {
  static keys: { [key: string]: LocalisedMessage } = {}

  static addKeys(lang: string, keys: LocalisedMessage) {
    const previousKeys = Translator.keys[lang] || {}

    for (const key in keys) {
      if (!!previousKeys[key]) {
        console.warn(`Warning: key ${key} (value ${previousKeys[key].message}) will be overrided with value ${keys[key].message}`)
      }
    }

    Translator.keys[lang] = Object.assign({}, previousKeys, keys)
  }

  static translate(text: string, lang: string) {
    const localisedMessage = Translator.keys[lang]

    if (localisedMessage && localisedMessage[text]) {
      return localisedMessage[text].message
    }

    return text
  }

  static withLang(lang: string) {
    return (text: string) => Translator.translate(text, lang)
  }
}
