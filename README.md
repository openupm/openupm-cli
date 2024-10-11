# openupm-cli

![npm](https://img.shields.io/npm/v/openupm-cli) ![NPM](https://img.shields.io/npm/l/openupm-cli) ![npm](https://img.shields.io/npm/dm/openupm-cli)

The command-line tool to maintain the Unity manifest file for 3rd-party upm registries, offering a similar but lighter experience like *npm* or *yarn* for Node.js.

The tool is designed to work with [the OpenUPM registry](https://openupm.com), but can also work with any upm registries, including the official Unity registry.

- [openupm-cli](#openupm-cli)
  - [How it works](#how-it-works)
  - [Installation](#installation)
    - [Windows platform troubleshooting](#windows-platform-troubleshooting)
    - [Cannot find module 'node:net'](#cannot-find-module-nodenet)
  - [Commands](#commands)
    - [Add packages](#add-packages)
    - [Remove packages](#remove-packages)
    - [Search packages](#search-packages)
    - [View package information](#view-package-information)
    - [View package dependencies](#view-package-dependencies)
    - [Global command options](#global-command-options)
  - [Work with proxy](#work-with-proxy)
  - [Contributors](#contributors)

## How it works

The command-line tool installs the 3rd-party registry as a scoped registry and maintains the `Packages/manifest.json` file when adding/removing packages. If the manifest file is modified, the *Unity Package Manager* will detect the changes and try to resolve the package dependencies.

> Notice: the command-line tool does not directly install/uninstall package tarballs, at least for now.

## Installation

- Requires [nodejs 18 or above](https://nodejs.org/en/download/).
- Install via npm:

  ```sh
  npm install -g openupm-cli
  ```

- Or install via [yarn](https://yarnpkg.com/):

  ```sh
  yarn global add openupm-cli
  ```

### Windows platform troubleshooting

If npm is not available in your CMD/PowerShell/Git-Bash, please configure your [environment variables](https://stackoverflow.com/questions/27864040/fixing-npm-path-in-windows-8-and-10).

```
# for npm
c:\Program Files\nodejs

# for npm global bin
C:\Users\{yourName}\AppData\Roaming\npm
```

### Cannot find module 'node:net'

```sh
internal/modules/cjs/loader.js:818
  throw err;
  ^

Error: Cannot find module 'node:net'
```

Please install [Node.js 18 or above](https://nodejs.org/en/download/).

## Commands

### Add packages

Use `openupm add` to add one or more dependencies to your project.

```sh
openupm add com.my.package@1.2.3
```

Checkout [the commands doc page](./docs/cmd-add.md) for more information.

### Remove packages

Use `openupm remove` to remove one or more dependencies from your project.

```sh
openupm remove com.my.package
```

Checkout [the commands doc page](./docs/cmd-remove.md) for more information.

### Search packages

Use `openupm search` to search for remote packages by name.

```sh
openupm search something
```

Checkout [the commands doc page](./docs/cmd-search.md) for more information.

### View package information

Use `openupm view` to view detailed information about a remote package.

```sh
openupm view com.my.package
```

Checkout [the commands doc page](./docs/cmd-view.md) for more information.

### View package dependencies

Use `openupm deps` to print package dependencies.

```sh
openupm deps com.my.package
```

Checkout [the commands doc page](./docs/cmd-deps.md) for more information.

### Global command options

There are also some global options that work for every command. You can read about them [here](./docs/global-opts.md).

## Work with proxy

OpenUPM-CLI supports HTTP, HTTPS, or SOCKS proxy specified by the http_proxy environment variable.

```
http_proxy="http://127.0.0.1:8080" openupm ...
```

You may need to set both http_proxy and https_proxy environment variables at the system-level to [enable Unity work with a proxy](https://forum.unity.com/threads/using-unity-when-behind-a-proxy.69896/).

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://littlebigfun.com"><img src="https://avatars.githubusercontent.com/u/125390?v=4?s=100" width="100px;" alt="Favo Yang"/><br /><sub><b>Favo Yang</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/commits?author=favoyang" title="Code">💻</a> <a href="#maintenance-favoyang" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://comradevanti.itch.io"><img src="https://avatars.githubusercontent.com/u/31240807?v=4?s=100" width="100px;" alt="Ramon Brullo"/><br /><sub><b>Ramon Brullo</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/commits?author=ComradeVanti" title="Code">💻</a> <a href="#maintenance-ComradeVanti" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nowsprinting.github.io/"><img src="https://avatars.githubusercontent.com/u/117617?v=4?s=100" width="100px;" alt="Koji Hasegawa"/><br /><sub><b>Koji Hasegawa</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/commits?author=nowsprinting" title="Code">💻</a> <a href="https://github.com/openupm/openupm-cli/issues?q=author%3Anowsprinting" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.xxwhite.com"><img src="https://avatars.githubusercontent.com/u/26868745?v=4?s=100" width="100px;" alt="MonoLogueChi"/><br /><sub><b>MonoLogueChi</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3AMonoLogueChi" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/from2001vr"><img src="https://avatars.githubusercontent.com/u/387880?v=4?s=100" width="100px;" alt="Masahiro Yamaguchi"/><br /><sub><b>Masahiro Yamaguchi</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3Afrom2001" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/maxhimmel"><img src="https://avatars.githubusercontent.com/u/20761855?v=4?s=100" width="100px;" alt="Max Himmel"/><br /><sub><b>Max Himmel</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3Amaxhimmel" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Zulu-Inuoe"><img src="https://avatars.githubusercontent.com/u/1526310?v=4?s=100" width="100px;" alt="Wilfredo Velázquez-Rodríguez"/><br /><sub><b>Wilfredo Velázquez-Rodríguez</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3AZulu-Inuoe" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TGChrisRArendt"><img src="https://avatars.githubusercontent.com/u/47191729?v=4?s=100" width="100px;" alt="Christopher Arendt"/><br /><sub><b>Christopher Arendt</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3ATGChrisRArendt" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Blackclaws"><img src="https://avatars.githubusercontent.com/u/5792929?v=4?s=100" width="100px;" alt="Felix Winterhalter"/><br /><sub><b>Felix Winterhalter</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3ABlackclaws" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alelievr"><img src="https://avatars.githubusercontent.com/u/6877923?v=4?s=100" width="100px;" alt="Antoine Lelievre"/><br /><sub><b>Antoine Lelievre</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3Aalelievr" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tomorrow.comes.today"><img src="https://avatars.githubusercontent.com/u/6391063?v=4?s=100" width="100px;" alt="Tyler Temp"/><br /><sub><b>Tyler Temp</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/issues?q=author%3ATylerTemp" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://marcbernardtools.com/"><img src="https://avatars.githubusercontent.com/u/59966492?v=4?s=100" width="100px;" alt="Marc Bernard"/><br /><sub><b>Marc Bernard</b></sub></a><br /><a href="https://github.com/openupm/openupm-cli/commits?author=mbtools" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
