#!/usr/bin/env node
"use strict";
/** Re-render REPORT.md from an existing results.json (e.g. after changing --rereads). */
const fs = require("fs");
const path = require("path");
const { render } = require("./report");
const pricing = require("./pricing");

const dir = path.resolve(process.argv[2] || path.join(__dirname, "..", "results"));
const res = JSON.parse(fs.readFileSync(path.join(dir, "results.json"), "utf8"));
const i = process.argv.indexOf("--rereads");
if (i > 0) res.meta.rereads = Number(process.argv[i + 1]);
res.meta.prices ||= pricing.MODELS;
res.meta.prices_as_of ||= pricing.PRICES_AS_OF;
res.meta.scenarios ||= pricing.SCENARIOS;
res.meta.rereads ??= 10;
fs.writeFileSync(path.join(dir, "REPORT.md"), render(res));
console.error(`wrote ${path.join(dir, "REPORT.md")}`);
