#!/usr/bin/env node

if (!process.argv.includes("--cn")) process.argv.push("--cn");
import "./cli";
