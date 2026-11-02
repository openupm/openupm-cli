import { Logger } from "npmlog";
import { logError } from "../../../src/cli/error-logging";
import { PackumentNotFoundError } from "../../../src/domain/common-errors";
import { DomainName } from "../../../src/domain/domain-name";

function makeLogger(level: string) {
  return {
    level,
    error: jest.fn(),
    notice: jest.fn(),
  } as unknown as Logger;
}

describe("error logging", () => {
  it("should suggest verbose mode for unrecognized errors", () => {
    const log = makeLogger("notice");

    logError(log, new Error("boom"));

    expect(log.error).toHaveBeenCalledWith("", "A fatal error occurred.");
    expect(log.notice).toHaveBeenCalledWith(
      "",
      "Run with --verbose to get more information."
    );
  });

  it("should log unrecognized errors in verbose mode", () => {
    const log = makeLogger("verbose");

    logError(log, new Error("boom"));

    expect(log.error).toHaveBeenCalledWith("", "A fatal error occurred.");
    expect(log.error).toHaveBeenCalledWith("", expect.stringContaining("boom"));
  });

  it("should log the cause of unrecognized errors in verbose mode", () => {
    const log = makeLogger("verbose");
    const error = new Error("boom", { cause: new Error("root cause") });

    logError(log, error);

    expect(log.error).toHaveBeenCalledWith(
      "",
      expect.stringContaining("Caused by: Error: root cause")
    );
  });

  it("should log non-error values in verbose mode", () => {
    const log = makeLogger("verbose");

    logError(log, "boom");

    expect(log.error).toHaveBeenCalledWith("", "A fatal error occurred.");
    expect(log.error).toHaveBeenCalledWith("", "boom");
  });

  it("should not log stack traces for recognized errors in verbose mode", () => {
    const log = makeLogger("verbose");
    const error = new PackumentNotFoundError(
      DomainName.parse("com.some.package")
    );

    logError(log, error);

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      "",
      'Package "com.some.package" could not be found.'
    );
  });
});
