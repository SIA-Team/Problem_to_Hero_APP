import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import deviceRiskService from '../services/deviceRiskService';

const DEFAULT_RECHARGE_URL = 'https://problemvshero.com/recharge';
const URL_PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

const getExpoExtra = () => Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const getConfiguredRechargeUrl = () => {
  const extra = getExpoExtra();

  return String(
    extra?.officialRechargeUrl ||
    extra?.rechargeUrl ||
    extra?.officialWebsiteUrl ||
    DEFAULT_RECHARGE_URL
  ).trim();
};

const isHttpUrl = value => /^https?:\/\//i.test(String(value || '').trim());

const fillUrlTemplate = (template, replacements) =>
  String(template || '').replace(URL_PLACEHOLDER_PATTERN, (_, key) => {
    const value = replacements[key];

    return value === undefined || value === null ? `{${key}}` : encodeURIComponent(String(value));
  });

export const buildOfficialRechargeUrl = async ({ userId, username } = {}) => {
  const template = getConfiguredRechargeUrl();

  if (!template) {
    return '';
  }

  const token = await AsyncStorage.getItem('authToken');

  return fillUrlTemplate(template, {
    token,
    userId,
    username,
  });
};

export const openOfficialRechargePage = async ({ userId, username, entryPoint } = {}) => {
  try {
    await deviceRiskService.recordRechargeEntry({
      entryPoint: entryPoint || 'official_recharge_page',
      userId,
      username,
    });
  } catch (error) {
    console.warn('Failed to capture recharge risk context:', error);
  }

  const url = await buildOfficialRechargeUrl({ userId, username });

  if (!url) {
    return {
      ok: false,
      reason: 'missing_config',
    };
  }

  if (!isHttpUrl(url)) {
    return {
      ok: false,
      reason: 'invalid_url',
      url,
    };
  }

  URL_PLACEHOLDER_PATTERN.lastIndex = 0;
  if (URL_PLACEHOLDER_PATTERN.test(url)) {
    return {
      ok: false,
      reason: 'missing_params',
      url,
    };
  }

  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    return {
      ok: false,
      reason: 'unsupported_url',
      url,
    };
  }

  await Linking.openURL(url);

  return {
    ok: true,
    url,
  };
};
