import * as Localization from 'expo-localization';
import en from './locales/en.json';
import zh from './locales/zh.json';

const translations = {
  en,
  zh,
};

const LANGUAGE_STORAGE_KEY = '@app_language';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
};

let cachedStorage = null;

const getStorage = () => {
  if (cachedStorage) {
    return cachedStorage;
  }

  try {
    const asyncStorageModule = require('@react-native-async-storage/async-storage');
    cachedStorage = asyncStorageModule.default || asyncStorageModule;
    return cachedStorage;
  } catch (error) {
    if (typeof localStorage !== 'undefined') {
      cachedStorage = {
        getItem: async key => localStorage.getItem(key),
        setItem: async (key, value) => localStorage.setItem(key, value),
      };
      return cachedStorage;
    }

    console.warn('⚠️ Async storage unavailable, language preference will not persist:', error?.message || error);
    cachedStorage = noopStorage;
    return cachedStorage;
  }
};

class SimpleI18n {
  constructor() {
    this.locale = 'en';
    this.defaultLocale = 'en';
    this.translations = translations;
    this.initialized = false;
    this.listeners = new Set();

    console.log('🌐 SimpleI18n constructor called');

    this.locale = this.detectLanguage();
    this.initialized = true;
    this.loadPersistedLanguage();

    console.log('✅ SimpleI18n initialized, locale:', this.locale);
  }

  detectLanguage() {
    try {
      const locales = Localization.getLocales();
      if (!locales || locales.length === 0) {
        console.log('⚠️ No locales detected, using default:', this.defaultLocale);
        return this.defaultLocale;
      }

      const deviceLanguage = locales[0]?.languageCode || this.defaultLocale;
      const normalizedLanguage = deviceLanguage.split('-')[0];

      if (this.translations[normalizedLanguage]) {
        console.log('✅ Language detected:', normalizedLanguage);
        return normalizedLanguage;
      }

      console.log('⚠️ Language not supported, using default:', this.defaultLocale);
      return this.defaultLocale;
    } catch (error) {
      console.warn('❌ Failed to detect system language:', error);
      return this.defaultLocale;
    }
  }

  async loadPersistedLanguage() {
    try {
      const savedLanguage = await getStorage().getItem(LANGUAGE_STORAGE_KEY);
      if (!savedLanguage) {
        return;
      }

      this.applyLanguage(savedLanguage);
    } catch (error) {
      console.warn('⚠️ Failed to load persisted language:', error);
    }
  }

  applyLanguage(locale) {
    const normalizedLocale = (locale || '').split('-')[0];
    const nextLocale = this.translations[normalizedLocale]
      ? normalizedLocale
      : this.defaultLocale;

    if (this.locale === nextLocale) {
      return nextLocale;
    }

    this.locale = nextLocale;
    this.notifyListeners();
    return nextLocale;
  }

  async setLanguage(locale, options = {}) {
    const { persist = true } = options;
    const nextLocale = this.applyLanguage(locale);

    if (!persist) {
      return nextLocale;
    }

    try {
      await getStorage().setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    } catch (error) {
      console.warn('⚠️ Failed to persist language:', error);
    }

    return nextLocale;
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.locale);
      } catch (error) {
        console.warn('⚠️ i18n listener failed:', error);
      }
    });
  }

  t(key) {
    if (!this.initialized) {
      console.warn('⚠️ i18n.t() called before initialization for key:', key);
    }

    const keys = key.split('.');
    let translation = this.translations[this.locale];

    if (!translation) {
      translation = this.translations[this.defaultLocale];
    }

    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        let fallback = this.translations[this.defaultLocale];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object') {
            fallback = fallback[fk];
          } else {
            console.warn('⚠️ Translation not found for key:', key);
            return key;
          }
        }
        return fallback || key;
      }
    }

    return translation || key;
  }
}

const i18n = new SimpleI18n();

export default i18n;
