import type { StepExecution, WorkflowExecution } from "../domain/execution.js";

export interface ExecutionRepository {

    create(execution: WorkflowExecution): Promise<void>;

    getById(id: string): Promise<WorkflowExecution | null>;

    update(execution: WorkflowExecution): Promise<void>;

    updateStep(executionId: string, step: StepExecution): Promise<void>;

}