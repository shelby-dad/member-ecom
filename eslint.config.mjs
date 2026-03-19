import js from '@eslint/js'

export default [
  { ignores: ['.nuxt', '.output', 'node_modules', 'dist', '**/*.min.js', 'app/**'] },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ...(js.configs.recommended.languageOptions ?? {}),
      globals: {
        ...(js.configs.recommended.languageOptions?.globals ?? {}),
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
]
