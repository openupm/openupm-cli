# Work with proxy

OpenUPM-CLI supports HTTP, HTTPS, or SOCKS proxy specified by the http_proxy environment variable.

```
http_proxy="http://127.0.0.1:8080" openupm ...
```

You may need to set both http_proxy and https_proxy environment variables at the system-level to [enable Unity work with a proxy](https://forum.unity.com/threads/using-unity-when-behind-a-proxy.69896/).