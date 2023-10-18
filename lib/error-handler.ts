// TODO: Use better error types

export const isConnectionError = function (err: any) {
  return err.code == "ENOTFOUND";
};

export const is404Error = function (err: any) {
  return (err.response && err.response.notFound) || err.message.includes("404");
};

const is503Error = function (err: any) {
  return err.response && err.status == 503;
};

export default { isConnectionError, is404Error, is503Error };
