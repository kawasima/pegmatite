import js from "@eslint/js";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "script",
			globals: {
				...globals.browser,
				...globals.webextensions,
				pako: "readonly"
			}
		},
		rules: {
			"indent": ["error", "tab"],
			"linebreak-style": ["error", "unix"],
			"quotes": ["error", "double"],
			"semi": ["error", "always"]
		}
	},
	{
		ignores: ["pegmatite/pako_deflate.min.js", "node_modules/"]
	}
];
