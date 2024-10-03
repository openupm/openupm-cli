# Work with different registries

By default the openupm will query any package from the following registries: 

1. Openupm (https://package.openupm.com)
2. Unity (https://packages.unity.com)

Any package will be searched on these registries in the order that they are listed above. If you want to install packages from your own third party registries you can do this via the `--registry` option.

```sh
openupm --registry https://package.my-registry.com add com.my.package
```

This will query the following registries:

1. The private registry (https://package.my-registry.com)
2. Unity (https://packages.unity.com)

Let's say `com.my.package` depends on a Openupm package. With the above configuration the install would fail because Openupm is not part of the queried registries. To fix, add Openupm to the --registry option.

```sh
openupm --registry https://package.my-registry.com https://package.openupm.com add com.my.package
```

The query will now look like this:

1. The private registry (https://package.my-registry.com)
2. Openupm (https://package.openupm.com)
3. Unity (https://packages.unity.com)

Finally, it may not always be desirable to search the Unity registry. If you want to remove it from the registry list, run with the `--no-upstream` option.

```sh
openupm --registry https://package.my-registry.com https://package.openupm.com --no-upstream add com.my.package
```

The resulting query is:

1. The private registry (https://package.my-registry.com)
2. Openupm (https://package.openupm.com)
