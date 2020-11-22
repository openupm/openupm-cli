# openupm-cli

*阅读其他语言的版本：[English](README.md), [简体中文](README.zh-cn.md).*

![npm](https://img.shields.io/npm/v/openupm-cli) ![NPM](https://img.shields.io/npm/l/openupm-cli) ![npm](https://img.shields.io/npm/dm/openupm-cli)

openupm-cli是用于维护Unity的`manifest.json`的命令行工具。可便捷的安装来自第三方upm仓库的软件包。类似于NodeJS生态下的npm或yarn。

虽然该工具的设计初衷是为了配合[OpenUPM开源软件仓库](https://openupm.com)使用, 但也可以用于任意的upm软件仓库，包括Unity官方的upm软件仓库。

- [openupm-cli](#openupm-cli)
  - [工作原理](#工作原理)
  - [安装](#安装)
    - [Windows平台故障排除](#windows平台故障排除)
  - [中国区](#中国区)
  - [指令](#指令)
    - [添加软件包](#添加软件包)
    - [删除软件包](#删除软件包)
    - [搜索软件包](#搜索软件包)
    - [查看软件包信息](#查看软件包信息)
    - [查看软件包的依赖关系](#查看软件包的依赖关系)
    - [身份验证](#身份验证)
      - [使用令牌验证](#使用令牌验证)
      - [使用基本验证](#使用基本验证)
      - [始终认证](#始终认证)
      - [Windows Linux子系统（WSL）](#windows-linux子系统wsl)
      - [对Windows系统用户进行身份验证](#对windows系统用户进行身份验证)
      - [故障排除](#故障排除)
    - [指令选项](#指令选项)
  - [使用Unity官方软件仓库](#使用unity官方软件仓库)
  - [使用代理](#使用代理)

## 工作原理

openupm-cli基于Unity对带作用域的软件仓库（scoped registry）的支持。该命令行工具在安装、删除第三方软件时会修改`Packages/manifest.json`清单文件。Unity会检测到清单文件的修改，并尝试解析、安装软件包。

> 注意：至少到目前为止，该命令行工具不会直接安装/卸载软件包tarball。

## 安装

- 请先自行安装[nodejs 12](https://nodejs.org/en/download/).
- 通过npm安装：

  ```
  npm install -g openupm-cli
  ```

- 或通过[yarn](https://yarnpkg.com/)安装：

  ```
  yarn global add openupm-cli
  ```

### Windows平台故障排除

如果npm在您的命令行环境中不可用，请配置好[环境变量](https://stackoverflow.com/questions/27864040/fixing-npm-path-in-windows-8-and-10).

```
# npm路径
c:\Program Files\nodejs

# npm全局可执行文件路径
C:\Users\{yourName}\AppData\Roaming\npm
```

## 中国区

若使用中国区，请使用`openupm-cn`，或为`openupm`添加`--cn`选项。指定中国区后，该命令行将查询Unity中国区域软件仓库（https://packages.unity.cn）和OpenUPM中国区软件仓库（https://package.openupm.cn）。

若使用美股区，请直接使用`openupm`。

```
# 例子：查看中国区软件包
openupm view com.littlebigfun.addressable-importer --cn
# 或
openupm-cn view com.littlebigfun.addressable-importer

# 例子：查看美国区软件包
openupm view com.littlebigfun.addressable-importer
```

## 指令

### 添加软件包

```
openupm-cn add <pkg> [otherPkgs..]
openupm-cn add <pkg>@<version>
openupm-cn add <pkg>@git@github.com:...
openupm-cn add <pkg>@https://github.com/...
openupm-cn add <pkg>@file:...
```

add指令将软件包添加到`manifest.json`，并同时维护好作用域（scope）字段。

> add指令不会验证或解析Git，HTTPS和文件协议的依赖关系。请参考：https://docs.unity3d.com/Manual/upm-git.html。

add指令不会安装检验失败的软件包：

- 该软件包缺少依赖软件包
- 该软件包指定了一个不存在的依赖软件包版本
- 该软件包需要更高的Unity编辑器版本

您应该手动解决这些问题，或者添加选项`-f`强制执行。

安装软件包时，您还可以添加将其添加到[testables](https://docs.unity3d.com/Manual/cus-tests.html)字段：

```
openupm-cn --test <pkg>
```

### 删除软件包
```
openupm-cn remove <pkg> [otherPkgs...]
```

### 搜索软件包
```
openupm-cn search <keyword>
```

### 查看软件包信息
```
openupm-cn view <pkg>
```

### 查看软件包的依赖关系
```
openupm-cn deps <pkg>
```

使用选项`--deep`查看深度依赖关系

```
openupm-cn deps <pkg> --deep
```

### 身份验证

从Unity 2019.3.4f1开始，您可以配置`.upmconfig.toml`文件以使用私有的软件包仓库。`openupm-cn login`指令可帮助您通过npm服务器进行身份验证并将信息存储到配置文件中。

使用npm服务器进行身份验证有两种方法：
- 使用令牌验证（推荐的）。
- 使用基本验证：每次发送请求时都发送`用户名:密码`的base64编码明文。

验证后，后续的openupm-cli指令将使用`.upmconfig.toml`配置来访问您的私有软件包仓库。

#### 使用令牌验证

```
openupm-cn login -u <username> -e <email> -r <registry> -p <password>

# 例如
openupm-cn login -u user1 -e user1@example.com -r http://127.0.0.1:4873
```

如果缺少所需字段，该指令将提示您输入字段值。如果您的npm服务器不需要电子邮件字段，则可以提供一个虚拟的地址，例如`yourname@example.com`。请注意，对于大多数npm服务器来说，请求新的令牌并不意味着旧令牌会自动失效。

如果npm服务器允许通过CLI创建用户，提供新的用户名会自动注册一个新的用户。

为了方便起见，令牌也存储在`.npmrc`文件中。

#### 使用基本验证

添加`--basic-auth`选项以使用基本验证。

```
openupm-cn login -u <username> -e <email> -r <registry> -p <password> --basic-auth

# 例如
openupm-cn login -u user1 -e user1@example.com -r http://127.0.0.1:4873 --basic-auth
```

请注意，使用该指令进行基本验证时，您的用户名和密码的base64编码只是简单的存储在了`.upmconfig.toml`文件中。我们不会主动的去和npm服务器校验您的密码。因为那样做会导致生成一个验证令牌，这不是您想要的。所以，请务必仔细输入密码。

与使用令牌不同，`.npmrc`缺乏支持多个软件仓库时指定不同的基本验证信息的语法。因此，`.npmrc`不会针对基本身份验证进行更新。

#### 始终认证

如果您的软件包仓库的tarball文件位于不同服务器上，则需要添加`--always-auth`选项。

```
openupm-cn login -u <username> -e <email> -r <registry> -p <password> --always-auth

# 例如
openupm-cn login -u user1 -e user1@example.com -r http://127.0.0.1:4873 --always-auth
```

#### Windows Linux子系统（WSL）

默认情况下，该指令将Windows Linux子系统（WSL）视为Linux系统。但是，如果您想通过Windows进行身份验证（例如，您的Unity编辑器实际安装在window系统中），请添加`--wsl`选项。


> 已知问题：使用`--wsl`选项运行可能会清除终端屏幕信息。

#### 对Windows系统用户进行身份验证

确保您拥有正确的权限，然后添加`--system-user`选项以对Windows系统用户进行身份验证。

#### 故障排除

您可以在`.upmconfig.toml`文件中校验身份验证信息：

- Windows：`%USERPROFILE%/.upmconfig.toml`
- Windows（系统用户）：`%ALLUSERSPROFILE%Unity/config/ServiceAccounts/.upmconfig.toml`
- MacOS和Linux：`~/.upmconfig.toml`

对于令牌验证，您将看到类似以下信息。

```
[npmAuth."http://127.0.0.1:4873"]
email = "email address"
alwaysAuth = false
token = "token string"
```

对于基本验证，您将看到类似以下信息。
```
[npmAuth."http://127.0.0.1:4873"]
email = "email address"
alwaysAuth = true
_auth = "base64 string"
```

请注意，软件仓库地址应与您的`manifest.json`中的信息完全匹配。特别是结束的斜杠，请使用`http://127.0.0.1:4873`而不是`http://127.0.0.1:4873/`。

请通过https://forum.unity.com/threads/npm-registry-authentication.836308/了解有关身份验证的更多信息。

### 指令选项

命令行工具假定当前工作目录（CWD）是Unity项目的根目录（包含`Assets`文件夹的目录）。但您可以更改当前工作目录。

```
openupm-cn --chdir <unity-project-path>
```

指定另一个软件放库（默认为openupm软件仓库）

```
openupm-cn --registry <registry-url>

# 例如
openupm-cn --registry http://127.0.0.1:4873
```

显示详细的日志记录

```
openupm-cn --verbose ...
```

## 使用Unity官方软件仓库

如有必要，大多数指令可以访问Unity官方软件仓库，以搜索更多的信息。

```
$ openupm-cn add com.unity.addressables com.littlebigfun.addressable-importer
added: com.unity.addressables@1.4.0                # 来自Unity软件放库
added: com.littlebigfun.addressable-importer@0.4.1 # 来自OpenUPM软件放库
...
```

但您也可以关闭这种行为。

```
openupm-cn --no-upstream ...
```

## 使用代理

OpenUPM-CLI支持标准的`http_proxy`环境变量来指定HTTP，HTTPS或SOCKS代理。

```
http_proxy="http://127.0.0.1:8080" openupm-cn ...
```

您可能需要在系统级设置`http_proxy`和`https_proxy`环境变量，以保证[Unity编辑器可以访问您的代理服务器](https://forum.unity.com/threads/using-unity-when-behind-a-proxy.69896)。
