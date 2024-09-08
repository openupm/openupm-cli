module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsdoc/recommended-typescript",
    "prettier",
  ],
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
    "@typescript-eslint/no-floating-promises": "error",
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "jsdoc"],
};
