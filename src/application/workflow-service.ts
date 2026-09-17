import type { Workflow } from "../domain/workflow.js";
import type { Worker } from "../execution/worker.js";
import { createExecution } from "../execution/create.js";
import type { ExecutionRepository } from "../execution/repository.js";
import { validateWorkflow } from "../graph/kahn.js";


export class WorkflowService {

    constructor(
        private readonly repository: ExecutionRepository,
        private readonly worker: Worker
    ) {}

    async start(
        workflow: Workflow,
        input: unknown
    ): Promise<string> {

        if(!validateWorkflow(workflow)) {
            throw new Error("Invalid workflow")
        }

        const execution = createExecution(workflow, input);

        await this.repository.create(execution);

        await this.worker.run(workflow, execution.id);

        return execution.id;
    }

}