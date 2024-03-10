module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  setupFilesAfterEnv: [
      "./test/mock-console-assertions.ts"
  ]
};
