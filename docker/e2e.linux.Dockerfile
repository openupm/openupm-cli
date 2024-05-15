FROM unityci/hub:latest as base
LABEL authors="ComradeVanti"

FROM base as install-editors

# Install a few Unity editors for testing
RUN unity-hub install --version 2018.4.32f1 --changeset fba45da84107
RUN unity-hub install --version 2021.3.38f1 --changeset 7a2fa5d8d101
RUN unity-hub install --version 2023.2.19f1 --changeset 95c298372b1e