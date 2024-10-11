# `openupm deps`

The `deps` command prints the names and versions of dependencies for a package.

The command will first search openupm and then the Unity registry to find the package.

This command has the `dep` alias. On this doc page we will always use the primary command name `deps`.

## Arguments

### Package reference

The name of the package for which you want to resolve dependencies. The general format for a package reference is `name@version`. 

```sh
openupm deps com.my.package@1.0.0
```

The version may be a specific version or predefined tag. The `deps` command does not work for url versions. For more information about how the version can be specified checkout the corresponding [help page](./help-package-reference.md).


## Options

### Deep

By default the `deps` command will only resolve and print a packages direct dependencies. If you want to recursively print all dependencies (ie the full dependency tree) you can run with the `--deep` option.

```sh
openupm deps com.my.package --deep
```

### Registry

By default openupm finds packages on the openupm and Unity registries in that order. This behavior is configurable, specifically if you want to work with 3rd party registries. 

You can override the primary registry from which to resolve packages using the  `--registry` option.

```sh
openupm deps com.my.package --registry https://packages.my.registry
```

### Windows system-user authentication

This command supports Windows system-user authentication. For more information check out the corresponding [article](./help-system-user.md).