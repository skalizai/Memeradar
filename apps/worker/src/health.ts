import { createServer, type Server } from "node:http";
import type { WorkerStatus } from "./status";

export function startHealthServer(status: WorkerStatus, host: string, port: number): Promise<Server> {
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      const body = status.snapshot();
      res.writeHead(body.status === "ok" ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
      return;
    }
    res.writeHead(404).end();
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}
