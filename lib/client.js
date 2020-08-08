const { promisify } = require("util");
const RegClient = require("npm-registry-client");

const { log } = require("./logger");

/**
 * Return npm client
 */
const getNpmClient = function() {
  // create client
  const client = new RegClient({ log });
  return {
    // The instance of raw npm client
    rawClient: client,
    // Promisified methods
    get: promisify(client.get.bind(client)),
    adduser: promisify(client.adduser.bind(client))
  };
};

module.exports = {
  getNpmClient
};
