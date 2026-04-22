import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  testEnvironment: 'jest-environment-jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/$1',
    '^@repo/ui/(.*)': '<rootDir>/../packages/ui/$1',
    '^@repo/validation/(.*)': '<rootDir>/../packages/validation/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'lib/services/**/*.ts',
    'store/**/*.ts',
    'components/**/*.tsx',
  ],
  coverageDirectory: 'coverage',
};

export default createJestConfig(config);