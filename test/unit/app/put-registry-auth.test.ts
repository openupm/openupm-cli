import { putRegistryAuthIntoUpmConfig } from "../../../src/app/put-registry-auth";
import { Base64 } from "../../../src/domain/base64";
import { type UpmConfigContent } from "../../../src/io/upm-config-io";
import { exampleRegistryUrl } from "../../common/data-registry";

describe("put registry auth into upm config", () => {
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";
  const otherToken = "8zseg974wge4g94whfheghf";

  it("should add entry if it does not exist", () => {
    const actual = putRegistryAuthIntoUpmConfig(null, exampleRegistryUrl, {
      token: someToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
        },
      },
    });
  });

  it("should replace entry of same type", () => {
    const initial: UpmConfigContent = {
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: "other@email.com",
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should replace entry of different type", () => {
    const initial: UpmConfigContent = {
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should replace entry for url that has trailing slash", () => {
    const initial: UpmConfigContent = {
      // This entry has an url with a trailing slash, but it should
      // still be replaced.
      [exampleRegistryUrl + "/"]: {
        token: someToken,
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should keep email of token entry", () => {
    const initial: UpmConfigContent = {
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
          email: someEmail,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, exampleRegistryUrl, {
      token: otherToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: otherToken,
          email: someEmail,
        },
      },
    });
  });

  it("should keep always auth if no replacement was provided", () => {
    const initial: UpmConfigContent = {
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
          alwaysAuth: true,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, exampleRegistryUrl, {
      token: otherToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: otherToken,
          alwaysAuth: true,
        },
      },
    });
  });
});
