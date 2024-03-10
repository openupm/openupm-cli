import { MockConsole, Stream } from "./mock-console";

expect.extend({
  toHaveLineIncluding(mockConsole: MockConsole, stream: Stream, text: string) {
    const hasLine = mockConsole.hasLineIncluding(stream, text);
    return {
      pass: hasLine,
      message: () =>
        `Expected mock-console to have "${text}" in its "${stream}" stream.`,
    };
  },
});
