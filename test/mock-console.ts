import testConsole from "test-console";

export type Stream = "out" | "error";

export type MockConsole = {
  hasLineIncluding(stream: Stream, text: string): boolean;
  detach(): void;
};

export function attachMockConsole(): MockConsole {
  const out = testConsole.stdout.inspect();
  const error = testConsole.stderr.inspect();
  return {
    hasLineIncluding(stream: Stream, text: string): boolean {
      const inspector = stream === "out" ? out : error;
      return inspector.output.some((line) => line.includes(text));
    },
    detach() {
      out.restore();
      error.restore();
    },
  };
}
