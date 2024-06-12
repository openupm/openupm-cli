FROM mcr.microsoft.com/windows/nanoserver:ltsc2022 as os
LABEL authors="comradevanti"

FROM os as editor

RUN curl -o %userprofile%\UnitySetup64.exe https://download.unity3d.com/download_unity/7a0645017be0/Windows64EditorInstaller/UnitySetup64-2021.3.36f1.exe
RUN start %userprofile%\UnitySetup64.exe \S