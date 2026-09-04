import type { Pool } from "pg"
import type { ExecutionRepository } from "../execution/repository.js";
import type { StepExecution, WorkflowExecution } from "../domain/execution.js";

export class PostgresExecutionRepository implements ExecutionRepository {

    constructor(private readonly pool: Pool) {}

    async create(execution: WorkflowExecution): Promise<void> {
        const client = await this.pool.connect();

        try {

            await client.query("BEGIN");

            await client.query(
                `
                INSERT INTO workflow_executions
                    (id, workflow_id, status, input_payload)
                VALUES
                    ($1, $2, $3, $4)
                `,
                [
                    execution.id,
                    execution.workflowId,
                    execution.status,
                    execution.input
                ]
            );

            for(const step of execution.steps) {
                await client.query(
                    `
                    INSERT INTO step_executions
                        (
                            workflow_execution_id,
                            step_id,
                            status,
                            output_payload
                        )
                    VALUES
                        ($1, $2, $3, $4)
                    `,
                    [
                        execution.id,
                        step.stepId,
                        step.status,
                        step.output
                    ]
                );
            }

            await client.query("COMMIT");

        } catch(error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async getById(id: string): Promise<WorkflowExecution | null> {

        const client = await this.pool.connect();

        try {

            const workflowQuery = await client.query(
                `
                SELECT * from workflow_executions
                WHERE id = $1
                `,
                [
                    id
                ]
            );

            if(workflowQuery.rowCount === 0) return null;

            const result: WorkflowExecution = {
                id: workflowQuery.rows[0].id,
                workflowId: workflowQuery.rows[0].workflow_id,
                status: workflowQuery.rows[0].status,
                input: workflowQuery.rows[0].input_payload,
                steps: []
            };

            const stepQuery = await client.query(
                `
                SELECT * from step_executions
                WHERE workflow_execution_id = $1
                `,
                [
                    id
                ]
            );

            for(const row of stepQuery.rows) {

                const step: StepExecution = {
                    stepId: row.step_id,
                    status: row.status,
                    output: row.output_payload
                };

                result.steps.push(step);

            }

            return result;

        } finally {
            client.release();
        }

    }

    async update(execution: WorkflowExecution): Promise<void> {

        const client = await this.pool.connect();

        try {
            await client.query("BEGIN");

            const result = await client.query(
                `
                UPDATE workflow_executions
                SET status = $1
                WHERE id = $2
                `,
                [
                    execution.status,
                    execution.id
                ]
            );

            if(result.rowCount !== 1) {
                throw new Error(`Workflow execution not found: ${execution.id}`);
            }

            for(const step of execution.steps) {

                const stepUpdate = await client.query(
                    `
                    UPDATE step_executions
                    SET
                    status = $1,
                    output_payload = $2
                    WHERE workflow_execution_id = $3 AND step_id = $4
                    `,
                    [
                        step.status,
                        step.output,
                        execution.id,
                        step.stepId
                    ]
                );

                if(stepUpdate.rowCount !== 1) {
                    throw new Error(
                        `Step execution not found: ${execution.id}/${step.stepId}`
                    );
                }

            }

            await client.query("COMMIT");

        } catch ( error ) {
            await client.query("ROLLBACK");
            throw(error);
        } finally {
            client.release();
        }

    }

    async updateStep(executionId: string, step: StepExecution): Promise<void> {
        const client = await this.pool.connect();
        try {
            const stepUpdate = await client.query(
                `
                UPDATE step_executions
                SET
                status = $1,
                output_payload = $2
                WHERE workflow_execution_id = $3 AND step_id = $4
                `,
                [
                    step.status,
                    step.output,
                    executionId,
                    step.stepId
                ]
            );

            if(stepUpdate.rowCount !== 1) {
                throw new Error(
                    `Step execution not found: ${executionId}/${step.stepId}`
                );
            }
        } catch ( error ) {
            throw(error);
        } finally {
            client.release();
        }

    }

}
