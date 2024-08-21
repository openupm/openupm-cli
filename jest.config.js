module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  clearMocks: true,
  setupFilesAfterEnv: [
    "./test/project-manifest-assertions.ts",
    "./test/result-assertions.ts",
  ],
};
