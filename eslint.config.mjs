import next from '@next/eslint-plugin-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  next.configs['core-web-vitals'],
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
];
