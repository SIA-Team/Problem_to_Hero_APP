const fs = require('fs');
const path = require('path');
const { getConfig } = require('expo/config');
const { createFingerprintForBuildAsync } = require('expo-updates/utils/build/createFingerprintForBuildAsync');

const projectRoot = path.resolve(__dirname, '..');
const fingerprintDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
const fingerprintFile = path.join(fingerprintDir, 'fingerprint');
const HASH_PATTERN = /^[a-f0-9]{40}$/i;

function isFingerprintPolicy(runtimeVersion) {
  return Boolean(runtimeVersion) &&
    typeof runtimeVersion === 'object' &&
    runtimeVersion.policy === 'fingerprint';
}

function readRawFingerprintValue() {
  if (!fs.existsSync(fingerprintFile)) {
    return null;
  }

  return fs.readFileSync(fingerprintFile, 'utf8');
}

function normalizeFingerprintValue(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function isValidFingerprintHash(value) {
  return typeof value === 'string' && HASH_PATTERN.test(value);
}

function writeNormalizedFingerprint(value) {
  const normalizedValue = normalizeFingerprintValue(value);
  fs.writeFileSync(fingerprintFile, normalizedValue, 'utf8');
  return normalizedValue;
}

function tryRepairFromJson(rawValue) {
  const normalizedValue = normalizeFingerprintValue(rawValue);
  if (!normalizedValue || (normalizedValue[0] !== '{' && normalizedValue[0] !== '[')) {
    return false;
  }

  try {
    const parsed = JSON.parse(normalizedValue);
    if (parsed && typeof parsed.hash === 'string' && isValidFingerprintHash(parsed.hash)) {
      writeNormalizedFingerprint(parsed.hash);
      console.log('[fingerprint] Repaired malformed JSON output by extracting its hash field.');
      return true;
    }
  } catch {
    // Fall through to full regeneration below.
  }

  return false;
}

async function ensureFingerprintAsync() {
  const { exp } = getConfig(projectRoot, {
    isPublicConfig: true,
    skipSDKVersionRequirement: true,
  });

  const runtimeVersion = exp.android?.runtimeVersion ?? exp.runtimeVersion;
  if (!isFingerprintPolicy(runtimeVersion)) {
    console.log('[fingerprint] Runtime version policy is not fingerprint. Skipping.');
    return;
  }

  fs.mkdirSync(fingerprintDir, { recursive: true });

  const existingRawValue = readRawFingerprintValue();
  const existingValue = normalizeFingerprintValue(existingRawValue);
  if (isValidFingerprintHash(existingValue)) {
    if (existingRawValue !== existingValue) {
      writeNormalizedFingerprint(existingValue);
      console.log('[fingerprint] Normalized Android fingerprint whitespace.');
      return;
    }
    console.log('[fingerprint] Existing Android fingerprint is valid.');
    return;
  }

  if (existingRawValue && tryRepairFromJson(existingRawValue)) {
    return;
  }

  console.log('[fingerprint] Android fingerprint is missing or invalid. Regenerating...');
  await createFingerprintForBuildAsync('android', projectRoot, fingerprintDir);

  const regeneratedValue = writeNormalizedFingerprint(readRawFingerprintValue());
  if (!isValidFingerprintHash(regeneratedValue)) {
    throw new Error('Expo fingerprint regeneration finished, but the generated file is still invalid.');
  }

  console.log(`[fingerprint] Regenerated Android fingerprint: ${regeneratedValue}`);
}

ensureFingerprintAsync().catch((error) => {
  console.error(`[fingerprint] ${error.message}`);
  process.exit(1);
});
