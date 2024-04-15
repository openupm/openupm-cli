import { view, ViewOptions } from "../src/cli/cmd-view";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  registerRemoteUpstreamPackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { buildPackument } from "./data-packument";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { makePackageReference } from "../src/domain/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { spyOnLog } from "./log.mock";
import { mockUpmConfig } from "./upm-config-io.mock";
import {mockProjectVersion} from "./project-version-io.mock";

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
    let mockProject: MockUnityProject = null!;

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

    beforeAll(async () => {
      mockProject = await setupUnityProject({});
    });

    beforeEach(() => {
      mockUpmConfig(null);
      startMockRegistry();
      registerRemotePackument(remotePackumentA);
      registerMissingPackument(packageMissing);
      registerRemoteUpstreamPackument(remotePackumentUp);
      mockProjectVersion("2020.2.1f1");
    });
    afterEach(async () => {
      await mockProject.reset();
      stopMockRegistry();
    });

    afterAll(async () => {
      await mockProject.restore();
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
