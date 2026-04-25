import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import NetInfo from '@react-native-community/netinfo';

class DeviceInfo {
  static buildFingerprintHash(fingerprintData) {
    let hash = 0;

    for (let i = 0; i < fingerprintData.length; i += 1) {
      const char = fingerprintData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }

    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  static buildFallbackFingerprintData() {
    const { width, height } = Dimensions.get('screen');

    return [
      Platform.OS || 'unknown',
      String(Platform.Version ?? 'unknown'),
      Device.brand || 'unknown',
      Device.modelName || 'unknown',
      Device.modelId || 'unknown',
      `${width}x${height}`,
      'safe-fallback',
    ].join('|');
  }

  static generateFallbackFingerprintString() {
    const fallbackData = this.buildFallbackFingerprintData();
    console.log('Using fallback device fingerprint data:', fallbackData);
    return this.buildFingerprintHash(fallbackData);
  }

  static getAndroidBuildInfo() {
    if (Platform.OS !== 'android') {
      return null;
    }

    const androidConstants = Platform.constants || {};

    return {
      sdkInt: androidConstants.Version ?? Platform.Version ?? null,
      release: androidConstants.Release ?? Device.osVersion ?? null,
      serial: androidConstants.Serial ?? null,
      fingerprint: androidConstants.Fingerprint ?? null,
      model: androidConstants.Model ?? Device.modelName ?? null,
      brand: androidConstants.Brand ?? Device.brand ?? null,
      manufacturer: androidConstants.Manufacturer ?? Device.manufacturer ?? null,
      buildId: androidConstants.ID ?? null,
      incremental: androidConstants.Incremental ?? null,
      hardware: androidConstants.Hardware ?? null,
      product: androidConstants.Product ?? null,
      device: androidConstants.Device ?? null,
      board: androidConstants.Board ?? null,
      bootloader: androidConstants.Bootloader ?? null,
      host: androidConstants.Host ?? null,
      tags: androidConstants.Tags ?? null,
      type: androidConstants.Type ?? null,
    };
  }

  static async getPlatformIdentifiers() {
    const identifiers = {
      iosIdfv: null,
      androidId: null,
    };

    if (Platform.OS === 'ios') {
      try {
        identifiers.iosIdfv = await Application.getIosIdForVendorAsync();
      } catch (error) {
        console.warn('Failed to get iOS IDFV:', error);
      }
    }

    if (Platform.OS === 'android') {
      try {
        identifiers.androidId = Application.getAndroidId();
      } catch (error) {
        console.warn('Failed to get Android ID:', error);
      }
    }

    return identifiers;
  }

  static async getDeviceInfo() {
    const { width, height, scale, fontScale } = Dimensions.get('window');
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
    const platformIdentifiers = await this.getPlatformIdentifiers();
    const androidBuildInfo = this.getAndroidBuildInfo();
    const netInfo = await NetInfo.fetch();

    return {
      platform: {
        os: Platform.OS,
        osVersion: Platform.Version,
        isPad: Device.deviceType === Device.DeviceType.TABLET,
        isTV: Device.deviceType === Device.DeviceType.TV,
        isDesktop: Device.deviceType === Device.DeviceType.DESKTOP,
      },

      device: {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        modelId: Device.modelId,
        deviceName: Device.deviceName,
        designName: Device.designName,
        productName: Device.productName,
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
        supportedCpuArchitectures: Device.supportedCpuArchitectures,
      },

      screen: {
        width: screenWidth,
        height: screenHeight,
        screenWidth,
        screenHeight,
        windowWidth: width,
        windowHeight: height,
        scale,
        fontScale,
        pixelRatio: scale,
      },

      app: {
        name: Constants.expoConfig?.name,
        version: Constants.expoConfig?.version,
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode,
        bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package,
        expoVersion: Constants.expoVersion,
        applicationId: Application.applicationId,
        nativeApplicationVersion: Application.nativeApplicationVersion,
        nativeBuildVersion: Application.nativeBuildVersion,
        isDevice: Device.isDevice,
      },

      system: {
        ...(Platform.OS === 'ios' && {
          systemName: Device.osName,
          systemVersion: Device.osVersion,
          platform: Platform.isPad ? 'iPad' : 'iPhone',
          iosIdfv: platformIdentifiers.iosIdfv,
        }),
        ...(Platform.OS === 'android' && {
          apiLevel: Platform.Version,
          systemVersion: Device.osVersion,
          androidId: platformIdentifiers.androidId,
          build: androidBuildInfo,
        }),
      },

      locale: {
        locale: Localization.locale,
        locales: Localization.locales,
        timezone: Localization.timezone,
        region: Localization.region,
        currency: Localization.currency,
        isRTL: Localization.isRTL,
        isMetric: Localization.isMetric,
      },

      network: {
        type: netInfo.type,
        isConnected: netInfo.isConnected,
        isInternetReachable: netInfo.isInternetReachable,
        details: netInfo.details,
      },

      session: {
        installationId: Constants.installationId,
        sessionId: Constants.sessionId,
        isFirstLaunch: false,
      },

      identifiers: {
        iosIdfv: platformIdentifiers.iosIdfv,
        androidId: platformIdentifiers.androidId,
      },

      timestamp: new Date().toISOString(),
    };
  }

  static async getSimpleDeviceInfo() {
    const info = await this.getDeviceInfo();

    return {
      platform: `${info.platform.os} ${info.platform.osVersion}`,
      device: `${info.device.brand || 'Unknown'} ${info.device.modelName || 'Unknown'}`.trim(),
      screen: `${info.screen.screenWidth}x${info.screen.screenHeight}`,
      locale: info.locale.locale,
      network: info.network.type,
      isDevice: info.app.isDevice,
      stableDeviceId: await this.getStableDeviceId(),
    };
  }

  static async printDeviceInfo() {
    const info = await this.getDeviceInfo();
    console.log('Device Info:', JSON.stringify(info, null, 2));
    return info;
  }

  static async generateFingerprintString() {
    const info = await this.getDeviceInfo();

    const components = [
      info.platform.os || 'unknown',
      String(info.platform.osVersion ?? 'unknown'),
      info.device.brand || 'unknown',
      info.device.modelName || 'unknown',
      info.device.modelId || 'unknown',
      `${info.screen.screenWidth}x${info.screen.screenHeight}`,
      info.locale.timezone || 'unknown',
      info.system.iosIdfv || info.system.androidId || 'unknown',
    ];

    const fingerprintData = components.join('|');
    console.log('Device fingerprint source:', fingerprintData);

    return this.buildFingerprintHash(fingerprintData);
  }

  static async getDeviceIdentifiers() {
    try {
      const platformIdentifiers = await this.getPlatformIdentifiers();
      const fingerprint = await this.generateFingerprintString();
      const identifiers = {
        installationId: Constants.installationId,
        sessionId: Constants.sessionId,
        fingerprint,
        iosIdfv: platformIdentifiers.iosIdfv,
        androidId: platformIdentifiers.androidId,
        platformSpecific: platformIdentifiers.iosIdfv || platformIdentifiers.androidId || null,
      };

      console.log('Device identifiers:', {
        installationId: identifiers.installationId,
        fingerprint: identifiers.fingerprint,
        platformSpecific: identifiers.platformSpecific,
      });

      return identifiers;
    } catch (error) {
      console.error('Failed to get device identifiers:', error);

      return {
        installationId: Constants.installationId,
        sessionId: Constants.sessionId,
        fingerprint: await this.generateFingerprintString(),
        iosIdfv: null,
        androidId: null,
        platformSpecific: null,
      };
    }
  }

  static async getStableDeviceId() {
    const identifiers = await this.getDeviceIdentifiers();
    const stableId =
      identifiers.platformSpecific ||
      identifiers.fingerprint ||
      identifiers.installationId;

    console.log('Resolved stable device id:', stableId);
    return stableId;
  }
}

export default DeviceInfo;
