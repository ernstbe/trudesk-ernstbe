import neostandard from 'neostandard'
import pluginReact from 'eslint-plugin-react'
import globals from 'globals'

export default [
  ...neostandard({
    globals: ['define', 'MG', 'Snackbar', 'ROLES', 'io', 'd3', 'History', 'localStorage', 'location']
  }),
  {
    plugins: {
      react: pluginReact
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error'
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    }
  },
  {
    files: ['docker/**/*.js'],
    rules: {
      'no-global-assign': 'off'
    }
  },
  {
    ignores: [
      'public/',
      'mobile/',
      'src/public/js/plugins/',
      'src/public/js/vendor/',
      'src/client/components/OffCanvasEditor/',
      'node_modules/'
    ]
  }
]
