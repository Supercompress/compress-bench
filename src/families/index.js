"use strict";
const FAMILIES = [
  require("./ci-log"),
  require("./py-traceback"),
  require("./tsc-errors"),
  require("./grep-def"),
  require("./find-paths"),
  require("./service-logs"),
  require("./multi-hop"),
  require("./aggregate-fails"),
  require("./git-diff"),
  require("./json-records"),
  require("./sql-table"),
  require("./code-file"),
  require("./docs-rag"),
  require("./chat-transcript"),
];
module.exports = { FAMILIES, byName: Object.fromEntries(FAMILIES.map((f) => [f.name, f])) };
