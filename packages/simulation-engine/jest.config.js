/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  moduleNameMapper: {
    '^@sd-os/shared$': '<rootDir>/../shared/src/index.ts',
  },
};
