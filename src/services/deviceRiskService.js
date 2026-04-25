import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from '../utils/deviceInfo';

const DEVICE_RISK_SNAPSHOT_STORAGE_KEY = '@device_risk/latest_snapshot';
const DEVICE_RISK_EVENT_QUEUE_STORAGE_KEY = '@device_risk/pending_events';
const MAX_PENDING_EVENTS = 20;

const summarizeDeviceInfo = info => ({
  platform: info?.platform || null,
  device: info?.device
    ? {
        brand: info.device.brand ?? null,
        manufacturer: info.device.manufacturer ?? null,
        modelName: info.device.modelName ?? null,
        modelId: info.device.modelId ?? null,
        designName: info.device.designName ?? null,
        productName: info.device.productName ?? null,
      }
    : null,
  app: info?.app
    ? {
        version: info.app.version ?? null,
        buildNumber: info.app.buildNumber ?? null,
        bundleId: info.app.bundleId ?? null,
        applicationId: info.app.applicationId ?? null,
        nativeBuildVersion: info.app.nativeBuildVersion ?? null,
      }
    : null,
  screen: info?.screen
    ? {
        screenWidth: info.screen.screenWidth ?? info.screen.width ?? null,
        screenHeight: info.screen.screenHeight ?? info.screen.height ?? null,
        windowWidth: info.screen.windowWidth ?? null,
        windowHeight: info.screen.windowHeight ?? null,
        pixelRatio: info.screen.pixelRatio ?? null,
      }
    : null,
  system: info?.system || null,
  locale: info?.locale
    ? {
        locale: info.locale.locale ?? null,
        timezone: info.locale.timezone ?? null,
        region: info.locale.region ?? null,
        currency: info.locale.currency ?? null,
      }
    : null,
  network: info?.network
    ? {
        type: info.network.type ?? null,
        isConnected: info.network.isConnected ?? null,
        isInternetReachable: info.network.isInternetReachable ?? null,
      }
    : null,
});

const persistLatestSnapshot = async snapshot => {
  await AsyncStorage.setItem(
    DEVICE_RISK_SNAPSHOT_STORAGE_KEY,
    JSON.stringify({
      ...snapshot,
      persistedAt: new Date().toISOString(),
    })
  );
};

const appendPendingEvent = async payload => {
  const existingRaw = await AsyncStorage.getItem(DEVICE_RISK_EVENT_QUEUE_STORAGE_KEY);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  const nextQueue = [payload, ...(Array.isArray(existing) ? existing : [])].slice(0, MAX_PENDING_EVENTS);
  await AsyncStorage.setItem(DEVICE_RISK_EVENT_QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
};

const sanitizeMetadata = metadata => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
};

const buildRiskPayload = async ({ scene, action, metadata = {}, includeFullDeviceInfo = false } = {}) => {
  const [deviceInfo, identifiers, stableDeviceId] = await Promise.all([
    DeviceInfo.getDeviceInfo(),
    DeviceInfo.getDeviceIdentifiers(),
    DeviceInfo.getStableDeviceId(),
  ]);

  const payload = {
    scene: scene || 'unknown',
    action: action || 'capture',
    timestamp: new Date().toISOString(),
    stableDeviceId,
    fingerprint: identifiers.fingerprint,
    identifiers,
    deviceSummary: summarizeDeviceInfo(deviceInfo),
    metadata: sanitizeMetadata(metadata),
  };

  if (includeFullDeviceInfo) {
    payload.deviceInfo = deviceInfo;
  }

  return payload;
};

const logRiskEvent = payload => {
  console.log('[DeviceRisk]', JSON.stringify(payload, null, 2));
};

const deviceRiskService = {
  async captureRiskContext(options = {}) {
    const payload = await buildRiskPayload(options);
    await persistLatestSnapshot(payload);
    return payload;
  },

  async recordEvent(options = {}) {
    const payload = await buildRiskPayload(options);
    await Promise.all([
      persistLatestSnapshot(payload),
      appendPendingEvent(payload),
    ]);
    logRiskEvent(payload);
    return payload;
  },

  async recordLoginSuccess({ loginMethod, user } = {}) {
    return this.recordEvent({
      scene: 'auth',
      action: 'login_success',
      includeFullDeviceInfo: false,
      metadata: {
        loginMethod: loginMethod || 'unknown',
        userId: user?.userId ?? null,
        username: user?.username ?? null,
      },
    });
  },

  async recordRechargeEntry({ entryPoint, userId, username } = {}) {
    return this.recordEvent({
      scene: 'wallet',
      action: 'recharge_entry',
      includeFullDeviceInfo: true,
      metadata: {
        entryPoint: entryPoint || 'unknown',
        userId: userId ?? null,
        username: username ?? null,
      },
    });
  },

  async recordWithdrawAttempt({ entryPoint, amount, currency, userId, username } = {}) {
    return this.recordEvent({
      scene: 'wallet',
      action: 'withdraw_attempt',
      includeFullDeviceInfo: true,
      metadata: {
        entryPoint: entryPoint || 'unknown',
        amount: amount ?? null,
        currency: currency ?? null,
        userId: userId ?? null,
        username: username ?? null,
      },
    });
  },

  async getLatestSnapshot() {
    const raw = await AsyncStorage.getItem(DEVICE_RISK_SNAPSHOT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async getPendingEvents() {
    const raw = await AsyncStorage.getItem(DEVICE_RISK_EVENT_QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },
};

export default deviceRiskService;
export {
  DEVICE_RISK_EVENT_QUEUE_STORAGE_KEY,
  DEVICE_RISK_SNAPSHOT_STORAGE_KEY,
};
