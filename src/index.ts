#!/usr/bin/env node

import RegClient from "another-npm-registry-client";
import npmlog from "npmlog";
import updateNotifier from "update-notifier";
import pkg from "../package.json";
import { makeOpenupmCli } from "./cli";
import type { DebugLog } from "./domain/logging";
import {
  getAllRegistryPackumentsUsing,
  getAuthTokenUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "./io/registry";

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

const registryClient = new RegClient({ log });
const fetchPackument = getRegistryPackumentUsing(
  registryClient,
  debugLogToConsole
);
const searchRegistry = searchRegistryUsing(debugLogToConsole);
const fetchAllPackuments = getAllRegistryPackumentsUsing(debugLogToConsole);
const getAuthToken = getAuthTokenUsing(registryClient, debugLogToConsole);

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
