const { defineConfig, globalIgnores } = require("eslint/config");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const jsdoc = require("eslint-plugin-jsdoc");
const prettier = require("eslint-config-prettier");

module.exports = defineConfig([
  globalIgnores(["lib/"]),
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      jsdoc.configs["flat/recommended-typescript"],
      prettier,
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
      "jsdoc/require-returns": 0,
      "jsdoc/require-jsdoc": [
        "warn",
        {
          publicOnly: true,
          contexts: [
            "TSTypeAliasDeclaration",
            "TSInterfaceDeclaration",
            "TSPropertySignature",
            "TSMethodSignature",
            "ExportNamedDeclaration > VariableDeclaration",
          ],
        },
      ],
      "jsdoc/require-param": 0,
      "jsdoc/require-throws": 1,
      "jsdoc/require-description-complete-sentence": 1,
      "jsdoc/check-param-names": [1, { checkDestructured: false }],
      // Like param and return types, yield types come from TypeScript.
      "jsdoc/require-yields-type": 0,
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
]);
