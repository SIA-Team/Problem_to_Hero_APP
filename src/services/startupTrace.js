let startupLogs = [];
const listeners = new Set();
const MAX_STARTUP_LOGS = 200;
const STARTUP_TRACE_ENABLED = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

const emit = () => {
  if (!STARTUP_TRACE_ENABLED) {
    return;
  }

  const snapshot = [...startupLogs];
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn('startup trace listener failed:', error);
    }
  });
};

const pushLog = (entry) => {
  if (!STARTUP_TRACE_ENABLED) {
    return entry;
  }

  startupLogs = [entry, ...startupLogs].slice(0, MAX_STARTUP_LOGS);
  emit();
  return entry;
};

const createTimestamp = () => new Date().toLocaleString('zh-CN');

export const logStartupTrace = (event, payload = {}) => {
  return pushLog({
    id: Date.now() + Math.random(),
    timestamp: createTimestamp(),
    event,
    payload,
    type: 'event',
  });
};

export const startStartupTraceStep = (step, payload = {}) => {
  const startedAt = Date.now();
  pushLog({
    id: `${step}-${startedAt}`,
    timestamp: createTimestamp(),
    event: step,
    payload,
    type: 'start',
    startedAt,
  });

  return {
    success(extra = {}) {
      pushLog({
        id: `${step}-success-${Date.now()}`,
        timestamp: createTimestamp(),
        event: step,
        payload: {
          ...payload,
          ...extra,
        },
        type: 'success',
        durationMs: Date.now() - startedAt,
      });
    },
    fail(error, extra = {}) {
      pushLog({
        id: `${step}-fail-${Date.now()}`,
        timestamp: createTimestamp(),
        event: step,
        payload: {
          ...payload,
          ...extra,
          error: error?.message || String(error || ''),
        },
        type: 'fail',
        durationMs: Date.now() - startedAt,
      });
    },
  };
};

export const getStartupTraceLogs = () => [...startupLogs];

export const clearStartupTraceLogs = () => {
  if (!STARTUP_TRACE_ENABLED) {
    return;
  }

  startupLogs = [];
  emit();
};

export const subscribeStartupTraceLogs = (listener) => {
  if (!STARTUP_TRACE_ENABLED) {
    return () => {};
  }

  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  listener([...startupLogs]);
  return () => listeners.delete(listener);
};
