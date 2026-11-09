#!/usr/bin/env node

import updateNotifier from "update-notifier";
import pkg from "../package.json";
import { makeOpenupmCli } from "./cli";
import { makeStreamLogger } from "./cli/logger";
import type { DebugLog } from "./domain/logging";
import {
  getAllRegistryPackumentsUsing,
  getAuthTokenUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "./io/registry";

// Composition root

// Terminal output is asynchronous on Windows, so it could get cut off when we
// call process.exit right after logging.
for (const stream of [process.stdout, process.stderr]) {
  const handle = (
    stream as { _handle?: { setBlocking?: (blocking: boolean) => void } }
  )._handle;
  if (stream.isTTY) handle?.setBlocking?.(true);
}

const log = makeStreamLogger();

const debugLogToConsole: DebugLog = async function (message, context) {
  const contextMessage =
    context !== undefined
      ? `\n${
          context instanceof Error
            ? context.toString()
            : JSON.stringify(context, null, 2)
        }`
      : "";
  return log.verbose("", `${message}${contextMessage}`);
};

const fetchPackument = getRegistryPackumentUsing(debugLogToConsole);
const searchRegistry = searchRegistryUsing(debugLogToConsole);
const fetchAllPackuments = getAllRegistryPackumentsUsing(debugLogToConsole);
const getAuthToken = getAuthTokenUsing(debugLogToConsole);

const openupmCli = makeOpenupmCli(
  fetchPackument,
  searchRegistry,
  fetchAllPackuments,
  getAuthToken,
  log,
  debugLogToConsole
);

// Update in case of update

const notifier = updateNotifier({ pkg });
notifier.notify();

// Run app

openupmCli.parse(process.argv);

// print help if no command is given
if (openupmCli.args.length === 0) openupmCli.help();
