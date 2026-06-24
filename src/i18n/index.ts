import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import es from './es.json';
import zh from './zh.json';
import ja from './ja.json';
import de from './de.json';
import fr from './fr.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    zh: { translation: zh },
    ja: { translation: ja },
    de: { translation: de },
    fr: { translation: fr },
  },
  lng: Localization.getLocales()[0]?.languageCode || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
