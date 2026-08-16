import type { WorkflowExecution } from "../domain/execution.js";

export interface ExecutionRepository {

    create(execution: WorkflowExecution): Promise<void>;

    getById(id: string): Promise<WorkflowExecution | null>;

    update(execution: WorkflowExecution): Promise<void>;
    
}