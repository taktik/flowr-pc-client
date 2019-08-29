import * as moment from 'moment';
import { local } from '~/local'
import { Translator } from 'src/translator/translator';
const defaultLanguage = 'en'
const param = new URLSearchParams(location.search);
let UILanguage = defaultLanguage;

if (param.has('lang')) {
  UILanguage = param.get('lang') || defaultLanguage
}
moment.locale(UILanguage)

export function getUILanguage() {
  return UILanguage
}

for (const lang in local) {
  Translator.addKeys(lang, local[lang])
}

export function translate(text: string) {
  return Translator.translate(text, getUILanguage())
}
