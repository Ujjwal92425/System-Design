/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@sd-os/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@sd-os/db$': '<rootDir>/../../packages/db/src/index.ts',
  },
};
