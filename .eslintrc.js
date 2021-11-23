module.exports = {
	extends: ['./eslint-common.js'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		tsconfigRootDir: __dirname,
		project: './tsconfig.json',
	},
}
