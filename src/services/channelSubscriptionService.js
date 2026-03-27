import AsyncStorage from '@react-native-async-storage/async-storage';

const COMBO_CHANNELS_STORAGE_KEY = '@combo_channels';

const sanitizeChannels = (channels) => {
  if (!Array.isArray(channels)) {
    return [];
  }

  const seen = new Set();

  return channels.filter((channel) => {
    if (typeof channel !== 'string') {
      return false;
    }

    const trimmed = channel.trim();
    if (!trimmed || seen.has(trimmed)) {
      return false;
    }

    seen.add(trimmed);
    return true;
  });
};

export const mergeUniqueChannels = (...channelGroups) => {
  return sanitizeChannels(channelGroups.flat());
};

export const loadComboChannels = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(COMBO_CHANNELS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    return sanitizeChannels(JSON.parse(rawValue));
  } catch (error) {
    console.error('Failed to load combo channels:', error);
    return [];
  }
};

export const saveComboChannels = async (channels) => {
  const sanitizedChannels = sanitizeChannels(channels);

  try {
    await AsyncStorage.setItem(
      COMBO_CHANNELS_STORAGE_KEY,
      JSON.stringify(sanitizedChannels)
    );
  } catch (error) {
    console.error('Failed to save combo channels:', error);
  }

  return sanitizedChannels;
};
