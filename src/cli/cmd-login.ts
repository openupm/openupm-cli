import { Command, Option } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { loginUsing } from "../app/login";
import { partialApply } from "../domain/fp-utils";
import type { DebugLog } from "../domain/logging";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { ReadTextFile, WriteTextFile } from "../io/fs";
import type { GetAuthToken } from "../io/registry";
import { withErrorLogger } from "./error-logging";
import { GlobalOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./prompts";
import { mustBeRegistryUrl } from "./validators";

const usernameOpt = new Option("-u, --username <username>", "username").default(
  null
);

const passwordOpt = new Option("-p, --password <password>", "password").default(
  null
);

const emailOpt = new Option("-e, --email <email>", "email address").default(
  null
);

const registryOpt = new Option(
  "-r, --registry <url>",
  "url of registry into which to login"
)
  .argParser(mustBeRegistryUrl)
  .default(null);

const basicAuthOpt = new Option(
  "--basic-auth",
  "use basic authentication instead of token"
).default(false);

const alwaysAuthOpt = new Option(
  "--always-auth",
  "always auth for tarball hosted on a different domain"
).default(false);

/**
 * Makes a {@link LoginCmd} function.
 */
export function makeLoginCmd(
  homePath: string,
  getAuthToken: GetAuthToken,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  log: Logger
) {
  const login = partialApply(
    loginUsing,
    homePath,
    getAuthToken,
    readTextFile,
    writeTextFile,
    debugLog
  );

  return new Command("login")
    .aliases(["add-user", "adduser"])
    .addOption(usernameOpt)
    .addOption(passwordOpt)
    .addOption(emailOpt)
    .addOption(basicAuthOpt)
    .addOption(alwaysAuthOpt)
    .addOption(registryOpt)
    .description("authenticate with a scoped registry")
    .action(
      withErrorLogger(log, async function (loginOptions, cmd) {
        const globalOptions = cmd.optsWithGlobals<GlobalOptions>();

        // parse env
        const env = await parseEnvUsing(
          log,
          process.env,
          process.cwd(),
          globalOptions
        );

        const homePath = getHomePathFromEnv(process.env);
        const upmConfigPath = getUserUpmConfigPathFor(
          process.env,
          homePath,
          env.systemUser
        );

        // query parameters
        const username = loginOptions.username ?? (await promptUsername());
        const password = loginOptions.password ?? (await promptPassword());
        const email = loginOptions.email ?? (await promptEmail());
        const loginRegistry =
          loginOptions.registry ?? (await promptRegistryUrl());

        await login(
          username,
          password,
          email,
          loginOptions.alwaysAuth,
          loginRegistry,
          upmConfigPath,
          loginOptions.basicAuth ? "basic" : "token"
        );

        log.notice("auth", `you are authenticated as '${username}'`);
        log.notice("config", "saved unity config at " + upmConfigPath);
      })
    );
}
