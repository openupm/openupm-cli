const isConnectionError = function(err) {
  return err.code == "ENOTFOUND";
};

const is404Error = function(err) {
  return err.response && err.response.notFound;
};

module.exports = { isConnectionError, is404Error };
