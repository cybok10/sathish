import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Core no-unused-vars cannot see JSX usage, so it flags every
      // component/icon referenced only inside JSX as unused.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react/no-unknown-property': 'error',
    },
  },
  {
    // react-three-fiber defines its own JSX intrinsics (mesh, boxGeometry,
    // meshStandardMaterial, ...), so DOM property checking does not apply.
    files: [
      'src/components/mentorship/HeroVisual.jsx',
      'src/components/Lanyard/Lanyard.jsx',
    ],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
  {
    // The blog API and the static export script run in Node, not the browser.
    files: ['server/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // These modules intentionally export hooks/helpers next to components.
    files: [
      'src/blog/router.jsx',
      'src/blog/markdown.jsx',
      'src/blog/admin/AdminApp.jsx',
      'src/components/mentorship/MentorshipNavbar.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
