import { createServer } from "./api/server.js";
import { pool } from "./db/client.js";
import { PostgresExecutionRepository } from "./db/execution-repository.js";
import { HttpHandler } from "./handlers/http.js";
import { HandlerRegistry } from "./handlers/registry.js";
import { Worker } from "./execution/worker.js";
import { WorkflowService } from "./application/workflow-service.js";

const repository = new PostgresExecutionRepository(pool);

const registry = new HandlerRegistry(
    new Map([
        ["http", new HttpHandler()]
    ])
);

const worker = new Worker(repository, registry);

const workflowService = new WorkflowService(
    repository,
    worker
);

const server = createServer(
    workflowService,
    repository
);

const start = async () => {
    try {
        await server.listen({
            port: 3000,
            host: "0.0.0.0"
        });
    } catch (error) {
        server.log.error(error);
        process.exit(1);
    }
};

start();