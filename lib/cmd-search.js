const log = require("loglevel");
const superagent = require("superagent");
const Table = require("cli-table");
const { env, getCache, parseEnv } = require("./core");
const { isConnectionError, is404Error } = require("./error-handler");

const searchEndpoint = async function(keyword) {
  let serverUrl = `${env.registry}/-/v1/search?text=${keyword}&size=20&from=0&quality=0.65&popularity=0.98&maintenance=0.5`;
  try {
    log.debug(`http get ${serverUrl}`);
    const response = await superagent.get(serverUrl).accept("json");
    response.body = JSON.parse(response.text);
    log.debug(`status ${response.status}`);
    log.debug(response.body);
    const objects = response.body.objects || [];
    return objects.map(x => {
      let pkg = x.package;
      let name = `${pkg.name}${pkg.displayName ? "\n" + pkg.displayName : ""}`;
      let author = pkg.author ? pkg.author.name : "";
      let date = pkg.date.split("T")[0];
      let item = [name, pkg.version, author, date];
      return item;
    });
  } catch (err) {
    if (isConnectionError(err))
      log.error(`can not reach to registry ${env.registry}`);
    else if (!is404Error(err)) log.error(err.message);
    log.warn("fast search endpoint is not available, using old search.");
  }
};

const searchOld = async function(keyword) {
  // load cache
  let cache = getCache();
  let cacheKey = process.env.NODE_ENV == "test" ? "test-all" : "all";
  let cached = cache[cacheKey] || {};
  let cachedLen = (cached.objects || []).length;
  log.debug(`cache has ${cachedLen} package(s), updated at ${cached._updated}`);
  // all endpoint
  let serverUrl = cached._updated
    ? `${env.registry}/-/all/since?stale=update_after&startkey=${cached._updated}`
    : `${env.registry}/-/all`;
  try {
    log.debug(`http get ${serverUrl}`);
    const response = await superagent.get(serverUrl).accept("json");
    response.body = JSON.parse(response.text);
    log.debug(`status ${response.status}`);
    log.debug(response.body);
    let objects = [];
    if (response.body) {
      // resposne.body is an array of objects
      if (Array.isArray(response.body)) objects = response.body;
      // response.body is an object
      else {
        if ("_updated" in response.body) delete response.body["_updated"];
        objects = Object.values(response.body);
      }
    }
    // contact cached objects and remote objects
    const allObjects = objects.concat(cached.objects || []);
    // save to cache
    cached.objects = allObjects;
    cached._updated =
      Date.parse(response.header.date) || Math.round(new Date().getTime());
    cache[cacheKey] = cached;
    // prepare rows
    const rows = allObjects.map(pkg => {
      let name = `${pkg.name}${pkg.displayName ? "\n" + pkg.displayName : ""}`;
      let author = pkg.author ? pkg.author.name : "";
      let date = pkg.time.modified.split("T")[0];
      let keywords = (pkg.keywords || []).join(", ");
      let item = [name, pkg["dist-tags"].latest, author, date, keywords];
      return item;
    });
    // filter keyword
    const klc = keyword.toLowerCase();
    return rows.filter(
      row => row.filter(x => x.toLowerCase().includes(klc)).length > 0
    );
  } catch (err) {
    if (isConnectionError(err))
      log.error(`can not reach to registry ${env.registry}`);
    else log.error(err.message);
  }
};

const getTable = function() {
  var table = new Table({
    head: ["Name", "Version", "Author", "Date", "Keywords"],
    colWidths: [50, 12, 12, 12, 12]
  });
  return table;
};

module.exports = async function(keyword, options) {
  // parse env
  if (!parseEnv(options, { checkPath: false })) return 1;
  log.debug(`keyword: ${keyword}`);
  let table = getTable();
  // search endpoint
  let results = await searchEndpoint(keyword);
  if (!results) results = await searchOld(keyword);
  if (results && results.length) {
    results.forEach(x => table.push(x));
    log.info(table.toString());
  } else log.info(`No matches found for "${keyword}"`);
  return 0;
};
