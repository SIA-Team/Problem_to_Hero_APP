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
const expectedIdentifier = 'com.problemvshero.app';

addCheck(Boolean(appJson.expo?.version), 'App version is configured', 'Set expo.version in app.json.');
addCheck(Boolean(appJson.expo?.ios?.buildNumber), 'iOS build number is configured', 'Set expo.ios.buildNumber in app.json.');
addCheck(
  appJson.expo?.ios?.bundleIdentifier === expectedIdentifier,
  'iOS bundle identifier is aligned to com.problemvshero.app',
  'Set expo.ios.bundleIdentifier to com.problemvshero.app in app.json.'
);
addCheck(
  appJson.expo?.android?.package === expectedIdentifier,
  'Android package is aligned to com.problemvshero.app',
  'Set expo.android.package to com.problemvshero.app in app.json.'
);
addCheck(
  appJson.expo?.scheme === 'problemvshero',
  'App scheme is aligned to problemvshero',
  'Set expo.scheme to problemvshero in app.json.'
);
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
  easJson.submit?.production?.ios?.bundleIdentifier === expectedIdentifier,
  'iOS submit profile is pinned to com.problemvshero.app',
  'Set submit.production.ios.bundleIdentifier to com.problemvshero.app in eas.json.'
);
addCheck(
  Boolean(easJson.submit?.production?.ios?.appleTeamId),
  'iOS submit profile pins the Apple Team',
  'Set submit.production.ios.appleTeamId in eas.json.'
);
addCheck(
  easJson.submit?.production?.ios?.ascAppId === '6762328037',
  'iOS submit profile is pinned to the new App Store Connect app record',
  'Set submit.production.ios.ascAppId to 6762328037 in eas.json.'
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
  Boolean(packageJson.scripts?.['ios:submit:prod']),
  'Safe iOS submit script is registered',
  'Add an ios:submit:prod script for eas submit --platform ios --profile production --latest.'
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
  fileContains('App.js', 'preventAutoHideAsync'),
  'Native splash is held until the first screen is ready',
  'Use expo-splash-screen preventAutoHideAsync/hideAsync to avoid splash-to-white-screen gaps.'
);
addCheck(
  fs.existsSync(path.join(projectRoot, 'src', 'utils', '__tests__', 'startupSafety.test.js')),
  'Startup safety tests exist',
  'Add automated tests for startup timeouts and fallback behavior.'
);
addCheck(
  fs.existsSync(path.join(projectRoot, 'src', 'utils', '__tests__', 'nativeSplashGate.test.js')),
  'Native splash gating tests exist',
  'Add automated tests that verify when the native splash can safely hide.'
);
addCheck(
  fileContains('android/app/build.gradle', `namespace '${expectedIdentifier}'`) &&
    fileContains('android/app/build.gradle', `applicationId '${expectedIdentifier}'`),
  'Android native package identifiers match the Expo config',
  'Update android/app/build.gradle namespace and applicationId to com.problemvshero.app.'
);
addCheck(
  fileContains('android/app/src/main/AndroidManifest.xml', 'android:scheme="problemvshero"'),
  'Android manifest deep link scheme matches the Expo scheme',
  'Update android/app/src/main/AndroidManifest.xml to use the problemvshero scheme.'
);
addCheck(
  fs.existsSync(
    path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'problemvshero',
      'app',
      'MainApplication.kt'
    )
  ) &&
    fs.existsSync(
      path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'problemvshero',
        'app',
        'MainActivity.kt'
      )
    ),
  'Android Kotlin entrypoints live under the aligned package path',
  'Move MainActivity.kt and MainApplication.kt into android/app/src/main/java/com/problemvshero/app.'
);
addCheck(
  fileContains('react-native.config.js', "packageName: 'com.problemvshero.app'"),
  'React Native autolinking is pinned to the aligned Android package name',
  'Set project.android.packageName to com.problemvshero.app in react-native.config.js.'
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
