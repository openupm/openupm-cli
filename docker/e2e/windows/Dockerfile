FROM mcr.microsoft.com/windows/nanoserver:ltsc2022 as os
LABEL authors="comradevanti"

FROM os as editor

RUN curl -o %userprofile%\UnitySetup64.exe https://download.unity3d.com/download_unity/c8300dc0a3fa/Windows64EditorInstaller/UnitySetup64-2022.3.32f1.exe
RUN %userprofile%\UnitySetup64 \S