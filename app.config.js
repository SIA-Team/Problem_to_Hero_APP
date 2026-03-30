const { expo: baseConfig } = require('./app.json');

const androidGoogleMapsApiKey =
  process.env.EXPO_ANDROID_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';

const iosGoogleMapsApiKey =
  process.env.EXPO_IOS_GOOGLE_MAPS_API_KEY ||
  process.env.IOS_GOOGLE_MAPS_API_KEY ||
  androidGoogleMapsApiKey;

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
  android: androidConfig,
  ios: iosConfig,
  extra: {
    ...(baseConfig.extra || {}),
    googleMapsConfigured: Boolean(androidGoogleMapsApiKey),
  },
});
