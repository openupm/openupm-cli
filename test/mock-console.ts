import testConsole from "test-console";

export type MockConsoleInspector = testConsole.Inspector;

export const getOutputs = function (
  stdouInspect: MockConsoleInspector,
  stderrInsepct: MockConsoleInspector
): [string, string] {
  const results: [string, string] = [
    stdouInspect.output.join(""),
    stderrInsepct.output.join(""),
  ];
  stdouInspect.restore();
  stderrInsepct.restore();
  return results;
};

export const getInspects = function (): [
  MockConsoleInspector,
  MockConsoleInspector
] {
  const stdoutInspect = testConsole.stdout.inspect();
  const stderrInspect = testConsole.stderr.inspect();
  return [stdoutInspect, stderrInspect];
};
