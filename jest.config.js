module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  clearMocks: true,
  setupFilesAfterEnv: [
    "./test/domain/project-manifest-assertions.ts",
    "./test/result-assertions.ts",
  ],
};
