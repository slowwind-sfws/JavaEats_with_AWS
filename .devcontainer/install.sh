#!/bin/bash -ex
curl -fsSL https://claude.ai/install.sh | bash

# 対象のパスを指定
AWS_DIR="./.aws"
CLAUDE_DIR="./.claude"
AWS_CONFIG_FILE="./.aws/config"
AWS_CREDENTIAL_FILE="./.aws/credentials"
CLAUDE_SETTING_FILE="./.claude/settings.json"

# 1. ディレクトリが存在しない場合に作成
if [ ! -d "$AWS_DIR" ]; then
    echo "ディレクトリが存在しないため、作成します: $AWS_DIR"
    mkdir -p "$AWS_DIR"
fi
if [ ! -d "$CLAUDE_DIR" ]; then
    echo "ディレクトリが存在しないため、作成します: $CLAUDE_DIR"
    mkdir -p "$CLAUDE_DIR"
fi
# 2. ファイルが存在しない場合に作成
if [ ! -f "$AWS_CONFIG_FILE" ]; then
    echo "ファイルが存在しないため、作成します: $AWS_CONFIG_FILE"
    touch "$AWS_CONFIG_FILE"
fi
if [ ! -f "$AWS_CREDENTIAL_FILE" ]; then
    echo "ファイルが存在しないため、作成します: $AWS_CREDENTIAL_FILE"
    touch "$AWS_CREDENTIAL_FILE"
fi
if [ ! -f "$CLAUDE_SETTING_FILE" ]; then
    echo "ファイルが存在しないため、作成します: $CLAUDE_SETTING_FILE"
    touch "$CLAUDE_SETTING_FILE"
fi

sudo cp -r ./.aws /home/vscode
sudo cp -r ./.claude /home/vscode
# fuse-overlayfs and daemon.json are configured in the Dockerfile.