# [1.11.0](https://github.com/openupm/openupm-cli/compare/1.10.0...1.11.0) (2020-08-09)


### Bug Fixes

* move --wsl and --system-user as parent options ([0184fa4](https://github.com/openupm/openupm-cli/commit/0184fa485926f9bc45f48e16e94b1d649dbc8d4d))
* use --basic-auth option for basic authentication ([ceddcca](https://github.com/openupm/openupm-cli/commit/ceddcca21bafe6cc60d1c6426e48b4c894b5553c))


### Features

* support auth for add, deps, remove, and view commands ([b41725f](https://github.com/openupm/openupm-cli/commit/b41725f2ed82f3f73bf43f44d763c3c564aca095))
* support auth for the search command ([a96708e](https://github.com/openupm/openupm-cli/commit/a96708e4f2caef5f5bfb636371f1f8f4b86a7dfb))

# [1.10.0](https://github.com/openupm/openupm-cli/compare/1.9.1...1.10.0) (2020-08-08)


### Features

* color output ([aac4ce9](https://github.com/openupm/openupm-cli/commit/aac4ce9d72cc90bfb41fa6d0a3f0a99649bffa91))

## [1.9.1](https://github.com/openupm/openupm-cli/compare/1.9.0...1.9.1) (2020-08-02)


### Bug Fixes

* unauthorized access error handling ([51fcf9d](https://github.com/openupm/openupm-cli/commit/51fcf9d340916829bb51e7e2e4b78282d19ccfd3))

# [1.9.0](https://github.com/openupm/openupm-cli/compare/1.8.3...1.9.0) (2020-08-01)


### Features

* login command to authenticate with npm server ([f7fc503](https://github.com/openupm/openupm-cli/commit/f7fc503c17318deb114127ee6c69819e6ec93d3c))

## [1.8.3](https://github.com/openupm/openupm-cli/compare/1.8.2...1.8.3) (2020-07-27)


### Bug Fixes

* remove unexpected leading space of CLI output ([fbc7f69](https://github.com/openupm/openupm-cli/commit/fbc7f69f0050143e838f47c4a596aad64efa374a))

## [1.8.2](https://github.com/openupm/openupm-cli/compare/1.8.1...1.8.2) (2020-07-26)


### Bug Fixes

* only fallback to old search when new search endpoint is unavailable ([d71e61a](https://github.com/openupm/openupm-cli/commit/d71e61afa8da6b718e6bce6188dc631d3c1cf055))

## [1.8.1](https://github.com/openupm/openupm-cli/compare/1.8.0...1.8.1) (2020-07-26)


### Bug Fixes

* search command (close [#13](https://github.com/openupm/openupm-cli/issues/13)) ([5093423](https://github.com/openupm/openupm-cli/commit/50934239fa216df0267cddc56d661f0289b53ba9))

# [1.8.0](https://github.com/openupm/openupm-cli/compare/1.7.1...1.8.0) (2020-06-18)


### Features

* add test option to the add command ([#9](https://github.com/openupm/openupm-cli/issues/9)) ([9f976bd](https://github.com/openupm/openupm-cli/commit/9f976bd0ab113ec98294a4c90c3e41874d877680))

## [1.7.1](https://github.com/openupm/openupm-cli/compare/1.7.0...1.7.1) (2020-05-13)


### Bug Fixes

* make warning and error level output prefix consistent ([5e8bbbb](https://github.com/openupm/openupm-cli/commit/5e8bbbbabeae8b255713efc8ea66b5f83ac86eed))

# [1.7.0](https://github.com/openupm/openupm-cli/compare/1.6.0...1.7.0) (2020-04-25)


### Features

* support multiple aliases ([43311bc](https://github.com/openupm/openupm-cli/commit/43311bc84b5abda5d96b0ff238bb9ea86c943096))

# [1.6.0](https://github.com/openupm/openupm-cli/compare/1.5.3...1.6.0) (2020-04-19)


### Features

* support http_proxy ([4afde73](https://github.com/openupm/openupm-cli/commit/4afde7393cebda4c9125ddfdd4ba3bd5a5f1be5d))

## [1.5.3](https://github.com/openupm/openupm-cli/compare/1.5.2...1.5.3) (2020-04-10)


### Bug Fixes

* scoped registries shouldn't include upstream packages (close: [#8](https://github.com/openupm/openupm-cli/issues/8)) ([940438a](https://github.com/openupm/openupm-cli/commit/940438a637d065458bfea36ef6bebf162280aa56))
* show existed message if package version existed ([df6ec50](https://github.com/openupm/openupm-cli/commit/df6ec50d02e1ddb7e61461119a4d717a03d85ca1))

## [1.5.2](https://github.com/openupm/openupm-cli/compare/1.5.1...1.5.2) (2020-01-12)


### Bug Fixes

* refs [#2](https://github.com/openupm/openupm-cli/issues/2) openupm search broken on CMD ([50eb8cb](https://github.com/openupm/openupm-cli/commit/50eb8cb2fb3d77e87d6fb84d3fa36e51b812411a))

## [1.5.1](https://github.com/openupm/openupm-cli/compare/1.5.0...1.5.1) (2020-01-10)


### Bug Fixes

* **ci:** ci should commit changes of package.json ([442f383](https://github.com/openupm/openupm-cli/commit/442f383e04d2489332d04789610bdbd4cc68cfd6))
* **ci:** limit @semantic-release/git version ([bf47af0](https://github.com/openupm/openupm-cli/commit/bf47af0952e8dae2c4e9406906de44a2a430222c))

# [1.5.0](https://github.com/openupm/openupm-cli/compare/1.4.3...1.5.0) (2020-01-09)


### Features

* update notifications the CLI app ([d1e43e0](https://github.com/openupm/openupm-cli/commit/d1e43e0251ab9efb81f00c0837e2087b80e3065a))

## [1.4.3](https://github.com/openupm/openupm-cli/compare/1.4.2...1.4.3) (2020-01-08)


### Bug Fixes

* [#1](https://github.com/openupm/openupm-cli/issues/1) command add resolves all dependencies to add to scope registry ([3b603be](https://github.com/openupm/openupm-cli/commit/3b603be3621bb4fa61249e50786d62a6eb120fe5))

## [1.4.2](https://github.com/openupm/openupm-cli/compare/1.4.1...1.4.2) (2020-01-08)


### Bug Fixes

* search command no longer query upstream Unity registry ([8be69d4](https://github.com/openupm/openupm-cli/commit/8be69d41f5244c58b41ac7259a4d24665987f953))

## [1.4.1](https://github.com/openupm/openupm-cli/compare/1.4.0...1.4.1) (2020-01-08)


### Bug Fixes

* add missing lodash lib ([a11a219](https://github.com/openupm/openupm-cli/commit/a11a21908222d15e4b9ace07767705b3e632a696))

# [1.4.0](https://github.com/openupm/openupm-cli/compare/1.3.0...1.4.0) (2020-01-08)


### Features

* command deps to view dependencies ([4c866d0](https://github.com/openupm/openupm-cli/commit/4c866d077aa8e4d9593819c0733d762e059786d5))

# [1.3.0](https://github.com/openupm/openupm-cli/compare/1.2.0...1.3.0) (2020-01-05)


### Features

* command install as an alias of command add ([b0a30f3](https://github.com/openupm/openupm-cli/commit/b0a30f3cdff6249712f532f376d5980354b9e94a))

# [1.2.0](https://github.com/openupm/openupm-cli/compare/1.1.1...1.2.0) (2020-01-05)


### Bug Fixes

* ci release task ([8ad8455](https://github.com/openupm/openupm-cli/commit/8ad8455e9a8c9a00b30c305b82cf1e350d7e7cd5))


### Features

* add auto publishing to ci ([2ff5cf3](https://github.com/openupm/openupm-cli/commit/2ff5cf3cdbcee0a90515ef1ba7383582f5b3cd1e))
* add test to ci ([ba4c4d2](https://github.com/openupm/openupm-cli/commit/ba4c4d230725bd2545003df36341f4ea31eb045d))
