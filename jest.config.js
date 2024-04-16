module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  clearMocks: true,
  setupFilesAfterEnv: [
    "./src/domain/project-manifest-assertions.ts",
    "./src/result-assertions.ts",
  ],
};
