FROM ubuntu:latest as os
LABEL authors="comradevanti"

FROM os as install-os-deps

RUN apt-get -y update
RUN apt-get -y install wget  
RUN apt-get -y install xz-utils

FROM install-os-deps as editor

ENV UNITY_VERSION=2022.3.32f1
RUN mkdir -p ~/Unity/Hub/Editor/${UNITY_VERSION}/Editor
RUN cd ~/Unity/Hub/Editor/${UNITY_VERSION}/Editor
RUN wget -O ./editor.tar.xz -q https://download.unity3d.com/download_unity/c8300dc0a3fa/LinuxEditorInstaller/Unity-${UNITY_VERSION}.tar.xz
RUN tar -xJf ./editor.tar.xz
RUN rm ./editor.tar.xz