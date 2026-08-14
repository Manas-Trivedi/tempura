import type { StepExecution } from "../domain/execution.js";

export function startStep(step: StepExecution): void {
    if (step.status !== "PENDING") {
        throw new Error("Step cannot be started");
    }

    step.status = "RUNNING";
}

export function completeStep(
    step: StepExecution,
    output: unknown
): void {
    if (step.status !== "RUNNING") {
        throw new Error("Step cannot be completed");
    }

    step.status = "COMPLETED";
    step.output = output;
}

export function failStep(step: StepExecution): void {
    if (step.status !== "RUNNING") {
        throw new Error("Step cannot be failed");
    }

    step.status = "FAILED";
}