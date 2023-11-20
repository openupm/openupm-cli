import "should";
import { remove } from "../src/cmd-remove";
import { PkgManifest } from "../src/types/global";
import { exampleRegistryUrl } from "./mock-registry";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import { attachMockConsole, MockConsole } from "./mock-console";
import {
  shouldHaveManifest,
  shouldHaveRegistryWithScopes,
  shouldNotHaveDependency,
} from "./manifest-assertions";

describe("cmd-remove.ts", function () {
  describe("remove", function () {
    let mockConsole: MockConsole = null!;
    const defaultManifest: PkgManifest = {
      dependencies: {
        "com.example.package-a": "1.0.0",
        "com.example.package-b": "1.0.0",
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: [
            "com.example",
            "com.example.package-a",
            "com.example.package-b",
          ],
          url: exampleRegistryUrl,
        },
      ],
    };
    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", {
        manifest: defaultManifest,
      });
      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      mockConsole.detach();
    });
    it("remove pkg", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove("com.example.package-a", options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldNotHaveDependency(manifest, "com.example.package-a");
      shouldHaveRegistryWithScopes(manifest, [
        "com.example",
        "com.example.package-b",
      ]);
      mockConsole.hasLineIncluding("out", "removed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("remove pkg@1.0.0", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove("com.example.package-a@1.0.0", options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "please replace").should.be.ok();
    });
    it("remove pkg-not-exist", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("remove more than one pkgs", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove(
        ["com.example.package-a", "com.example.package-b"],
        options
      );
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldNotHaveDependency(manifest, "com.example.package-a");
      shouldNotHaveDependency(manifest, "com.example.package-b");
      shouldHaveRegistryWithScopes(manifest, ["com.example"]);
      mockConsole
        .hasLineIncluding("out", "removed com.example.package-a")
        .should.be.ok();
      mockConsole
        .hasLineIncluding("out", "removed com.example.package-b")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
  });
});
