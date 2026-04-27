const { expo: baseConfig } = require('./app.json');

const DEFAULT_OFFICIAL_WEBSITE_URL = 'https://problemvshero.com/';
const DEFAULT_OFFICIAL_RECHARGE_URL = 'https://problemvshero.com/recharge';

const androidGoogleMapsApiKey =
  process.env.EXPO_ANDROID_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

const iosGoogleMapsApiKey =
  process.env.EXPO_IOS_GOOGLE_MAPS_API_KEY ||
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  androidGoogleMapsApiKey;

const officialWebsiteUrl =
  process.env.EXPO_PUBLIC_OFFICIAL_WEBSITE_URL ||
  process.env.OFFICIAL_WEBSITE_URL ||
  DEFAULT_OFFICIAL_WEBSITE_URL;

const officialRechargeUrl =
  process.env.EXPO_PUBLIC_RECHARGE_URL ||
  process.env.RECHARGE_URL ||
  `${String(officialWebsiteUrl || DEFAULT_OFFICIAL_WEBSITE_URL).trim().replace(/\/+$/, '')}/recharge`;

const explicitRuntimeVersion = process.env.EXPO_RUNTIME_VERSION?.trim();
const runtimeVersion = explicitRuntimeVersion || baseConfig.version;

const androidConfig = {
  ...(baseConfig.android || {}),
  config: {
    ...((baseConfig.android && baseConfig.android.config) || {}),
    ...(androidGoogleMapsApiKey ? { googleMapsApiKey: androidGoogleMapsApiKey } : {}),
  },
};

const iosConfig = {
  ...(baseConfig.ios || {}),
  config: {
    ...((baseConfig.ios && baseConfig.ios.config) || {}),
    ...(iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : {}),
  },
};

module.exports = () => ({
  ...baseConfig,
  runtimeVersion,
  android: androidConfig,
  ios: iosConfig,
  extra: {
    ...(baseConfig.extra || {}),
    googleMapsConfigured: Boolean(androidGoogleMapsApiKey),
    officialWebsiteUrl,
    officialRechargeUrl,
    runtimeVersionPolicy: explicitRuntimeVersion ? 'manual' : 'appVersion',
  },
});
