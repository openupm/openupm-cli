import { putRegistryAuthIntoUpmConfig } from "../../../src/app/put-registry-auth.js";
import { Base64 } from "../../../src/domain/base64.js";
import type { UpmConfig } from "../../../src/domain/upm-config.js";
import { someRegistryUrl } from "../../common/data-registry.js";

describe("put registry auth into upm config", () => {
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";
  const otherToken = "8zseg974wge4g94whfheghf";

  it("should add entry if it does not exist", () => {
    const actual = putRegistryAuthIntoUpmConfig(null, someRegistryUrl, {
      token: someToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          token: someToken,
        },
      },
    });
  });

  it("should replace entry of same type", () => {
    const initial: UpmConfig = {
      npmAuth: {
        [someRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: "other@email.com",
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, someRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should replace entry of different type", () => {
    const initial: UpmConfig = {
      npmAuth: {
        [someRegistryUrl]: {
          token: someToken,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, someRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should replace entry for url that has trailing slash", () => {
    const initial: UpmConfig = {
      // This entry has an url with a trailing slash, but it should
      // still be replaced.
      [someRegistryUrl + "/"]: {
        token: someToken,
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, someRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
        },
      },
    });
  });

  it("should keep email of token entry", () => {
    const initial: UpmConfig = {
      npmAuth: {
        [someRegistryUrl]: {
          token: someToken,
          email: someEmail,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, someRegistryUrl, {
      token: otherToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          token: otherToken,
          email: someEmail,
        },
      },
    });
  });

  it("should keep always auth if no replacement was provided", () => {
    const initial: UpmConfig = {
      npmAuth: {
        [someRegistryUrl]: {
          token: someToken,
          alwaysAuth: true,
        },
      },
    };

    const actual = putRegistryAuthIntoUpmConfig(initial, someRegistryUrl, {
      token: otherToken,
    });

    expect(actual).toEqual({
      npmAuth: {
        [someRegistryUrl]: {
          token: otherToken,
          alwaysAuth: true,
        },
      },
    });
  });
});
