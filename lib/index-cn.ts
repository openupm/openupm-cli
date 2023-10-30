#!/usr/bin/env -S node -r "ts-node/register"

if (!process.argv.includes("--cn")) process.argv.push("--cn");
import "./cli";
