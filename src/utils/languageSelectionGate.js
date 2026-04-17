export const isLanguageSelectionEnabledForRuntime = ({
  isDev = false,
  simulateProduction = false,
  platformOS = '',
  updatesChannel = '',
} = {}) =>
  true;

export default isLanguageSelectionEnabledForRuntime;
