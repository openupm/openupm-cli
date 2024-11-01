import { Command, Option } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { loginUsing } from "../app/login.js";
import { partialApply } from "../domain/fp-utils.js";
import type { DebugLog } from "../domain/logging.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { getUserUpmConfigPathFor } from "../domain/upm-config.js";
import type { ReadTextFile, WriteTextFile } from "../io/fs.js";
import type { GetAuthToken } from "../io/registry.js";
import { withErrorLogger } from "./error-logging.js";
import { systemUserOpt } from "./opt-system-user.js";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./prompts.js";
import { mustBeRegistryUrl } from "./validators.js";

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
    .addOption(systemUserOpt)
    .summary("authenticate with a 3rd party registry")
    .description(
      `Authenticate with a specified 3rd party registry and stores credentials in the users \`.npmrc\`.
openupm login -r https://packages.my-registry.com -u user123 -p ****** -e user123@mail.com`
    )
    .action(
      withErrorLogger(log, async function (options) {
        const homePath = getHomePathFromEnv(process.env);
        const upmConfigPath = getUserUpmConfigPathFor(
          process.env,
          homePath,
          options.systemUser
        );

        // query parameters
        const username = options.username ?? (await promptUsername());
        const password = options.password ?? (await promptPassword());
        const email = options.email ?? (await promptEmail());
        const loginRegistry = options.registry ?? (await promptRegistryUrl());

        await login(
          username,
          password,
          email,
          options.alwaysAuth,
          loginRegistry,
          upmConfigPath,
          options.basicAuth ? "basic" : "token"
        );

        log.notice("auth", `you are authenticated as '${username}'`);
        log.notice("config", "saved unity config at " + upmConfigPath);
      })
    );
}
