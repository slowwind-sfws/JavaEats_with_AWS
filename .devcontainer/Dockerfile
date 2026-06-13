FROM mcr.microsoft.com/devcontainers/base:bookworm

# Install fuse-overlayfs before Docker is configured by the docker-in-docker feature.
# This avoids overlay-on-overlay failures in WSL2 where the host fs is already overlayfs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fuse-overlayfs \
    && rm -rf /var/lib/apt/lists/*

# Bake daemon.json into the image so it is present on every container start,
# not just the first one (postCreateCommand does not re-run on restart).
RUN mkdir -p /etc/docker \
    && echo '{"storage-driver": "fuse-overlayfs"}' > /etc/docker/daemon.json
