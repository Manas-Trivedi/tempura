import Fastify from "fastify";
import { WorkflowService } from "../application/workflow-service.js";
import type { ExecutionRepository } from "../execution/repository.js";
import type { Workflow } from "../domain/workflow.js";

export function createServer(
    workflowService: WorkflowService,
    repository: ExecutionRepository
) {
    const app = Fastify({
        logger: true
    });

    app.get("/test", async () => {
        return {
            message: "hello from tempura"
        };
    });

    app.get("/executions/:executionId", async (request, reply) => {
        const { executionId } = request.params as {
            executionId: string;
        };

        const execution = await repository.getById(executionId);

        if (!execution) {
            return reply.status(404).send({
                error: "Execution not found"
            });
        }

        return reply.send(execution);
    });

    app.post("/workflows/start", async (request, reply) => {
        const { workflow, input } = request.body as {
            workflow: Workflow;
            input: unknown;
        };

        const executionId = await workflowService.start(
            workflow,
            input
        );

        return reply.send({
            executionId
        });
    });



    return app;
}
