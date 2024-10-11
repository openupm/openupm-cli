
# `openupm view`

The `view` command prints detailed information about a remote package. This can, for example, be used to find out what versions are published for a package.

The command will first search openupm and then the Unity registry to find the package.

This command has the following aliases: `v`, `info` and `show`. On this doc page we will always use the primary command name `view`.

## Arguments

### Package name

The name of the package to view. You should not include a version. 

```sh
openupm view com.my.package
```

## Options

### Registry

By default openupm finds packages to view on the openupm and Unity registries in that order. This behavior is configurable, specifically if you want to work with 3rd party registries. 

You can override the primary registry from which to resolve packages using the  `--registry` option.

```sh
openupm view com.my.package --registry https://packages.my.registry
```

You can also use the `--no-upstream` option if you don't want to resolve from the Unity registry.

```sh
openupm view com.my.package --no-upstream
```

### Windows system-user authentication

This command supports Windows system-user authentication. For more information check out the corresponding [article](./help-system-user.md).