import { makeStreamLogger } from "../../../src/cli/logger";

describe("logger", () => {
  function makeDependencies(isTTY = false) {
    const write = jest.fn();
    const log = makeStreamLogger({ write, isTTY });
    const output = () => write.mock.calls.map(([text]) => text).join("");
    return { log, write, output } as const;
  }

  it("should print level and message", () => {
    const { log, output } = makeDependencies();

    log.notice("", "some message");
    log.warn("", "some warning");
    log.error("", "some error");

    expect(output()).toEqual(
      "notice some message\nWARN some warning\nERR! some error\n"
    );
  });

  it("should print prefix after level", () => {
    const { log, output } = makeDependencies();

    log.notice("auth", "some message");

    expect(output()).toEqual("notice auth some message\n");
  });

  it("should print every line of a message with level", () => {
    const { log, output } = makeDependencies();

    log.error("", "line 1\nline 2");

    expect(output()).toEqual("ERR! line 1\nERR! line 2\n");
  });

  it("should not print verbose messages by default", () => {
    const { log, write } = makeDependencies();

    log.verbose("", "some message");

    expect(write).not.toHaveBeenCalled();
  });

  it("should print verbose messages at verbose level", () => {
    const { log, output } = makeDependencies();

    log.level = "verbose";
    log.verbose("", "some message");

    expect(output()).toEqual("verb some message\n");
  });

  it("should not print messages below level", () => {
    const { log, output } = makeDependencies();

    log.level = "warn";
    log.notice("", "some message");
    log.warn("", "some warning");

    expect(output()).toEqual("WARN some warning\n");
  });

  it("should color output for tty", () => {
    const { log, output } = makeDependencies(true);

    log.notice("", "some message");

    expect(output()).toContain("\u001b[");
  });

  it("should not color output after color was disabled", () => {
    const { log, output } = makeDependencies(true);

    log.disableColor();
    log.notice("", "some message");

    expect(output()).toEqual("notice some message\n");
  });
});
