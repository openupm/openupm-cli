import { FindNpmrcPath, LoadNpmrc, SaveNpmrc } from "../../src/io/npmrc-io";
import { emptyNpmrc, setToken } from "../../src/domain/npmrc";
import { exampleRegistryUrl } from "../domain/data-registry";
import { makeAuthNpmrc } from "../../src/services/npmrc-auth";
import { mockService } from "./service.mock";

const exampleNpmrcPath = "/users/someuser/.npmrc";

function makeDependencies() {
  const findPath = mockService<FindNpmrcPath>();
  findPath.mockReturnValue(exampleNpmrcPath);

  const loadNpmrc = mockService<LoadNpmrc>();
  loadNpmrc.mockResolvedValue(null);

  const saveNpmrc = mockService<SaveNpmrc>();
  saveNpmrc.mockResolvedValue(undefined);

  const authNpmrc = makeAuthNpmrc(findPath, loadNpmrc, saveNpmrc);
  return { authNpmrc, findPath, loadNpmrc, saveNpmrc } as const;
}

describe("npmrc-auth", () => {
  it("should return npmrc path", async () => {
    const { authNpmrc } = makeDependencies();

    const actual = await authNpmrc(exampleRegistryUrl, "some token");

    expect(actual).toEqual(exampleNpmrcPath);
  });

  it("should create npmrc if missing", async () => {
    const expected = setToken(emptyNpmrc, exampleRegistryUrl, "some token");
    const { authNpmrc, saveNpmrc } = makeDependencies();

    await authNpmrc(exampleRegistryUrl, "some token");

    expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
  });

  it("should update npmrc if already exists", async () => {
    const { authNpmrc, loadNpmrc, saveNpmrc } = makeDependencies();
    const initial = setToken(emptyNpmrc, exampleRegistryUrl, "some old token");
    const expected = setToken(initial, exampleRegistryUrl, "some token");
    loadNpmrc.mockResolvedValue(initial);

    await authNpmrc(exampleRegistryUrl, "some token");

    expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
  });
});
