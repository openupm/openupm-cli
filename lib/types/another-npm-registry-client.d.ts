declare module "another-npm-registry-client" {
  class RegClient {
    constructor(...args: unknown[]);
    get(...args: unknown[]): unknown;
    adduser(...args: unknown[]): unknown;
  }
  export = RegClient;
}
