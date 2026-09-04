import type { StepExecution, WorkflowExecution } from "../domain/execution.js";
import type { Step } from "../domain/step.js";
import type { Workflow } from "../domain/workflow.js";
import type { HandlerRegistry } from "../handlers/registry.js";
import type { ExecutionRepository } from "./repository.js";
import { getReadySteps } from "./scheduler.js";
import { completeStep, failStep, startStep } from "./state.js";

export class Worker {

    constructor(
        private readonly repository: ExecutionRepository,
        private readonly registry: HandlerRegistry
    ) {}

    private async executeStep(
        workflowStep: Step,
        execution: WorkflowExecution
    ): Promise<void> {
        const stepExecution = execution.steps.find(
            (step) => step.stepId === workflowStep.id
        );

        if (!stepExecution) {
            throw new Error(
                `No execution found for step: ${workflowStep.id}`
            );
        }

        startStep(stepExecution);

        await this.repository.updateStep(
            execution.id,
            stepExecution
        );

        const handler = this.registry.getHandler(workflowStep.kind);

        try {

            const output = await handler.execute(
                workflowStep,
                execution.input
            );
            completeStep(stepExecution, output);

        } catch(error) {

            failStep(stepExecution);
            throw error;

        } finally {

            await this.repository.updateStep(
                execution.id,
                stepExecution
            );
            
        }
    }

    async run(
        workflow: Workflow,
        executionId: string
    ): Promise<void> {

        const stepMap = new Map<string, Step>;

        for(const step of workflow.steps) {
            stepMap.set(step.id, step);
        }

        const execution = await this.repository.getById(executionId);

        if(!execution) {
            throw new Error(`No execution found: ${executionId}`);
        }

        const readySteps = getReadySteps(workflow, execution);

        await Promise.all(
            readySteps.map((stepId) => {
                const stepDef = stepMap.get(stepId)!;
                return this.executeStep(stepDef, execution);
            })
        );

    }

}