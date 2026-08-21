import type { Workflow } from "../domain/workflow.js";
import type { WorkflowExecution } from "../domain/execution.js";

export function getReadySteps(
    workflow: Workflow,
    execution: WorkflowExecution
): string[] {

    const workflowStepMap = new Map<string, typeof workflow.steps[number]>();
    const stepMap = new Map<string, boolean>();

    for(const step of workflow.steps) {
        workflowStepMap.set(step.id, step);
    }

    for(const step of execution.steps) {
        stepMap.set(step.stepId, step.status === "COMPLETED");
    }

    const readySteps: string[] = [];

    for(const step of execution.steps) {

        if(step.status !== "PENDING") continue;

        let allSatisfied: boolean = true;
        for(const dep of workflowStepMap.get(step.stepId)!.dependencies) {
            if(stepMap.get(dep) !== true) {
                allSatisfied = false;
            }
        }

        if(allSatisfied) {
            readySteps.push(step.stepId);
        }
    }

    return readySteps;

}