const npmSearch = require("libnpmsearch");
const npmFetch = require("npm-registry-fetch");
const Table = require("cli-table");

const { log } = require("./logger");
const {
  env,
  getLatestVersion,
  getNpmFetchOptions,
  parseEnv
} = require("./core");
const { isConnectionError, is404Error } = require("./error-handler");

const searchEndpoint = async function(keyword, registry) {
  if (!registry) registry = env.registry;
  try {
    const results = await npmSearch(keyword, getNpmFetchOptions());
    log.verbose("npmsearch", results);
    return results.map(x => {
      return [
        x.name,
        x["dist-tags"] ? x["dist-tags"].latest : "",
        x.time && x.time.modified ? x.time.modified.split("T")[0] : "",
        ""
      ];
    });
  } catch (err) {
    if (!is404Error(err)) log.error("", err.message);
    log.warn("", "fast search endpoint is not available, using old search.");
  }
};

const searchOld = async function(keyword) {
  // all endpoint
  try {
    const results = await npmFetch.json("/-/all", getNpmFetchOptions());
    log.verbose("endpoint.all", results);
    let objects = [];
    if (results) {
      if (Array.isArray(results)) {
        // results is an array of objects
        objects = results;
      } else {
        // results is an object
        if ("_updated" in results) delete results["_updated"];
        objects = Object.values(results);
      }
    }
    // prepare rows
    const rows = objects.map(pkg => {
      let name = pkg.name;
      let version = getLatestVersion(pkg);
      let date =
        pkg.time && pkg.time.modified ? pkg.time.modified.split("T")[0] : "";
      let item = [name, version, date, ""];
      return item;
    });
    // filter keyword
    const klc = keyword.toLowerCase();
    return rows.filter(
      row => row.filter(x => x.toLowerCase().includes(klc)).length > 0
    );
  } catch (err) {
    if (!is404Error(err)) log.error("", err.message);
    log.warn("", "/-/all endpoint is not available");
  }
};

const getTable = function() {
  var table = new Table({
    head: ["Name", "Version", "Date"],
    colWidths: [42, 20, 12]
  });
  return table;
};

module.exports = async function(keyword, options) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  let table = getTable();
  // search endpoint
  let results = await searchEndpoint(keyword);
  // search old search
  if (results === undefined) {
    results = (await searchOld(keyword)) || [];
  }
  // search upstream
  // if (env.upstream) {
  //   const upstreamResults =
  //     (await searchEndpoint(keyword, env.upstreamRegistry)) || [];
  //   results.push(...upstreamResults);
  // }
  if (results && results.length) {
    results.forEach(x => table.push(x.slice(0, -1)));
    console.log(table.toString());
  } else log.notice("", `No matches found for "${keyword}"`);
  return 0;
};
