const superagent = require("superagent");
const Table = require("cli-table");
const { env, getCache, parseEnv } = require("./core");

const searchEndpoint = async function(keyword) {
  let serverUrl = `${env.registry}/-/v1/search?text=${keyword}&size=20&from=0&quality=0.65&popularity=0.98&maintenance=0.5`;
  try {
    console.debug(`http get ${serverUrl}`);
    const response = await superagent.get(serverUrl);
    response.body = JSON.parse(response.text);
    console.debug("remote data:");
    console.debug(response.body);
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
    if (!err.response)
      console.error(`can not reach to registry ${env.registry}`);
    else if (err.response.notFound)
      console.warn(
        "fast search endpoint is not available, fall back to old search."
      );
    else console.error(err.message);
  }
};

const searchOld = async function(keyword) {
  // load cache
  let cache = getCache();
  let cached = cache["all"] || {};
  let cachedObjectsLength = (cached.objects || []).length;
  console.debug(
    `cached ${cachedObjectsLength} package(s) at time ${cached._updated}`
  );
  // all endpoint
  let serverUrl = cached._updated
    ? `${env.registry}/-/all/since?stale=update_after&startkey=${cached._updated}`
    : `${env.registry}/-/all/`;
  try {
    console.debug(`http get ${serverUrl}`);
    const response = await superagent.get(serverUrl).accept("json");
    response.body = JSON.parse(response.text);
    console.debug("remote data:");
    console.debug(response.body);
    let objects = [];
    if (response.body) {
      if (Array.isArray(response.body)) objects = response.body;
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
    cache["all"] = cached;
    // prepare rows
    const rows = allObjects.map(pkg => {
      let name = `${pkg.name}${pkg.displayName ? "\n" + pkg.displayName : ""}`;
      let author = pkg.author ? pkg.author.name : "";
      let date = pkg.time.modified.split("T")[0];
      let item = [name, pkg["dist-tags"].latest, author, date];
      return item;
    });
    // filter keyword
    const klc = keyword.toLowerCase();
    return rows.filter(
      row => row.filter(x => x.toLowerCase().includes(klc)).length > 0
    );
  } catch (err) {
    console.error(err);
    if (!err.response)
      console.error(`can not reach to registry ${env.registry}`);
    else console.error(err.message);
  }
};

const getTable = function() {
  var table = new Table({
    head: ["Name", "Version", "Author", "Date"],
    colWidths: [50, 12, 12, 12]
  });
  return table;
};

module.exports = async function(keyword, options) {
  // parse env
  if (!parseEnv(options, { checkPath: false })) process.exit(1);
  let table = getTable();
  // search endpoint
  let results = await searchEndpoint(keyword);
  if (!results) results = await searchOld(keyword);
  if (results && results.length) {
    results.forEach(x => table.push(x));
    console.log(table.toString());
  } else console.log(`No matches found for "${keyword}"`);
};
