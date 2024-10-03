# `openupm remove`

The `remove` command removes one or more dependencies from a Unity project. This means that it removes the given packages from the projects direct dependencies. It also removes any unneeded scoped registries.

_Currently openupm does not delete the packages from the package cache. This is left for Unity to do._

You should run this command inside the projects root directory.

This command has the following aliases: `rm` and `uninstall`. On this doc page we will always use the primary command name `remove`.

## Arguments

### Packages

Specify one or more packages for openupm to remove. You should only specify the name of a package ie `com.my.package`.

```sh
openupm remove com.my.package
```

## Options

### Project directory

By default openupm expects that you run the command inside your Unity projects root directory. Based on this it determines relative paths to your package manifest etc.

If you need to run openupm from somewhere else you can change the working directory using the `--chdir`/`-c` option. This option accepts an **absolute** path to a Unity projects root directory.

```sh
openupm remove com.my.package -c /home/user/dev/MyProject
```