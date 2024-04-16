import { view, ViewOptions } from "./cmd-view";
import { buildPackument } from "../domain/data-packument";
import { makeDomainName } from "../domain/domain-name";
import { makeSemanticVersion } from "../domain/semantic-version";
import { makePackageReference } from "../domain/package-reference";
import { spyOnLog } from "../utils/log.mock";
import { mockUpmConfig } from "../io/upm-config-io.mock";
import { mockProjectVersion } from "../io/project-version-io.mock";
import { unityRegistryUrl } from "../domain/registry-url";
import { mockFetchPackumentService } from "../services/fetch-packument.mock";
import { makePackumentFetchService } from "../services/fetch-packument";
import { exampleRegistryUrl } from "../domain/data-registry";

jest.mock("../services/fetch-packument");

const packageA = makeDomainName("com.example.package-a");
const packageUp = makeDomainName("com.example.package-up");
const packageMissing = makeDomainName("pkg-not-exist");

describe("cmd-view", () => {
  const options: ViewOptions = {
    _global: {
      color: false,
      registry: exampleRegistryUrl,
      upstream: false,
    },
  };
  const upstreamOptions: ViewOptions = {
    _global: {
      color: false,
      registry: exampleRegistryUrl,
    },
  };
  describe("view", () => {
    const remotePackumentA = buildPackument(packageA, (packument) =>
      packument
        .set("time", {
          modified: "2019-11-28T18:51:58.123Z",
          created: "2019-11-28T18:51:58.123Z",
          [makeSemanticVersion("1.0.0")]: "2019-11-28T18:51:58.123Z",
        })
        .set("_rev", "3-418f950115c32bd0")
        .set("readme", "A demo package")
        .addVersion("1.0.0", (version) =>
          version
            .set("displayName", "Package A")
            .set("author", { name: "batman" })
            .set("unity", "2018.4")
            .set("description", "A demo package")
            .set("keywords", [""])
            .set("category", "Unity")
            .set("gitHead", "5c141ecfac59c389090a07540f44c8ac5d07a729")
            .set("readmeFilename", "README.md")
            .set("_nodeVersion", "12.13.1")
            .set("_npmVersion", "6.12.1")
            .set("dist", {
              integrity:
                "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
              shasum: "516957cac4249f95cafab0290335def7d9703db7",
              tarball:
                "https://cdn.example.com/com.example.package-a/com.example.package-a-1.0.0.tgz",
            })
            .addDependency(packageA, "1.0.0")
        )
    );

    const remotePackumentUp = buildPackument(packageUp, (packument) =>
      packument
        .set("time", {
          modified: "2019-11-28T18:51:58.123Z",
          created: "2019-11-28T18:51:58.123Z",
          [makeSemanticVersion("1.0.0")]: "2019-11-28T18:51:58.123Z",
        })
        .set("_rev", "3-418f950115c32bd0")
        .set("readme", "A demo package")
        .addVersion("1.0.0", (version) =>
          version
            .set("displayName", "Package A")
            .set("author", {
              name: "batman",
            })
            .set("unity", "2018.4")
            .set("description", "A demo package")
            .set("keywords", [""])
            .set("category", "Unity")
            .addDependency(packageUp, "1.0.0")
            .set("gitHead", "5c141ecfac59c389090a07540f44c8ac5d07a729")
            .set("readmeFilename", "README.md")
            .set("_nodeVersion", "12.13.1")
            .set("_npmVersion", "6.12.1")
            .set("dist", {
              integrity:
                "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
              shasum: "516957cac4249f95cafab0290335def7d9703db7",
              tarball:
                "https://cdn.example.com/com.example.package-up/com.example.package-up-1.0.0.tgz",
            })
        )
    );

    beforeEach(() => {
      mockUpmConfig(null);

      mockProjectVersion("2020.2.1f1");

      const fetchPackumentService = mockFetchPackumentService(
        [exampleRegistryUrl, remotePackumentA],
        [unityRegistryUrl, remotePackumentUp]
      );
      jest
        .mocked(makePackumentFetchService)
        .mockReturnValue(fetchPackumentService);
    });

    it("should print information for packument without version", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const viewResult = await view(packageA, options);

      expect(viewResult).toBeOk();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("com.example.package-a@1.0.0")
      );
    });
    it("should print information for packument with semantic version", async () => {
      const warnSpy = spyOnLog("warn");

      const viewResult = await view(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(viewResult).toBeError();
      expect(warnSpy).toHaveLogLike("", "do not specify a version");
    });
    it("should fail for unknown packument", async () => {
      const errorSpy = spyOnLog("error");

      const viewResult = await view(packageMissing, options);

      expect(viewResult).toBeError();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });
    it("should print information for upstream packument", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const viewResult = await view(packageUp, upstreamOptions);

      expect(viewResult).toBeOk();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("com.example.package-up@1.0.0")
      );
    });
    it("should fail for unknown upstream packument", async () => {
      const errorSpy = spyOnLog("error");

      const viewResult = await view(packageMissing, upstreamOptions);

      expect(viewResult).toBeError();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });
  });
});
