#!/usr/bin/env node

import npmlog from "npmlog";
import updateNotifier from "update-notifier";
import pkg from "../package.json" with { type: "json" };
import { makeOpenupmCli } from "./cli/index.js";
import type { DebugLog } from "./domain/logging.js";
import {
  getAllRegistryPackumentsUsing,
  getAuthTokenUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "./io/registry.js";

// Composition root

const log = npmlog;

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
