export type ExecutionStatus =
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED";

export type StepExecutionStatus =
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED";

export interface StepExecution {
    stepId: string,
    status: StepExecutionStatus,
    output: unknown
}

export interface WorkflowExecution {
    id: string,
    workflowId: string,
    status: ExecutionStatus,
    input: unknown,
    steps: StepExecution[]
}
