# Package reference

A package reference is the name of a package, usually alongside a version. It can be used to resolve a local or remote package.

Example: `package-name@version`

The version may be one of the following options:

## The latest tag

This resolves the latest published version, including pre-releases. 

Example: `com.my.package@latest`

## No version

This is identical to using the `latest` tag.  

Example: `com.my.package`

## A specific version

The specific given version.

Example: `com.my.package@1.2.0`

## The stable tag

This resolves the latest published stable version, excluding pre-releases

Example: `com.my.package@latest`

## A remote package url

A `http` or `git` based url to a git repository. Checkout the [Unity documentation on the topic](https://docs.unity3d.com/Manual/upm-git.html#syntax).

Examples (taken from the Unity documentation):

- `com.my.package@https://github.example.com/myuser/myrepository1.git`
- `com.my.package@git@github.example.com/myuser/myrepository2.git`

## A local file url

A `file` based url to a local package. Check out the [Unity documentation on the topic](https://docs.unity3d.com/Manual/upm-localpath.html).

Example (Taken from Unity documentation): `com.my.package@file:../github/my_package_folder`
