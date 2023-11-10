import testConsole from "test-console";

export const getOutputs = function (
  stdouInspect: testConsole.Inspector,
  stderrInsepct: testConsole.Inspector
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
  testConsole.Inspector,
  testConsole.Inspector
] {
  const stdoutInspect = testConsole.stdout.inspect();
  const stderrInspect = testConsole.stderr.inspect();
  return [stdoutInspect, stderrInspect];
};
