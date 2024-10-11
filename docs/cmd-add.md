# `openupm add`

The `add` command adds one or more dependencies to a Unity project. This
means that it adds the given packages to the projects direct dependencies as well as configuring scoped registries so that Unity can
resolve the dependencies.

_Currently openupm does not install the dependencies into the project itself. This is left for Unity to do._

You should run this command inside the projects root directory.

This command has the following aliases: `install` and `i`. On this doc page we will always use the primary command name `add`.

## Arguments

### Packages

Specify one or more packages for openupm to add. The general format for a package reference is `name@version`. 

```sh
openupm add com.my.package@1.0.0
```

The version may be one of the following options:

#### No version

This is identical to using the `latest` tag.  

Example: `com.my.package`

#### A specific version

Installs the specific given version.

Example: `com.my.package@1.2.0`

#### The latest tag

This resolves the latest published version, including pre-releases. 

Example: `com.my.package@latest`

#### The stable tag

This resolves the latest published stable version, excluding pre-releases

Example: `com.my.package@latest`


#### A git url

A `http` or `git` based url to a git repository. Checkout the [Unity documentation on the topic](https://docs.unity3d.com/Manual/upm-git.html#syntax) [^1].

Examples (taken from the Unity documentation):

- `com.my.package@https://github.example.com/myuser/myrepository1.git`
- `com.my.package@git@github.example.com/myuser/myrepository2.git`

#### A local file url

A `file` based url to a local package. Check out the [Unity documentation on the topic](https://docs.unity3d.com/Manual/upm-localpath.html) [^1].

Example (Taken from Unity documentation): `com.my.package@file:../github/my_package_folder`

## Options

### Testables

If you also want to add packages to the [projects testables](https://docs.unity3d.com/Manual/upm-manifestPrj.html#testables) run the command with the `--test` option.

```sh
openupm add com.my.package --test
```

### Force

By default openupm validates added packages to check whether they can be added to the project [^1]. Specifically openupm will check whether all indirect dependencies can be resolved and whether the package is compatible with the projects editor version. If validation fails then the package can not be added.

If you know what you doing and want to add the package even though there are validation problems you can run with the `--force`/`-f` option to bypass validation.

```sh
openupm add com.my.package --force
```

### Registry

By default openupm resolves packages from the openupm and Unity registries in that order. This behavior is configurable, specifically if you want to work with 3rd party registries. 

You can override the primary registry from which to resolve packages using the  `--registry` option.

```sh
openupm add com.my.package --registry https://packages.my.registry
```

You can also use the `--no-upstream` option if you don't want to resolve from the Unity registry.

```sh
openupm add com.my.package --no-upstream
```

For more information read [the help article about working with 3rd party registries](./help-registry.md).

### Project directory

By default openupm expects that you run the add command inside your Unity projects root directory. Based on this it determines relative paths to your package manifest etc.

If you need to run openupm from somewhere else you can change the working directory using the `--chdir`/`-c` option. This option accepts an **absolute** path to a Unity projects root directory.

```sh
openupm add com.my.package -c /home/user/dev/MyProject
```

### Windows system-user authentication

This command supports Windows system-user authentication. For more information check out the corresponding [article](./help-system-user.md).

[^1]: openupm does not validate or resolve indirect dependencies for url-based dependencies.