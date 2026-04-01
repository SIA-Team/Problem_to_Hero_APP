import { Linking, Platform } from 'react-native';
import { showAppAlert } from './appAlert';

const DEFAULT_ERROR_TITLE = '无法打开地图';

const normalizeCoordinate = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildSearchQuery = ({ latitude, longitude, label, location }) => {
  const normalizedLatitude = normalizeCoordinate(latitude);
  const normalizedLongitude = normalizeCoordinate(longitude);
  const fallbackLabel = String(label || location || '目的地').trim();

  if (normalizedLatitude !== null && normalizedLongitude !== null) {
    const coordinatePair = `${normalizedLatitude},${normalizedLongitude}`;
    return fallbackLabel ? `${coordinatePair}(${fallbackLabel})` : coordinatePair;
  }

  return fallbackLabel;
};

const buildBrowserQuery = ({ latitude, longitude, label, location }) => {
  const normalizedLatitude = normalizeCoordinate(latitude);
  const normalizedLongitude = normalizeCoordinate(longitude);
  const fallbackLabel = String(label || location || '目的地').trim();

  if (normalizedLatitude !== null && normalizedLongitude !== null) {
    return fallbackLabel
      ? `${normalizedLatitude},${normalizedLongitude} (${fallbackLabel})`
      : `${normalizedLatitude},${normalizedLongitude}`;
  }

  return fallbackLabel;
};

const buildMapUrls = (destination) => {
  const searchQuery = buildSearchQuery(destination);
  const browserQuery = buildBrowserQuery(destination);
  const encodedSearchQuery = encodeURIComponent(searchQuery);
  const encodedBrowserQuery = encodeURIComponent(browserQuery);
  const normalizedLatitude = normalizeCoordinate(destination.latitude);
  const normalizedLongitude = normalizeCoordinate(destination.longitude);

  return {
    apple: normalizedLatitude !== null && normalizedLongitude !== null
      ? `http://maps.apple.com/?ll=${normalizedLatitude},${normalizedLongitude}&q=${encodedBrowserQuery}`
      : `http://maps.apple.com/?q=${encodedBrowserQuery}`,
    google: Platform.OS === 'android'
      ? `google.navigation:q=${encodedBrowserQuery}`
      : `comgooglemaps://?q=${encodedSearchQuery}`,
    waze: normalizedLatitude !== null && normalizedLongitude !== null
      ? `waze://?ll=${normalizedLatitude},${normalizedLongitude}&navigate=yes`
      : `waze://?q=${encodedBrowserQuery}&navigate=yes`,
    system: `geo:0,0?q=${encodedSearchQuery}`,
    browser: `https://www.google.com/maps/search/?api=1&query=${encodedBrowserQuery}`,
  };
};

const canOpenURLSafely = async (url) => {
  try {
    return await Linking.canOpenURL(url);
  } catch (error) {
    return false;
  }
};

const openURLSafely = async (url, fallbackUrl, appName) => {
  const candidateUrls = [url, fallbackUrl].filter(Boolean);

  for (const candidateUrl of candidateUrls) {
    try {
      const isOpenable = candidateUrl.startsWith('http')
        ? true
        : await canOpenURLSafely(candidateUrl);

      if (isOpenable) {
        await Linking.openURL(candidateUrl);
        return true;
      }
    } catch (error) {
      // Try the next candidate URL before surfacing the error.
    }
  }

  showAppAlert(
    DEFAULT_ERROR_TITLE,
    `未找到可用的${appName}，请检查地图应用是否已安装。`
  );

  return false;
};

const buildChooserMessage = ({ label, location, distance }) => {
  const lines = [label || location || '请选择打开方式'];

  if (location && location !== label) {
    lines.push(location);
  }

  if (distance) {
    lines.push(`距离 ${distance}`);
  }

  return lines.join('\n');
};

export const openMapChooser = async (destination = {}) => {
  const urls = buildMapUrls(destination);
  const chooserButtons = [];
  const chooserMessage = buildChooserMessage(destination);

  const [googleAvailable, wazeAvailable, systemMapAvailable] = await Promise.all([
    canOpenURLSafely(urls.google),
    canOpenURLSafely(urls.waze),
    Platform.OS === 'android' ? canOpenURLSafely(urls.system) : Promise.resolve(false),
  ]);

  if (Platform.OS === 'ios') {
    chooserButtons.push({
      text: 'Apple 地图',
      onPress: () => {
        void openURLSafely(urls.apple, urls.browser, 'Apple 地图');
      },
    });
  }

  if (googleAvailable) {
    chooserButtons.push({
      text: 'Google Maps',
      onPress: () => {
        void openURLSafely(urls.google, urls.browser, 'Google Maps');
      },
    });
  }

  if (wazeAvailable) {
    chooserButtons.push({
      text: 'Waze',
      onPress: () => {
        void openURLSafely(urls.waze, urls.browser, 'Waze');
      },
    });
  }

  if (Platform.OS === 'android' && systemMapAvailable) {
    chooserButtons.push({
      text: '系统地图',
      onPress: () => {
        void openURLSafely(urls.system, urls.browser, '系统地图');
      },
    });
  }

  chooserButtons.push({
    text: '浏览器打开',
    onPress: () => {
      void openURLSafely(urls.browser, null, '浏览器地图');
    },
  });
  chooserButtons.push({ text: '取消', style: 'cancel' });

  showAppAlert('选择地图应用', chooserMessage, chooserButtons);
};
