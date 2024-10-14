# Using system-user authentication

By default openupm resolves registry authentication credentials from the users local `.upmconfig.toml` (Ie the one stored at `~/.upmconfig.toml`).

When you are using openupm on Windows and would like to use the system-users `.upmconfig.toml` instead, you can use the `--system-user` option.

```sh
openupm add com.my.package --system-user
```

See [the Unity docs on the topic](https://docs.unity3d.com/Manual/upm-config.html) for more information.