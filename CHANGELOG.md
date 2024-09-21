# [4.2.0](https://github.com/openupm/openupm-cli/compare/4.1.2...4.2.0) (2024-09-21)


### Features

* multiple upstreams ([#397](https://github.com/openupm/openupm-cli/issues/397)) ([6d61364](https://github.com/openupm/openupm-cli/commit/6d613647715f468d78fd398d7243666a5354693e))

## [4.1.2](https://github.com/openupm/openupm-cli/compare/4.1.1...4.1.2) (2024-09-07)


### Bug Fixes

* partially resolved dependencies ([#393](https://github.com/openupm/openupm-cli/issues/393)) ([13b5577](https://github.com/openupm/openupm-cli/commit/13b557750fc54a56aad21337055f72a0e275a82f))

## [4.1.1](https://github.com/openupm/openupm-cli/compare/4.1.0...4.1.1) (2024-08-31)


### Bug Fixes

* incorrect import path ([44fe7ea](https://github.com/openupm/openupm-cli/commit/44fe7ea0e5400a5d7403a56bf632b173b8245beb))

# [4.1.0](https://github.com/openupm/openupm-cli/compare/4.0.0...4.1.0) (2024-08-13)


### Features

* custom upm config path ([bad3c0c](https://github.com/openupm/openupm-cli/commit/bad3c0c2d7e1822a01b7fbb855b0d3416d3bba93))

# [4.0.0](https://github.com/openupm/openupm-cli/compare/3.5.0...4.0.0) (2024-08-13)


### misc

* drop wsl ([#383](https://github.com/openupm/openupm-cli/issues/383)) ([f8cbe5b](https://github.com/openupm/openupm-cli/commit/f8cbe5b9016f5fdf256758d2aac02802f7ed3aec))


### BREAKING CHANGES

* The wsl flag allowed users to use their Windows .upmconfig.toml from inside their wsl session. This feature was rarely used and can also be emulated by external means.

If you relied on this feature, please find another way to link to your windows .upmconfig.toml from inside wsl. For example using a symlink.

# [3.5.0](https://github.com/openupm/openupm-cli/compare/3.4.3...3.5.0) (2024-07-29)


### Features

* add new deps output ([#376](https://github.com/openupm/openupm-cli/issues/376)) ([bdc6d74](https://github.com/openupm/openupm-cli/commit/bdc6d74a00f6aeea04839cbc21e4c6a11ca4ce22)), closes [#366](https://github.com/openupm/openupm-cli/issues/366)

## [3.4.3](https://github.com/openupm/openupm-cli/compare/3.4.2...3.4.3) (2024-07-23)


### Bug Fixes

* ts compile error ([46b8394](https://github.com/openupm/openupm-cli/commit/46b839428ad93c7e967d25c14f10723ddf2a7d63))

## [3.4.2](https://github.com/openupm/openupm-cli/compare/3.4.1...3.4.2) (2024-07-18)


### Bug Fixes

* bad version in primary registry issue ([#374](https://github.com/openupm/openupm-cli/issues/374)) ([ea10cb3](https://github.com/openupm/openupm-cli/commit/ea10cb37f0b76bba06ce78b8b726147ac5463d3c))

## [3.4.1](https://github.com/openupm/openupm-cli/compare/3.4.0...3.4.1) (2024-07-18)


### Bug Fixes

* login error ([2380e31](https://github.com/openupm/openupm-cli/commit/2380e315db459c6390d53ba42379575128a2af42))

# [3.4.0](https://github.com/openupm/openupm-cli/compare/3.3.1...3.4.0) (2024-07-18)


### Features

* improve context debug logger ([065358d](https://github.com/openupm/openupm-cli/commit/065358d277007bc51fdbf6b381ce9b606749eac8))

## [3.3.1](https://github.com/openupm/openupm-cli/compare/3.3.0...3.3.1) (2024-07-09)


### Bug Fixes

* 371 error cannot find module node fetch ([#372](https://github.com/openupm/openupm-cli/issues/372)) ([430a434](https://github.com/openupm/openupm-cli/commit/430a43401a0f45de9810d7db67427708a71ea573))

# [3.3.0](https://github.com/openupm/openupm-cli/compare/3.2.0...3.3.0) (2024-07-05)


### Features

* add more error messages ([#368](https://github.com/openupm/openupm-cli/issues/368)) ([44ba315](https://github.com/openupm/openupm-cli/commit/44ba315e8f444dbe09455a7ef9acbeb2876aa73a))

# [3.2.0](https://github.com/openupm/openupm-cli/compare/3.1.0...3.2.0) (2024-06-29)


### Features

* built-in package resolution ([#364](https://github.com/openupm/openupm-cli/issues/364)) ([64e37d9](https://github.com/openupm/openupm-cli/commit/64e37d98ad7a9225bcefd2f8b1859f44a4a1b76e))

# [3.1.0](https://github.com/openupm/openupm-cli/compare/3.0.0...3.1.0) (2024-06-12)


### Features

* **ci:** unity in e2e environment ([#359](https://github.com/openupm/openupm-cli/issues/359)) ([154d827](https://github.com/openupm/openupm-cli/commit/154d827f37d2cc941c0984be800ad3193ad608ac))

# [3.0.0](https://github.com/openupm/openupm-cli/compare/2.3.0...3.0.0) (2024-06-10)


### Bug Fixes

* remove the support for region CN ([#360](https://github.com/openupm/openupm-cli/issues/360)) ([02735ec](https://github.com/openupm/openupm-cli/commit/02735ecc52fd55e1acaae3efd8b646c58ee2765b))


### BREAKING CHANGES

* this change removed the `--cn` parameter and the `openupm-cn` bin script.

# [2.3.0](https://github.com/openupm/openupm-cli/compare/2.2.0...2.3.0) (2024-05-30)


### Features

* extract remove service ([#352](https://github.com/openupm/openupm-cli/issues/352)) ([61ebed9](https://github.com/openupm/openupm-cli/commit/61ebed9f3613f8cfb82321faa2634cc2dda8d769))

# [2.2.0](https://github.com/openupm/openupm-cli/compare/2.1.1...2.2.0) (2024-05-30)


### Features

* improve error messages ([#347](https://github.com/openupm/openupm-cli/issues/347)) ([069970e](https://github.com/openupm/openupm-cli/commit/069970eef08f171f94baa2bd548cc0eaa3329946))

## [2.1.1](https://github.com/openupm/openupm-cli/compare/2.1.0...2.1.1) (2024-05-28)


### Bug Fixes

* improve file-parse error logs ([#345](https://github.com/openupm/openupm-cli/issues/345)) ([c8bc860](https://github.com/openupm/openupm-cli/commit/c8bc860fe99f75cf85ca87d82a238cbd66436d68))

# [2.1.0](https://github.com/openupm/openupm-cli/compare/2.0.1...2.1.0) (2024-05-25)


### Features

* basic env error logging ([#341](https://github.com/openupm/openupm-cli/issues/341)) ([eaca854](https://github.com/openupm/openupm-cli/commit/eaca854118dc568c7bc647fb14b22263fa73f3f3))

## [2.0.1](https://github.com/openupm/openupm-cli/compare/2.0.0...2.0.1) (2024-05-02)


### Bug Fixes

* bad declaration file ([#320](https://github.com/openupm/openupm-cli/issues/320)) ([3d6d888](https://github.com/openupm/openupm-cli/commit/3d6d888402a566510f24bd99121e72f33597d4b1)), closes [#319](https://github.com/openupm/openupm-cli/issues/319)

# [2.0.0](https://github.com/openupm/openupm-cli/compare/1.23.3...2.0.0) (2024-04-29)


### deps

* bump node to 18 ([#315](https://github.com/openupm/openupm-cli/issues/315)) ([51aa180](https://github.com/openupm/openupm-cli/commit/51aa180f8b355202887942e2ec2ab0aaaf39853d))


### BREAKING CHANGES

* This change bumps the projects node version to 18 because 16 is no longer maintained. See #282.

## [1.23.3](https://github.com/openupm/openupm-cli/compare/1.23.2...1.23.3) (2024-04-25)


### Bug Fixes

* adjust incorrect typing ([#288](https://github.com/openupm/openupm-cli/issues/288)) ([a5a055d](https://github.com/openupm/openupm-cli/commit/a5a055d356667a527c84aa0c9e5e2174381f3275))

## [1.23.2](https://github.com/openupm/openupm-cli/compare/1.23.1...1.23.2) (2024-04-24)


### Bug Fixes

* incorrect log ([#287](https://github.com/openupm/openupm-cli/issues/287)) ([320fb36](https://github.com/openupm/openupm-cli/commit/320fb368e13e899234246d06bf624c42b5931356))

## [1.23.1](https://github.com/openupm/openupm-cli/compare/1.23.0...1.23.1) (2024-04-24)


### Bug Fixes

* remove cwd pre-check ([#276](https://github.com/openupm/openupm-cli/issues/276)) ([52f988d](https://github.com/openupm/openupm-cli/commit/52f988da457fd99cd418bba71d6fd0ed05f0cb6d))

# [1.23.0](https://github.com/openupm/openupm-cli/compare/1.22.2...1.23.0) (2024-04-22)


### Features

* deduplicate log ([#275](https://github.com/openupm/openupm-cli/issues/275)) ([31e7f42](https://github.com/openupm/openupm-cli/commit/31e7f42a65f3ca58e493e1f1529516b7972f349c))

## [1.22.2](https://github.com/openupm/openupm-cli/compare/1.22.1...1.22.2) (2024-04-20)


### Bug Fixes

* bad log ([#259](https://github.com/openupm/openupm-cli/issues/259)) ([ac23e7b](https://github.com/openupm/openupm-cli/commit/ac23e7bf5e5e035bd880c22eb661d84dd3d4b9a3))

## [1.22.1](https://github.com/openupm/openupm-cli/compare/1.22.0...1.22.1) (2024-04-15)


### Bug Fixes

* engine warning ([#237](https://github.com/openupm/openupm-cli/issues/237)) ([db7370f](https://github.com/openupm/openupm-cli/commit/db7370f125fac86baeac0f79c811ec7bf305b795))

# [1.22.0](https://github.com/openupm/openupm-cli/compare/1.21.0...1.22.0) (2024-04-15)


### Features

* atomic package remove ([#236](https://github.com/openupm/openupm-cli/issues/236)) ([4cd146c](https://github.com/openupm/openupm-cli/commit/4cd146c849f5995eaefebcafd37df1f325a66743)), closes [#234](https://github.com/openupm/openupm-cli/issues/234)

# [1.21.0](https://github.com/openupm/openupm-cli/compare/1.20.0...1.21.0) (2024-04-15)


### Features

* atomic package add ([#234](https://github.com/openupm/openupm-cli/issues/234)) ([4b2fffc](https://github.com/openupm/openupm-cli/commit/4b2fffc6c975b4295a805d410a6d13ef4de25c52)), closes [#223](https://github.com/openupm/openupm-cli/issues/223)

# [1.20.0](https://github.com/openupm/openupm-cli/compare/1.19.11...1.20.0) (2024-03-20)


### Features

* improve result ok matcher ([4622e68](https://github.com/openupm/openupm-cli/commit/4622e6847d84ad2e417817b702a2370592ccd97e))
* remove manifest-path check from env ([b058bb3](https://github.com/openupm/openupm-cli/commit/b058bb3ae0cf07e7574604ee6d1634989e02adbd))
* upstream-registry auth is always null ([fb1178a](https://github.com/openupm/openupm-cli/commit/fb1178a4f2cac1d1941be2ac51df890dfd2fa507))

## [1.19.11](https://github.com/openupm/openupm-cli/compare/1.19.10...1.19.11) (2024-03-06)


### Bug Fixes

* parse corrected latest version from Unity registry (close [#156](https://github.com/openupm/openupm-cli/issues/156)) ([62aaf2b](https://github.com/openupm/openupm-cli/commit/62aaf2b2779d914a7fed1c98fdf0523de463322d))

## [1.19.10](https://github.com/openupm/openupm-cli/compare/1.19.9...1.19.10) (2024-03-05)


### Bug Fixes

* empty scoped-registry after remove ([#157](https://github.com/openupm/openupm-cli/issues/157)) ([db0537e](https://github.com/openupm/openupm-cli/commit/db0537e90b5048df8140a5b07a17554682767369)), closes [#153](https://github.com/openupm/openupm-cli/issues/153)

## [1.19.9](https://github.com/openupm/openupm-cli/compare/1.19.8...1.19.9) (2024-02-27)


### Bug Fixes

* avoid importing from test folder ([54e34cb](https://github.com/openupm/openupm-cli/commit/54e34cb3445d94b25ad70623baaae211a0ae7858))


### Reverts

* Revert "fix: change the main CLI path to lib/src/*" ([77be353](https://github.com/openupm/openupm-cli/commit/77be353f6bd8ae3c13303230a777ae95c532c3e9))

## [1.19.8](https://github.com/openupm/openupm-cli/compare/1.19.7...1.19.8) (2024-02-27)


### Bug Fixes

* change the main CLI path to lib/src/* ([3fd2c01](https://github.com/openupm/openupm-cli/commit/3fd2c01576865ae833814407a670dc9540d8549f))

## [1.19.7](https://github.com/openupm/openupm-cli/compare/1.19.6...1.19.7) (2024-01-20)


### Bug Fixes

* make not create scopedRegistry when scopes are empty ([#135](https://github.com/openupm/openupm-cli/issues/135)) ([f1a2000](https://github.com/openupm/openupm-cli/commit/f1a20008ef0c3bf19f2995fcb975ac91220d3de0)), closes [#134](https://github.com/openupm/openupm-cli/issues/134)

## [1.19.6](https://github.com/openupm/openupm-cli/compare/1.19.5...1.19.6) (2024-01-09)


### Bug Fixes

* manifest save crash ([#98](https://github.com/openupm/openupm-cli/issues/98)) ([0bf3096](https://github.com/openupm/openupm-cli/commit/0bf30962a1157f2fa3ae373026eddca23fad36ab))
* test selector ([#97](https://github.com/openupm/openupm-cli/issues/97)) ([5624edc](https://github.com/openupm/openupm-cli/commit/5624edc433ae02c4c73926c54490e0135eed21de))

## [1.19.5](https://github.com/openupm/openupm-cli/compare/1.19.4...1.19.5) (2024-01-02)


### Bug Fixes

* trailing slash issue when finding auth in upmconfig ([#94](https://github.com/openupm/openupm-cli/issues/94)) (close [#29](https://github.com/openupm/openupm-cli/issues/29)) ([162f5e8](https://github.com/openupm/openupm-cli/commit/162f5e807c136ab92d44d2be5feb14767cdf764e))

## [1.19.4](https://github.com/openupm/openupm-cli/compare/1.19.3...1.19.4) (2023-12-31)


### Bug Fixes

* dependency was dev-dependency ([#91](https://github.com/openupm/openupm-cli/issues/91)) ([79640df](https://github.com/openupm/openupm-cli/commit/79640df4a2d101f698c7c9927409cf318e96e284))

## [1.19.3](https://github.com/openupm/openupm-cli/compare/1.19.2...1.19.3) (2023-12-29)


### Bug Fixes

* incorrect path in eslint ignore ([#83](https://github.com/openupm/openupm-cli/issues/83)) ([d83e0a7](https://github.com/openupm/openupm-cli/commit/d83e0a77026a4839f3f6dc38bf7596f1d7ec977a))

## [1.19.2](https://github.com/openupm/openupm-cli/compare/1.19.1...1.19.2) (2023-12-28)


### Bug Fixes

* npm auth null ([#81](https://github.com/openupm/openupm-cli/issues/81)) ([1ac0c6e](https://github.com/openupm/openupm-cli/commit/1ac0c6e7f1c060d58ac94b9c2397c040e464f4b2))

## [1.19.1](https://github.com/openupm/openupm-cli/compare/1.19.0...1.19.1) (2023-12-22)


### Bug Fixes

* misc undefined ts errors ([#77](https://github.com/openupm/openupm-cli/issues/77)) ([1a749f6](https://github.com/openupm/openupm-cli/commit/1a749f6018703639ad8ab6ea76eb3e90ec45fee6))

# [1.19.0](https://github.com/openupm/openupm-cli/compare/1.18.1...1.19.0) (2023-12-21)


### Features

* basic cli-argument validation ([#72](https://github.com/openupm/openupm-cli/issues/72)) ([49d0a96](https://github.com/openupm/openupm-cli/commit/49d0a9663dfcd6ab2b08ef983509ad8db434ed28))

## [1.18.1](https://github.com/openupm/openupm-cli/compare/1.18.0...1.18.1) (2023-12-20)


### Bug Fixes

* incorrect error type ([#68](https://github.com/openupm/openupm-cli/issues/68)) ([a0f1abe](https://github.com/openupm/openupm-cli/commit/a0f1abea67a42238e17c1bb8c300661147ead81c))
* type error ([#73](https://github.com/openupm/openupm-cli/issues/73)) ([7303ab6](https://github.com/openupm/openupm-cli/commit/7303ab675eda6f5509e49d6e9ac64cbfab04cd72))

# [1.18.0](https://github.com/openupm/openupm-cli/compare/1.17.0...1.18.0) (2023-12-20)


### Features

* drop namespace logic ([#67](https://github.com/openupm/openupm-cli/issues/67)) ([4a6eef2](https://github.com/openupm/openupm-cli/commit/4a6eef2dc70880a38f1508287ca975c9c16092c3))

# [1.17.0](https://github.com/openupm/openupm-cli/compare/1.16.0...1.17.0) (2023-11-20)


### Features

* require Node.js 16 ([2a04683](https://github.com/openupm/openupm-cli/commit/2a0468313b54c053fab681e61dc93c249ed66298))

# [1.16.0](https://github.com/openupm/openupm-cli/compare/1.15.5...1.16.0) (2023-11-01)


### Features

* convert project to TypeScript ([#52](https://github.com/openupm/openupm-cli/issues/52)), require node v16 ([8e68b9a](https://github.com/openupm/openupm-cli/commit/8e68b9a9a2a1956cdc482ddad90523e4752a8b03)), closes [/github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md#version-800-2021-02-21](https://github.com//github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md/issues/version-800-2021-02-21) [/github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md#version-800-2021-02-21](https://github.com//github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md/issues/version-800-2021-02-21) [/github.com/openupm/openupm-cli/pull/52#issuecomment-1776779428](https://github.com//github.com/openupm/openupm-cli/pull/52/issues/issuecomment-1776779428) [#50](https://github.com/openupm/openupm-cli/issues/50) [/github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md#version-800-2021-02-21](https://github.com//github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md/issues/version-800-2021-02-21) [/github.com/openupm/openupm-cli/pull/52#issuecomment-1776779428](https://github.com//github.com/openupm/openupm-cli/pull/52/issues/issuecomment-1776779428) [/github.com/openupm/openupm-cli/pull/52#discussion_r1375481622](https://github.com//github.com/openupm/openupm-cli/pull/52/issues/discussion_r1375481622) [/github.com/openupm/openupm-cli/pull/52#discussion_r1378008074](https://github.com//github.com/openupm/openupm-cli/pull/52/issues/discussion_r1378008074)

## [1.15.5](https://github.com/openupm/openupm-cli/compare/1.15.4...1.15.5) (2022-10-25)


### Bug Fixes

* parse version and date from different search result formats ([4acb09a](https://github.com/openupm/openupm-cli/commit/4acb09a291f5659eef1273f2c73354dcbc14ef37))

## [1.15.4](https://github.com/openupm/openupm-cli/compare/1.15.3...1.15.4) (2022-05-19)


### Bug Fixes

* **cli:** openupm-cli requires nodejs 14.18 or above ([b38a9b0](https://github.com/openupm/openupm-cli/commit/b38a9b0556100875db30860c0ea8394c89ece4aa))

## [1.15.3](https://github.com/openupm/openupm-cli/compare/1.15.2...1.15.3) (2022-05-10)


### Bug Fixes

* **cli:** require node 14 explicitly ([9882ef9](https://github.com/openupm/openupm-cli/commit/9882ef94458e63cda97aa2437ae0dad3c9aed831))

## [1.15.2](https://github.com/openupm/openupm-cli/compare/1.15.1...1.15.2) (2022-05-09)


### Bug Fixes

* **cli:** adopt cli for commander 9.x ([3696d3c](https://github.com/openupm/openupm-cli/commit/3696d3c9e0841f299dbcf95e1d35fa55f4a077a0))

## [1.15.1](https://github.com/openupm/openupm-cli/compare/1.15.0...1.15.1) (2022-05-08)


### Bug Fixes

* **deps:** update another-npm-registry-client to 8.7.0 ([1f0f013](https://github.com/openupm/openupm-cli/commit/1f0f013cc35bfbc2d6f0e35a93e88e160c0b47bb))

# [1.15.0](https://github.com/openupm/openupm-cli/compare/1.14.3...1.15.0) (2022-05-08)


### Features

* cli requires node 14 ([c51dfb5](https://github.com/openupm/openupm-cli/commit/c51dfb5e620d8ac1c5dc4deaf4f506c72e683182))
* **cli:** remove the '--clean-cache' parameter from the search command ([7cf2cf0](https://github.com/openupm/openupm-cli/commit/7cf2cf0d268ec8a9a971ab373759bbeef14abbcd))

## [1.14.3](https://github.com/openupm/openupm-cli/compare/1.14.2...1.14.3) (2021-04-09)


### Bug Fixes

* allow running cli with npx v7 ([cda0df3](https://github.com/openupm/openupm-cli/commit/cda0df35d7d252d61b4d15f5ba1c8f1b145d83e1))

## [1.14.2](https://github.com/openupm/openupm-cli/compare/1.14.1...1.14.2) (2020-12-15)


### Bug Fixes

* handle editor version with a location build (2020.1.1f1c1) ([fc3e5de](https://github.com/openupm/openupm-cli/commit/fc3e5def5147f3a637d3d16e4430fcdf916af0aa))

## [1.14.1](https://github.com/openupm/openupm-cli/compare/1.14.0...1.14.1) (2020-12-12)


### Bug Fixes

* recognize more Unity internal packages ([377de56](https://github.com/openupm/openupm-cli/commit/377de5663d2af2bf9f00346cc1ab2622585cbf47))

# [1.14.0](https://github.com/openupm/openupm-cli/compare/1.13.0...1.14.0) (2020-11-16)


### Features

* support region CN ([45ed253](https://github.com/openupm/openupm-cli/commit/45ed2535dcaee453e2ba9b4917beab17e4435487))

# [1.13.0](https://github.com/openupm/openupm-cli/compare/1.12.0...1.13.0) (2020-11-15)


### Bug Fixes

* reject package installation if current editor version is not qualified (refs: [#16](https://github.com/openupm/openupm-cli/issues/16)) ([d4b15ac](https://github.com/openupm/openupm-cli/commit/d4b15acb0c945a5d509c0e9a62bb14fb3777925c))
* treat com.unity.ugui as a module ([5c2129c](https://github.com/openupm/openupm-cli/commit/5c2129cefee7221fc8a1a978012fcfaca84cd4e8))


### Features

* fail if missing dependencies for command add, unless add option -f ([920d7a4](https://github.com/openupm/openupm-cli/commit/920d7a4523ac085fdfecd0e46ef9f1f0cce162d0))

# [1.12.0](https://github.com/openupm/openupm-cli/compare/1.11.0...1.12.0) (2020-11-13)


### Features

* add versions info to the view command ([c76b21d](https://github.com/openupm/openupm-cli/commit/c76b21d0b5c361a592e2721cdf5aad72d7329960))

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

* command "install" as an alias of command add ([b0a30f3](https://github.com/openupm/openupm-cli/commit/b0a30f3cdff6249712f532f376d5980354b9e94a))

# [1.2.0](https://github.com/openupm/openupm-cli/compare/1.1.1...1.2.0) (2020-01-05)


### Bug Fixes

* ci release task ([8ad8455](https://github.com/openupm/openupm-cli/commit/8ad8455e9a8c9a00b30c305b82cf1e350d7e7cd5))


### Features

* add auto publishing to ci ([2ff5cf3](https://github.com/openupm/openupm-cli/commit/2ff5cf3cdbcee0a90515ef1ba7383582f5b3cd1e))
* add test to ci ([ba4c4d2](https://github.com/openupm/openupm-cli/commit/ba4c4d230725bd2545003df36341f4ea31eb045d))
