    import type { StepExecution, WorkflowExecution } from "../domain/execution.js";
    import type { Workflow } from "../domain/workflow.js";

    export function createExecution(
        workflow: Workflow,
        input: unknown
    ): WorkflowExecution {

        const stepExecutions: StepExecution[] = workflow.steps.map((step) => ({
            stepId: step.id,
            status: "PENDING",
            output: null
        }));

        return {
            id: crypto.randomUUID(),
            workflowId: workflow.id,
            status: "PENDING",
            input,
            steps: stepExecutions
        };
    }