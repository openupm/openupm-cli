# openupm-cli

![npm](https://img.shields.io/npm/v/openupm-cli) ![NPM](https://img.shields.io/npm/l/openupm-cli) ![npm](https://img.shields.io/npm/dm/openupm-cli)

The command line tool to maintain the Unity manifest file for 3rd-party upm registries, offering a similar but lighter experience like *npm* or *yarn* for NodeJS.

The tool is designed to work with [the OpenUPM registry](https://openupm.com), but can also work with any upm registries, including the official unity registry.

- [openupm-cli](#openupm-cli)
  - [How it works](#how-it-works)
  - [Installation](#installation)
    - [Windows platform troubleshooting](#windows-platform-troubleshooting)
  - [Commands](#commands)
    - [Add packages](#add-packages)
    - [Remove packages](#remove-packages)
    - [Search packages](#search-packages)
    - [View package information](#view-package-information)
    - [Command options](#command-options)
    - [Work with unity official (upstream) registry](#work-with-unity-official-upstream-registry)

## How it works

The cli adds the 3rd-party registry as a scoped registry, and maintain the scopes and dependencies fields when adding/removing packages. If manifest file is modified, unity package manager will detect it and try to resolve the changes.

Notice that the cli does not directly resolve dependencies or install/uninstall package tarballs, at least not for now.

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

If npm is not available in your cmd/powershell/git-bash, please configure your [environment variables](https://stackoverflow.com/questions/27864040/fixing-npm-path-in-windows-8-and-10).

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
Notice: openupm will not verify package name for git, https and file protocol.

### Remove packages
```
openupm remove <pkg> [otherPkgs...]
```

### Search packages
```
openupm search <keyword>
```

If the registry doesn't support the new search endpoint, it will fall back to old `/-/all` endpoint. If no package was found, it will search unity official registry instead.

However the search behavior may still performance various for different registries. As of December 2019, unity official registry won't return any results unless the full package name was provided. Make it useless.

### View package information
```
openupm view <pkg>
```

### Command options

The cli assumes current working directory (cwd) is the root of an Unity project (the parent of `Assets` folder). However you can specify the cwd.

```
openupm --chdir <unity-project-path>
```

Specify other 3rd-party registry (defaults to openupm registry)

```
openupm --registry <registry-url>

i.e.
openupm --registry http://127.0.0.1:4873
```

Turn off unity official (upstream) registry

```
openupm --no-upstream ...
```

Turn on debug logging

```
openupm --verbose ...
```

### Work with unity official (upstream) registry

Most commands can fallback to unity upstream registry if necessary, to make it easier to mix official registry with 3rd-party registry. i.e.

```
$ openupm add com.unity.addressables com.littlebigfun.addressable-importer
added: com.unity.addressables@1.4.0                # from unity registry
added: com.littlebigfun.addressable-importer@0.4.1 # from openupm registry
...
```
