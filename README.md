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
    - [Authenticate with a scoped registry](#authenticate-with-a-scoped-registry)
      - [Using token](#using-token)
      - [Using basic authentication](#using-basic-authentication)
      - [Always auth](#always-auth)
      - [Windows Subsystem for Linux (WSL)](#windows-subsystem-for-linux-wsl)
      - [Authenticate for the Windows system user](#authenticate-for-the-windows-system-user)
      - [Troubleshooting](#troubleshooting)
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

> openupm will not verify package or resolve dependencies for git, https, and file protocol. See https://docs.unity3d.com/Manual/upm-git.html for more examples of the version string.

You can also add [testables](https://docs.unity3d.com/Manual/cus-tests.html) when importing:
```
openupm --test <pkg>
```

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

### Authenticate with a scoped registry

Starting from Unity 2019.3.4f1, you can configure `.upmconfig.toml` file to authenticate with a scoped registry. The `openupm login` command helps you authenticate with an npm server and store the info to the UPM config file.

There are two ways to authenticate with an npm server:
- using token (recommended): a server-generated string for the grant of access and publishing rights.
- using basic authentication: the `username:password` pair (base64 encoded) is stored to authenticate with the server on each request.

After login, all openupm-cli commands will use `.upmconfig.toml` configuration to authenticate with your private scoped registry.

#### Using token

```
openupm login -u <username> -e <email> -r <registry> -p <password>

i.e.
openupm login -u user1 -e user1@example.com -r http://127.0.0.1:4873
```

If you don't provide a username, email, or password, it will prompt you to input the value. If your npm server doesn't require an email field, you can provide a dummy one like `yourname@example.com`. Notice that requesting a new token is not meant to invalidate old ones for most NPM servers.

For the npm server allows user creation via CLI, providing a new username will create a new user with the information you just provided.

The token is also stored to the `.npmrc` file for convenience.

#### Using basic authentication

Adding `--basic-auth` option to use basic authentication.

```
openupm login -u <username> -e <email> -r <registry> -p <password> --basic-auth

i.e.
openupm login -u user1 -e user1@example.com -r http://127.0.0.1:4873 --basic-auth
```

Notice that your username and password is not verified during the login command, but simply stored to the .upmconfig.toml file. Because verify the password against your npm server will generate a token, which is not what you want here. Basically, type your password carefully.

Unlike using the token, `.npmrc` lacks syntax to support multiple registries for basic authentication. Hence, the `.npmrc` is not updated for the basic authentication.

#### Always auth

Adding `--always-auth` option if tarball files hosted on a different domain other than the registry domain.

```
openupm login -u <username> -e <email> -r <registry> -p <password> --always-auth

i.e.
openupm login -u user1 -e user1@example.com -r http://127.0.0.1:4873 --always-auth
```

#### Windows Subsystem for Linux (WSL)

By default, the command treats the Windows Subsystem for Linux (WSL) as a Linux system. But if you want to authenticate for the Windows (probably where your Unity installed on), add `--wsl` option.


> Known issue: run with `--wsl` option may clear the terminal screen during the process.

#### Authenticate for the Windows system user

Make sure you have the right permission, then add `--system-user` option to authenticate for the Windows system user.

#### Troubleshooting

You can verify the authentication in `.upmconfig.toml` file:

- Windows: `%USERPROFILE%/.upmconfig.toml`
- Windows (System user) : `%ALLUSERSPROFILE%Unity/config/ServiceAccounts/.upmconfig.toml`
- MacOS and Linux: `~/.upmconfig.toml`

For token, it will look like:

```
[npmAuth."http://127.0.0.1:4873"]
email = "email address"
alwaysAuth = false
token = "token string"
```

For basic authentication, it will look like:
```
[npmAuth."http://127.0.0.1:4873"]
email = "email address"
alwaysAuth = true
_auth = "base64 string"
```

Notice that the registry address should match exactly with your `manifest.json`. The last slash is always trimmed. i.e. `http://127.0.0.1:4873` instead of `http://127.0.0.1:4873/`.

Learn more about authentication at https://forum.unity.com/threads/npm-registry-authentication.836308/

### Command options

The cli assumes the current working directory (CWD) is the root of a Unity project (the parent of the `Assets` folder). However, you can specify the CWD.

```
openupm --chdir <unity-project-path>
```

Specify another 3rd-party registry (defaults to the openupm registry)

```
openupm --registry <registry-url>

i.e.
openupm --registry http://127.0.0.1:4873
```

Turn off Unity official (upstream) registry

```
openupm --no-upstream ...
```

Show verbose logging

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

You may need to set both http_proxy and https_proxy environment variables in system-level to [enable Unity work with a proxy](https://forum.unity.com/threads/using-unity-when-behind-a-proxy.69896/).
