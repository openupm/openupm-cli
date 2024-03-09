import "should";
import { view, ViewOptions } from "../src/cmd-view";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  registerRemoteUpstreamPackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { attachMockConsole, MockConsole } from "./mock-console";
import { buildPackument } from "./data-packument";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

const packageA = domainName("com.example.package-a");
const packageUp = domainName("com.example.package-up");
const packageMissing = domainName("pkg-not-exist");

describe("cmd-view.ts", function () {
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
  describe("view", function () {
    let mockConsole: MockConsole = null!;
    let mockProject: MockUnityProject = null!;

    const remotePackumentA = buildPackument(packageA, (packument) =>
      packument
        .set("time", {
          modified: "2019-11-28T18:51:58.123Z",
          created: "2019-11-28T18:51:58.123Z",
          [semanticVersion("1.0.0")]: "2019-11-28T18:51:58.123Z",
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
          [semanticVersion("1.0.0")]: "2019-11-28T18:51:58.123Z",
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

    beforeAll(async function () {
      mockProject = await setupUnityProject({});
    });

    beforeEach(function () {
      startMockRegistry();
      registerRemotePackument(remotePackumentA);
      registerMissingPackument(packageMissing);
      registerRemoteUpstreamPackument(remotePackumentUp);
      mockConsole = attachMockConsole();
    });
    afterEach(async function () {
      await mockProject.reset();
      stopMockRegistry();
      mockConsole.detach();
    });

    afterAll(async function () {
      await mockProject.restore();
    });

    it("view pkg", async function () {
      const retCode = await view(packageA, options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-a@1.0.0")
        .should.be.ok();
    });
    it("view pkg@1.0.0", async function () {
      const retCode = await view(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode.should.equal(1);
      mockConsole
        .hasLineIncluding("out", "do not specify a version")
        .should.be.ok();
    });
    it("view pkg-not-exist", async function () {
      const retCode = await view(packageMissing, options);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("view pkg from upstream", async function () {
      const retCode = await view(packageUp, upstreamOptions);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-up@1.0.0")
        .should.be.ok();
    });
    it("view pkg-not-exist from upstream", async function () {
      const retCode = await view(packageMissing, upstreamOptions);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
  });
});
