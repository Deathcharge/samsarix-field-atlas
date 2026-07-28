import express, { type Express } from "express";
import { access } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return 3000;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

export function createApp(staticPath: string): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use((_request, response, next) => {
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.setHeader(name, value);
    }
    next();
  });

  app.get("/healthz", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response
      .status(200)
      .json({ status: "ok", service: "samsarix-field-atlas" });
  });

  app.use(
    express.static(staticPath, {
      dotfiles: "deny",
      etag: true,
      fallthrough: true,
      index: "index.html",
      maxAge: "1h",
      setHeaders(response, servedPath) {
        if (path.basename(servedPath) === "index.html") {
          response.setHeader("Cache-Control", "no-cache");
        } else if (servedPath.includes(`${path.sep}assets${path.sep}`)) {
          response.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
          );
        }
      },
    })
  );

  app.use((_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(404).type("text/plain").send("Not found");
  });

  return app;
}

export interface StartServerOptions {
  host?: string;
  port?: number;
  staticPath?: string;
}

export async function startServer(
  options: StartServerOptions = {}
): Promise<Server> {
  const staticPath =
    options.staticPath ?? path.resolve(currentDirectory, "public");
  await access(path.join(staticPath, "index.html"));

  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const port = options.port ?? parsePort(process.env.PORT);
  const server = createServer(createApp(staticPath));

  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.requestTimeout = 15_000;

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.log(
    JSON.stringify({
      event: "server.started",
      host,
      port,
      staticPath,
    })
  );

  return server;
}

async function closeServer(server: Server, signal: NodeJS.Signals) {
  console.log(JSON.stringify({ event: "server.stopping", signal }));
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(currentFile);

if (isEntrypoint) {
  startServer()
    .then(server => {
      let stopping = false;
      const handleSignal = (signal: NodeJS.Signals) => {
        if (stopping) {
          return;
        }
        stopping = true;
        closeServer(server, signal)
          .catch(error => {
            console.error(
              JSON.stringify({
                event: "server.stop_failed",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              })
            );
            process.exitCode = 1;
          })
          .finally(() => {
            process.exit();
          });
      };

      process.once("SIGINT", handleSignal);
      process.once("SIGTERM", handleSignal);
    })
    .catch(error => {
      console.error(
        JSON.stringify({
          event: "server.start_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        })
      );
      process.exitCode = 1;
    });
}
