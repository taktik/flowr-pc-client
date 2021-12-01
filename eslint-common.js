/* globals module */
module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
	},
	env: {
		es2020: true,
	},
	plugins: ['@typescript-eslint'],
	reportUnusedDisableDirectives: true,
	rules: {
		'no-var': 'error',
		'no-console': [
			'warn',
			{
				allow: ['warn', 'error', 'time', 'timeEnd'],
			},
		],
		'no-duplicate-imports': 'warn',
		eqeqeq: 'error',
		// Enabled rules
		'prefer-const': 'warn',
		'@typescript-eslint/no-useless-constructor': 'warn',
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/prefer-optional-chain': 'warn',
		// you must disable the base rule as it can report incorrect errors
		'no-shadow': 'off',
		'@typescript-eslint/no-shadow': ['warn'],
		// Disabled rules
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/interface-name-prefix': 'off',
		// Special rules
		// The below rules are re-enabled in the "overrides" config, to prevent them from happening in .js files
		'@typescript-eslint/explicit-function-return-type': 'off',
		// Disabling the below rules improves performance
		// https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/FAQ.md#eslint-plugin-import
		'import/named': 'off',
		'import/namespace': 'off',
		'import/default': 'off',
		'import/no-named-as-default-member': 'off',
		"@typescript-eslint/unbound-method": [
			"error",
			{
				"ignoreStatic": true
			}
		],
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-var-requires': 'off',
	},
	// Re-enabling of the disabled rules so they can happen only in .ts files
	overrides: [
		{
			files: ['*.ts'],
			rules: {
				'@typescript-eslint/no-unsafe-assignment': 'error',
				'@typescript-eslint/no-unsafe-call': 'error',
				'@typescript-eslint/no-unsafe-member-access': 'error',
				'@typescript-eslint/no-var-requires': 'error',
			},
		},
	],
}
