import { isDevPreviewFeatureEnabled } from '../devPreviewGate';

describe('isDevPreviewFeatureEnabled', () => {
  it('enables features for development builds', () => {
    expect(
      isDevPreviewFeatureEnabled({
        isDev: true,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: 'production',
      })
    ).toBe(true);
  });

  it('enables features for android preview builds', () => {
    expect(
      isDevPreviewFeatureEnabled({
        isDev: false,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: 'preview',
      })
    ).toBe(true);
  });

  it('disables features for android production builds', () => {
    expect(
      isDevPreviewFeatureEnabled({
        isDev: false,
        simulateProduction: false,
        platformOS: 'android',
        updatesChannel: 'production',
      })
    ).toBe(false);
  });

  it('keeps ios preview builds disabled', () => {
    expect(
      isDevPreviewFeatureEnabled({
        isDev: false,
        simulateProduction: false,
        platformOS: 'ios',
        updatesChannel: 'preview',
      })
    ).toBe(false);
  });
});
