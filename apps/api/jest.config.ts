import { nestConfig } from '@repo/jest-config';

export default {
  ...nestConfig,
  moduleNameMapper: {
    ...nestConfig.moduleNameMapper,
    '^helper/(.*)$': '<rootDir>/../helper/$1',
  },
};
