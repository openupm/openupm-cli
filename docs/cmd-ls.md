
# `openupm ls`

The `ls` command prints the name and version of each installed package for a project.

This command has the `list` alias. On this doc page we will always use the primary command name `ls`.

## Options

### Project directory

By default openupm expects that you run the add command inside your Unity projects root directory. Based on this it determines relative paths to your package manifest etc.

If you need to run openupm from somewhere else you can change the working directory using the `--chdir`/`-c` option. This option accepts an **absolute** path to a Unity projects root directory.

```sh
openupm add com.my.package -c /home/user/dev/MyProject
```