import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import zh from './locales/zh.json';
import { SIMULATE_PRODUCTION } from '../config/debugMode';

const LANGUAGE_OVERRIDE_KEY = '@app_language_override';

const translations = {
  en,
  zh,
};

const isDevelopmentLanguageSwitchEnabled = __DEV__ && !SIMULATE_PRODUCTION;

class SimpleI18n {
  constructor() {
    this.locale = 'en';
    this.defaultLocale = 'en';
    this.translations = translations;
    this.initialized = false;
    this.listeners = new Set();

    console.log('SimpleI18n constructor called');

    this.locale = this.detectLanguage();
    this.initialized = true;

    if (this.isLanguageSelectionEnabled()) {
      this.loadStoredLanguageOverride();
    }

    console.log('SimpleI18n initialized, locale:', this.locale);
  }

  isLanguageSelectionEnabled() {
    return isDevelopmentLanguageSwitchEnabled;
  }

  normalizeLocale(locale) {
    return String(locale || '')
      .split('-')[0]
      .trim()
      .toLowerCase();
  }

  getLocaleDisplayName(locale) {
    switch (this.normalizeLocale(locale)) {
      case 'zh':
        return '简体中文';
      case 'en':
      default:
        return 'English';
    }
  }

  getSupportedLocales() {
    return Object.keys(this.translations);
  }

  detectLanguage() {
    if (!this.isLanguageSelectionEnabled()) {
      return this.defaultLocale;
    }

    try {
      const locales = Localization.getLocales();
      const normalizedLanguage = this.normalizeLocale(
        locales?.[0]?.languageCode || locales?.[0]?.languageTag || this.defaultLocale
      );

      if (this.translations[normalizedLanguage]) {
        return normalizedLanguage;
      }
    } catch (error) {
      console.warn('Failed to detect system language:', error);
    }

    return this.defaultLocale;
  }

  async loadStoredLanguageOverride() {
    try {
      const storedLocale = await AsyncStorage.getItem(LANGUAGE_OVERRIDE_KEY);
      const normalizedLocale = this.normalizeLocale(storedLocale);

      if (!normalizedLocale || !this.translations[normalizedLocale]) {
        return;
      }

      if (this.locale !== normalizedLocale) {
        this.locale = normalizedLocale;
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load stored language override:', error);
    }
  }

  applyLanguage(locale) {
    const normalizedLocale = this.normalizeLocale(locale);
    const nextLocale =
      this.isLanguageSelectionEnabled() && this.translations[normalizedLocale]
        ? normalizedLocale
        : this.defaultLocale;

    if (this.locale === nextLocale) {
      return nextLocale;
    }

    this.locale = nextLocale;
    this.notifyListeners();
    return nextLocale;
  }

  refreshFromSystemLanguage() {
    const nextLocale = this.applyLanguage(this.detectLanguage());
    return nextLocale;
  }

  async setLanguage(locale) {
    const nextLocale = this.applyLanguage(locale);

    if (!this.isLanguageSelectionEnabled()) {
      return nextLocale;
    }

    try {
      await AsyncStorage.setItem(LANGUAGE_OVERRIDE_KEY, nextLocale);
    } catch (error) {
      console.warn('Failed to persist selected language:', error);
    }

    return nextLocale;
  }

  async clearLanguageOverride() {
    if (!this.isLanguageSelectionEnabled()) {
      return this.defaultLocale;
    }

    try {
      await AsyncStorage.removeItem(LANGUAGE_OVERRIDE_KEY);
    } catch (error) {
      console.warn('Failed to clear language override:', error);
    }

    return this.refreshFromSystemLanguage();
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
        console.warn('i18n listener failed:', error);
      }
    });
  }

  t(key) {
    if (!this.initialized) {
      console.warn('i18n.t() called before initialization for key:', key);
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
            console.warn('Translation not found for key:', key);
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
