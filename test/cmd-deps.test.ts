import { DepsOptions, makeDepsCmd } from "../src/cli/cmd-deps";
import { buildPackument } from "./data-packument";
import { makeDomainName } from "../src/domain/domain-name";
import { makePackageReference } from "../src/domain/package-reference";
import { spyOnLog } from "./log.mock";
import { mockResolvedPackuments } from "./packument-resolving.mock";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { mockUpmConfig } from "./upm-config-io.mock";
import { mockProjectVersion } from "./project-version-io.mock";
import { exampleRegistryUrl } from "./data-registry";

function makeDependencies() {
  const depsCmd = makeDepsCmd();
  return [depsCmd] as const;
}

describe("cmd-deps", () => {
  const options: DepsOptions = {
    _global: {
      registry: exampleRegistryUrl,
    },
  };
  describe("deps", () => {
    const remotePackumentA = buildPackument(
      "com.example.package-a",
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.addDependency("com.example.package-b", "1.0.0")
        )
    );
    const remotePackumentB = buildPackument(
      "com.example.package-b",
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.addDependency("com.example.package-up", "1.0.0")
        )
    );
    const remotePackumentUp = buildPackument(
      "com.example.package-up",
      (packument) => packument.addVersion("1.0.0")
    );

    beforeEach(() => {
      mockResolvedPackuments(
        [exampleRegistryUrl, remotePackumentA],
        [exampleRegistryUrl, remotePackumentB],
        [unityRegistryUrl, remotePackumentUp]
      );
      mockProjectVersion("2020.2.1f1");
      mockUpmConfig(null);
    });

    it("should print direct dependencies", async () => {
      const [depsCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");

      const depsResult = await depsCmd(remotePackumentA.name, options);

      expect(depsResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("dependency", remotePackumentB.name);
    });
    it("should print all dependencies when requested", async () => {
      const [depsCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");

      const depsResult = await depsCmd(remotePackumentA.name, {
        ...options,
        deep: true,
      });

      expect(depsResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("dependency", remotePackumentB.name);
      expect(noticeSpy).toHaveLogLike("dependency", remotePackumentUp.name);
    });
    it("should print correct dependencies for latest tag", async () => {
      const [depsCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");

      const depsResult = await depsCmd(
        makePackageReference(remotePackumentA.name, "latest"),
        options
      );

      expect(depsResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("dependency", remotePackumentB.name);
    });
    it("should print correct dependencies for semantic version", async () => {
      const [depsCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");

      const depsResult = await depsCmd(
        makePackageReference(remotePackumentA.name, "1.0.0"),
        options
      );

      expect(depsResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("dependency", remotePackumentB.name);
    });
    it("should print no dependencies for unknown version", async () => {
      const [depsCmd] = makeDependencies();
      const warnLog = spyOnLog("warn");

      const depsResult = await depsCmd(
        makePackageReference(remotePackumentA.name, "2.0.0"),
        options
      );

      expect(depsResult).toBeOk();
      expect(warnLog).toHaveLogLike("404", "is not a valid choice");
    });
    it("should print no dependencies for unknown packument", async () => {
      const [depsCmd] = makeDependencies();
      const warnSpy = spyOnLog("warn");

      const depsResult = await depsCmd(
        makeDomainName("pkg-not-exist"),
        options
      );

      expect(depsResult).toBeOk();
      expect(warnSpy).toHaveLogLike("404", "not found");
    });
    it("should print dependencies for upstream packuments", async () => {
      const [depsCmd] = makeDependencies();
      const depsResult = await depsCmd(remotePackumentUp.name, options);

      expect(depsResult).toBeOk();
    });
  });
});
