import { isLanguageSelectionEnabledForRuntime } from '../languageSelectionGate';

describe('languageSelectionGate', () => {
  test('enables language switching in development builds', () => {
    expect(
      isLanguageSelectionEnabledForRuntime({
        isDev: true,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: '',
      })
    ).toBe(true);
  });

  test('keeps language switching enabled when simulating production', () => {
    expect(
      isLanguageSelectionEnabledForRuntime({
        isDev: true,
        simulateProduction: true,
        platformOS: 'android',
        updatesChannel: 'preview',
      })
    ).toBe(true);
  });

  test('enables language switching in Android preview builds', () => {
    expect(
      isLanguageSelectionEnabledForRuntime({
        isDev: false,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: 'preview',
      })
    ).toBe(true);
  });

  test('enables language switching in iOS preview builds', () => {
    expect(
      isLanguageSelectionEnabledForRuntime({
        isDev: false,
        simulateProduction: false,
        platformOS: 'ios',
        updatesChannel: 'preview',
      })
    ).toBe(true);
  });

  test('enables language switching in Android production builds', () => {
    expect(
      isLanguageSelectionEnabledForRuntime({
        isDev: false,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: 'production',
      })
    ).toBe(true);
  });
});
