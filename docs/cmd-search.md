# `openupm search`

The `search` command searches all packages on a remote registry matching a keyword and prints their names.

Generally, this command will attempt to use the chosen registries' [search endpoint](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md#get-v1search). If the registry doesn't support that, it will fall back to the `/-/all` endpoint. 

Because the Unity registry doesn't support any of the required endpoints (as of writing this in late 2024), the search command will not fall back to the Unity registry.

This command has the following aliases: `s`, `se` and `find`. On this doc page we will always use the primary command name `search`.

## Arguments

### Keyword

Specify a keyword which you want to search.

When using the npm search endpoint then the keyword will be used for the `text` query parameter.

When using the `/-/all` fallback all packages whose name includes the keyword will be printed. For this the keyword is case-insensitive.

## Options

### Registry

By default openupm searches packages on the openupm registry. This behavior is configurable, specifically if you want to work with 3rd party registries. 

You can override the primary registry from which to resolve packages using the  `--registry` option.

```sh
openupm search something --registry https://packages.my.registry
```

### Windows system-user authentication

This command supports Windows system-user authentication. For more information check out the corresponding [article](./help-system-user.md).