FROM mcr.microsoft.com/windows/nanoserver:ltsc2022 as os
LABEL authors="comradevanti"

FROM os as install-os-deps

FROM install-os-deps as editor

ENV UNITY_VERSION=2022.3.32f1

RUN curl -O UnitySetup64.exe https://download.unity3d.com/download_unity/c8300dc0a3fa/Windows64EditorInstaller/UnitySetup64-${UNITY_VERSION}.exe
RUN .\UnitySetup64 \S