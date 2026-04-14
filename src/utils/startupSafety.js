export const STARTUP_STEP_TIMEOUT_MS = 8000;
export const STARTUP_INIT_TIMEOUT_MS = 15000;

export class StartupTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'StartupTimeoutError';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export const withTimeout = async (task, timeoutMs, label = 'operation') => {
  let timeoutId = null;

  try {
    const promise = typeof task === 'function' ? task() : task;

    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new StartupTimeoutError(label, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const getStartupRecoveryNotice = (label = '应用初始化') =>
  `${label}超时，应用已切换到安全模式。请重新登录或稍后重试。`;
