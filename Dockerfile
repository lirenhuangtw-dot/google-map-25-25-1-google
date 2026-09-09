FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node protected/server.mjs /app/server.mjs
COPY --chown=node:node *.html *.js *.css *.webmanifest /app/public/
COPY --chown=node:node assets/ /app/public/assets/
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
