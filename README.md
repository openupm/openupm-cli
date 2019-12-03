# openupm-cli

The command line interface to maintain Unity manifest file for 3rd-party upm registries.

## How it works

The cli adds the 3rd-party registry as a scoped registry, and maintain the scopes and dependencies fields when adding/removing packages. If manifest file is modified, Unity package manager will detect it and try to resolve the changes.

Notice that the cli does not directly resolve dependencies and install/uninstall packages, at least not for now.

## Install openupm-cli

Required [nodejs 12](https://nodejs.org/en/download/), then

```
npm install -g openupm-cli
```

If you prefer [yarn](https://yarnpkg.com/), then
```
yarn global add openupm-cli
```

### Windows troubleshooting

If npm is not available in your cmd/powershell/git-bash, please configure your [environment variables](https://stackoverflow.com/questions/27864040/fixing-npm-path-in-windows-8-and-10).

```
# for npm
c:\Program Files\nodejs

# for npm global bin
C:\Users\{yourName}\AppData\Roaming\npm
```

## Command list

```
openupm add <pkg>
openupm add <pkg>@<version>
openupm remove <pkg>
openupm search <keyword>
```

### Options

The cli assumes current working directory (cwd) is the root of an Unity project (the parent of `Assets` folder). However you can specify the cwd.

```
openupm --chdir <unity-project-path>
```

Specify other 3rd-party registry (defaults to openupm registry).

```
openupm --registry <registry-url>

i.e.
openupm --registry http://127.0.0.1:4873
```

Turn on debug logging

```
openupm --verbose ...
```