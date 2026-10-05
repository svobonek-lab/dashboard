# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS build
WORKDIR /workspace

COPY connector/package.json connector/package-lock.json ./connector/
RUN --mount=type=cache,target=/root/.npm cd connector && npm ci
COPY connector/tsconfig.json ./connector/
COPY connector/src ./connector/src
COPY shared/connectorProtocol.ts ./shared/connectorProtocol.ts
RUN cd connector && npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    STAVBAFLOW_CONNECTOR_CONFIG=/etc/stavbaflow/config.json
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx \
    && groupadd --gid 10001 stavbaflow \
    && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin stavbaflow \
    && mkdir -p /app/connector /var/lib/stavbaflow \
    && chown -R 10001:10001 /app /var/lib/stavbaflow
WORKDIR /app/connector
COPY --from=build --chown=10001:10001 /workspace/connector/package.json ./package.json
COPY --from=build --chown=10001:10001 /workspace/connector/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /workspace/connector/dist ./dist
USER 10001:10001
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/connector/src/main.js"]
