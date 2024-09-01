import path from "path";
import { emptyNpmrc, setToken } from "../../../src/domain/npmrc";
import { LoadNpmrc, SaveNpmrc } from "../../../src/io/npmrc-io";
import { StoreNpmAuthTokenInNpmrc as PutNpmAuthTokenInNpmrc } from "../../../src/services/put-npm-auth-token";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockFunctionOfType } from "./func.mock";

const exampleHomePath = path.resolve("/users/someuser");
const exampleNpmrcPath = path.resolve("/users/someuser/.npmrc");

describe("put npm auth token in npmrc", () => {
  function makeDependencies() {
    const loadNpmrc = mockFunctionOfType<LoadNpmrc>();
    loadNpmrc.mockResolvedValue(null);

    const saveNpmrc = mockFunctionOfType<SaveNpmrc>();
    saveNpmrc.mockResolvedValue(undefined);

    const putNpmAuthTokenInNpmrc = PutNpmAuthTokenInNpmrc(
      loadNpmrc,
      saveNpmrc,
      exampleHomePath
    );
    return {
      putNpmAuthTokenInNpmrc,
      loadNpmrc,
      saveNpmrc,
    } as const;
  }

  it("should return npmrc path", async () => {
    const { putNpmAuthTokenInNpmrc } = makeDependencies();

    const actual = await putNpmAuthTokenInNpmrc(
      exampleRegistryUrl,
      "some token"
    );

    expect(actual).toEqual(exampleNpmrcPath);
  });

  it("should create npmrc if missing", async () => {
    const expected = setToken(emptyNpmrc, exampleRegistryUrl, "some token");
    const { putNpmAuthTokenInNpmrc, saveNpmrc } = makeDependencies();

    await putNpmAuthTokenInNpmrc(exampleRegistryUrl, "some token");

    expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
  });

  it("should update npmrc if already exists", async () => {
    const { putNpmAuthTokenInNpmrc, loadNpmrc, saveNpmrc } = makeDependencies();
    const initial = setToken(emptyNpmrc, exampleRegistryUrl, "some old token");
    const expected = setToken(initial, exampleRegistryUrl, "some token");
    loadNpmrc.mockResolvedValue(initial);

    await putNpmAuthTokenInNpmrc(exampleRegistryUrl, "some token");

    expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
  });
});
