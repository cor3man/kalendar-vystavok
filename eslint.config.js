import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // CLAUDE.md: no `any`; non-null assertions only with a justifying eslint-disable comment.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // CLAUDE.md: domain and layout are pure TypeScript (no DOM, no browser APIs, no clock).
    files: ['src/domain/**/*.ts', 'src/layout/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'indexedDB',
        'fetch',
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Inject the date instead of calling Date.now() in domain/layout.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Inject the date instead of new Date() in domain/layout.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'react/*', '*/ui/*', '*/render/*', '*/state/*'] },
      ],
    },
  },
  {
    files: ['*.config.{ts,js}', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
