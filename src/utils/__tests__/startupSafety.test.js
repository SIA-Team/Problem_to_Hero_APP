import {
  STARTUP_INIT_TIMEOUT_MS,
  STARTUP_STEP_TIMEOUT_MS,
  StartupTimeoutError,
  getStartupRecoveryNotice,
  withTimeout,
} from '../startupSafety';

describe('startupSafety', () => {
  it('resolves successful work before timeout', async () => {
    await expect(
      withTimeout(Promise.resolve('ok'), STARTUP_STEP_TIMEOUT_MS, 'fingerprint')
    ).resolves.toBe('ok');
  });

  it('rejects with StartupTimeoutError when work exceeds timeout', async () => {
    await expect(
      withTimeout(new Promise(() => {}), 5, 'startup init')
    ).rejects.toBeInstanceOf(StartupTimeoutError);
  });

  it('includes a clear safety-mode message', () => {
    expect(getStartupRecoveryNotice('首次启动')).toContain('安全模式');
  });

  it('uses sane startup timeout defaults', () => {
    expect(STARTUP_STEP_TIMEOUT_MS).toBeLessThan(STARTUP_INIT_TIMEOUT_MS);
    expect(STARTUP_INIT_TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
  });
});
