CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status text NOT NULL,
    input_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE step_executions (
    workflow_execution_id UUID NOT NULL,
    step_id TEXT NOT NULL,
    status TEXT NOT NULL,
    output_payload JSONB,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workflow_execution_id, step_id),

    FOREIGN KEY (workflow_execution_id)
        REFERENCES workflow_executions(id)
        ON DELETE CASCADE
);