/**
 * ESLint配置文件
 * 企业级代码质量和风格检查配置
 */

module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended'
  ],
  plugins: [
    'jest'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // 基础规则
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    
    // 函数规则
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // 代码复杂度
    'max-len': ['error', { 
      code: 120, 
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    'max-lines': ['warn', { max: 500, skipBlankLines: true }],
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true }],
    'complexity': ['warn', 10],
    
    // 导入规则
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/scripts/**'
      ]
    }],
    
    // 对象和数组
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, consistent: true },
      ObjectPattern: { multiline: true, consistent: true }
    }],
    
    // 注释
    'spaced-comment': ['error', 'always', {
      line: {
        markers: ['/'],
        exceptions: ['-', '+']
      },
      block: {
        markers: ['!'],
        exceptions: ['*'],
        balanced: true
      }
    }],
    
    // 命名约定
    'camelcase': ['error', {
      properties: 'always',
      ignoreDestructuring: false,
      allow: [
        'user_id',
        'created_at',
        'updated_at',
        'deleted_at',
        'app_id',
        'app_secret'
      ]
    }],
    
    // 类和构造函数
    'class-methods-use-this': 'off',
    'new-cap': ['error', {
      newIsCap: true,
      capIsNew: false,
      properties: true
    }],
    
    // 异步处理
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    
    // 安全相关
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Jest测试规则
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      // 测试文件特殊规则
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-unused-expressions': 'off',
        'max-lines-per-function': 'off'
      }
    },
    {
      // 配置文件特殊规则
      files: ['**/config/**/*.js', '**/*.config.js'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      // 脚本文件特殊规则
      files: ['**/scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'logs/',
    'uploads/',
    'temp/',
    '*.min.js'
  ]
}; 