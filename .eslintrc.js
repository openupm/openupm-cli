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
    "jsdoc/require-jsdoc": 0,
    "jsdoc/require-param": 0,
    "jsdoc/require-throws": 1,
    "jsdoc/require-description-complete-sentence": 1,
    "jsdoc/check-param-names": [1, { checkDestructured: false }],
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jsdoc"],
};
