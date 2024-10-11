# `openupm login`

The `login` command authenticates with a remote registry and stores login credentials in your `.upmconfig.toml` for future requests.

There are two ways to authenticate with a registry server:
- using token (recommended): a server-generated string for the grant of access and publishing rights.
- using basic authentication: the `username:password` pair (base64 encoded) is stored to authenticate with the server on each request.

```sh
openupm login -r https://packages.my-registry.com -u user123 -p ****** -e user123@mail.com
```

Tokens will be saved in the users local `.npmrc` file.

This command has the aliases `adduser` and `add-user`. On this doc page we will always use the primary command name `login`.

## Options

### Registry

Specify the registry with which you want to authenticate. You can use the `--registry` or `-r` option.

### Basic vs token

By default the `login` command uses token-based authentication. If you want to use basic authentication use the `--basic-auth` option.

### Credentials

In order to authenticate you must specify 3 credentials:

- username (--username/-u)
- password (--password/-p)
- email (--email/-e)

If you omit any of these, you will be prompted interactively. This can be useful since when entering the password in the interactive prompt it will be obfuscated.

### Always auth

Some registry servers are configured to always require authentication, even for `GET` requests. If this is the case for the registry you are authenticating for you should specify the `--always-auth` option.

### Windows system-user authentication

By default the authentication information will be saved to the users local `.upmconfig.toml`. If you want to save it in the Windows system users config file instead, run with the `--system-user` option. For more information check out the corresponding [article](./help-system-user.md).

## Troubleshooting

You can verify the authentication in your `.upmconfig.toml` file. Please read the [official documentation](https://docs.unity3d.com/Manual/upm-config.html) if you are unsure where to find the file.

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