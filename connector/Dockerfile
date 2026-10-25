# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS dependencies
WORKDIR /workspace/connector
COPY connector/package.json connector/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:24-alpine AS builder
WORKDIR /workspace
COPY connector/package.json connector/package-lock.json ./connector/
RUN --mount=type=cache,target=/root/.npm cd connector && npm ci
COPY connector/tsconfig.json ./connector/
COPY connector/src ./connector/src
COPY shared/connectorProtocol.ts ./shared/connectorProtocol.ts
RUN cd connector && npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    STAVBAFLOW_CONNECTOR_CONFIG=/etc/stavbaflow/config.json
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tini \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    && addgroup -S -g 10001 stavbaflow \
    && adduser -S -D -H -u 10001 -G stavbaflow stavbaflow \
    && mkdir -p /app/connector /var/lib/stavbaflow \
    && chown -R 10001:10001 /app /var/lib/stavbaflow
WORKDIR /app/connector
COPY --from=dependencies --chown=10001:10001 /workspace/connector/package.json ./package.json
COPY --from=dependencies --chown=10001:10001 /workspace/connector/node_modules ./node_modules
COPY --from=builder --chown=10001:10001 /workspace/connector/dist ./dist
USER 10001:10001
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/connector/src/main.js"]
