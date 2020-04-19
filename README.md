# openupm-cli

![npm](https://img.shields.io/npm/v/openupm-cli) ![NPM](https://img.shields.io/npm/l/openupm-cli) ![npm](https://img.shields.io/npm/dm/openupm-cli)

The command-line tool to maintain the Unity manifest file for 3rd-party upm registries, offering a similar but lighter experience like *npm* or *yarn* for NodeJS.

The tool is designed to work with [the OpenUPM registry](https://openupm.com), but can also work with any upm registries, including the official Unity registry.

- [openupm-cli](#openupm-cli)
  - [How it works](#how-it-works)
  - [Installation](#installation)
    - [Windows platform troubleshooting](#windows-platform-troubleshooting)
  - [Commands](#commands)
    - [Add packages](#add-packages)
    - [Remove packages](#remove-packages)
    - [Search packages](#search-packages)
    - [View package information](#view-package-information)
    - [View package dependencies](#view-package-dependencies)
    - [Command options](#command-options)
  - [Work with Unity official (upstream) registry](#work-with-unity-official-upstream-registry)
  - [Work with proxy](#work-with-proxy)

## How it works

The command-line tool installs the 3rd-party registry as a scoped registry and maintains the `Packages/manifest.json` file when adding/removing packages. If the manifest file is modified, the *Unity Package Manager* will detect the changes and try to resolve the package dependencies.

> Notice: the command-line tool does not directly install/uninstall package tarballs, at least for now.

## Installation

Required [nodejs 12](https://nodejs.org/en/download/), then

```
npm install -g openupm-cli
```

If you prefer [yarn](https://yarnpkg.com/), then
```
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

## Commands

### Add packages
```
openupm add <pkg> [otherPkgs..]
openupm add <pkg>@<version>
openupm add <pkg>@git@github.com:...
openupm add <pkg>@https://github.com/...
openupm add <pkg>@file:...
```
The package itself and all dependencies that exist in the registry will be served by the scope registry.

> Notice: openupm will not verify package or resolve dependencies for git, https and file protocol.

### Remove packages
```
openupm remove <pkg> [otherPkgs...]
```

### Search packages
```
openupm search <keyword>
```

If the registry doesn't support the new search endpoint, it will fall back to old `/-/all` endpoint. If no package was found, it will search the Unity official registry instead.

Because the upstream Unity registry doesn't support the search endpoint as of December 2019, the search command will only query the current registry.

### View package information
```
openupm view <pkg>
```

### View package dependencies
```
open deps <pkg>
```

Using option `--deep` to view dependencies recursively

```
open deps <pkg> --deep
```

### Command options

The cli assumes the current working directory (CWD) is the root of a Unity project (the parent of the `Assets` folder). However, you can specify the CWD.

```
openupm --chdir <unity-project-path>
```

Specify another 3rd-party registry (defaults to openupm registry)

```
openupm --registry <registry-url>

i.e.
openupm --registry http://127.0.0.1:4873
```

Turn off Unity official (upstream) registry

```
openupm --no-upstream ...
```

Turn on debug logging

```
openupm --verbose ...
```

## Work with Unity official (upstream) registry

Most commands can fallback to Unity upstream registry if necessary, to make it easier to mix the official registry with a 3rd-party registry. i.e.

```
$ openupm add com.unity.addressables com.littlebigfun.addressable-importer
added: com.unity.addressables@1.4.0                # from unity registry
added: com.littlebigfun.addressable-importer@0.4.1 # from openupm registry
...
```

## Work with proxy

OpenUPM-CLI supports HTTP, HTTPS, or SOCKS proxy specified by the http_proxy environment variable.

```
http_proxy="http://127.0.0.1:8080" openupm ...
```

You may need set both http_proxy and https_proxy environment variables in system-level to [enable Unity work with a proxy](https://forum.unity.com/threads/using-unity-when-behind-a-proxy.69896/).
