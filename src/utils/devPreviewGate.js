const normalizeChannel = (channel) =>
  String(channel || '')
    .trim()
    .toLowerCase();

export const isDevPreviewFeatureEnabled = ({
  isDev = false,
  simulateProduction = false,
  platformOS = '',
  updatesChannel = '',
} = {}) => {
  if (simulateProduction) {
    return false;
  }

  if (isDev) {
    return true;
  }

  return platformOS === 'android' && normalizeChannel(updatesChannel) === 'preview';
};

export default isDevPreviewFeatureEnabled;
