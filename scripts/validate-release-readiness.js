const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const readJson = (relativePath) => {
  const absolutePath = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};

const fileContains = (relativePath, searchValue) => {
  const absolutePath = path.join(projectRoot, relativePath);
  return fs.readFileSync(absolutePath, 'utf8').includes(searchValue);
};

const checks = [];

const addCheck = (passed, title, fixHint) => {
  checks.push({ passed, title, fixHint });
};

const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const packageJson = readJson('package.json');

addCheck(Boolean(appJson.expo?.version), 'App version is configured', 'Set expo.version in app.json.');
addCheck(Boolean(appJson.expo?.ios?.buildNumber), 'iOS build number is configured', 'Set expo.ios.buildNumber in app.json.');
addCheck(Boolean(appJson.expo?.updates?.enabled), 'OTA updates are enabled', 'Enable expo.updates.enabled in app.json.');
addCheck(
  appJson.expo?.updates?.checkAutomatically === 'ON_LOAD',
  'OTA updates check on launch',
  'Set expo.updates.checkAutomatically to ON_LOAD.'
);
addCheck(Boolean(appJson.expo?.runtimeVersion), 'Runtime version is configured', 'Configure expo.runtimeVersion in app.json or app.config.js.');
addCheck(
  Boolean(easJson.build?.production?.channel),
  'Production EAS channel is configured',
  'Set build.production.channel in eas.json.'
);
addCheck(
  Boolean(packageJson.scripts?.['release:check']),
  'release:check script is registered',
  'Add a release:check script to package.json.'
);
addCheck(
  Boolean(packageJson.scripts?.['ios:build:safe']),
  'Safe iOS build script is registered',
  'Add an ios:build:safe script that runs release:check before eas build.'
);
addCheck(
  Boolean(packageJson.scripts?.['android:build:safe']),
  'Safe Android build script is registered',
  'Add an android:build:safe script that runs release:check before eas build.'
);
addCheck(
  fileContains('App.js', 'RootErrorBoundary'),
  'App root is wrapped with RootErrorBoundary',
  'Wrap App content with RootErrorBoundary to avoid blank screens on fatal render errors.'
);
addCheck(
  fileContains('App.js', 'withTimeout'),
  'Startup flow uses timeout protection',
  'Guard startup-critical async work with withTimeout.'
);
addCheck(
  fs.existsSync(path.join(projectRoot, 'src', 'utils', '__tests__', 'startupSafety.test.js')),
  'Startup safety tests exist',
  'Add automated tests for startup timeouts and fallback behavior.'
);

const failedChecks = checks.filter((item) => !item.passed);

console.log('Release readiness checks:');
checks.forEach((item) => {
  console.log(`${item.passed ? 'PASS' : 'FAIL'} - ${item.title}`);
  if (!item.passed) {
    console.log(`  Fix: ${item.fixHint}`);
  }
});

if (failedChecks.length > 0) {
  console.error(`\nRelease readiness failed with ${failedChecks.length} issue(s).`);
  process.exit(1);
}

console.log('\nRelease readiness passed.');
