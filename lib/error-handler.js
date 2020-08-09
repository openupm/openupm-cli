const isConnectionError = function(err) {
  return err.code == "ENOTFOUND";
};

const is404Error = function(err) {
  return (err.response && err.response.notFound) || err.message.includes("404");
};

const is503Error = function(err) {
  return err.response && err.status == 503;
};

module.exports = { isConnectionError, is404Error, is503Error };
