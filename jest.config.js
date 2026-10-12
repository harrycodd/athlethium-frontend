/** Smoke tests for the critical app flows. Firebase and the Cloud Functions backend are mocked. */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.tsx'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/style-mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|nativewind|react-native-css-interop|react-native-gifted-charts|gifted-charts-core|firebase|@firebase/.*))',
  ],
  collectCoverageFrom: [
    'src/lib/{api,strava,workout-service,user-service,session-stats}.ts',
    'src/components/{strength-log,session-summary}.tsx',
    'src/hooks/use-auth.tsx',
    'src/app/index.tsx',
    'src/app/wizard.tsx',
    'src/app/?auth?/login.tsx',
    'src/app/?tabs?/index.tsx',
    'src/app/?tabs?/plan.tsx',
  ],
  // Floor for the smoke-tested flows; raise as more of the app is covered.
  coverageThreshold: { global: { lines: 55, statements: 55 } },
  // The onboarding walk-through renders 11 wizard steps; give it headroom on slow CI runners.
  testTimeout: 30000,
  coverageReporters: ['text-summary', 'text', 'json-summary', 'lcov'],
};
