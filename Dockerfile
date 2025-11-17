FROM ubuntu:latest
LABEL authors="razor"

ENTRYPOINT ["top", "-b"]