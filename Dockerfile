# BizAI machine: one always-on cloud computer per workshop participant.
# Claude Code runs here in Remote Control server mode, so the participant
# talks to it from the Claude app (phone or desktop) and every agent they
# build lives, runs and keeps its keys on this machine and its Railway project.
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git gosu jq ripgrep python3 procps less nano openssh-client \
 && install -d -m 0755 /etc/apt/keyrings \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# Updates arrive by redeploying (a rebuild pulls the latest), never by a
# self-updater writing into a root-owned global prefix it cannot write.
RUN npm install -g @anthropic-ai/claude-code@latest @railway/cli@latest && npm cache clean --force

ENV HOME=/data/home \
    WORK_DIR=/data/work \
    DISABLE_AUTOUPDATER=1 \
    NPM_CONFIG_PREFIX=/data/home/.npm-global \
    PATH=/data/home/.npm-global/bin:/data/home/.local/bin:$PATH

COPY app /app
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
