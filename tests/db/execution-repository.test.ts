import { afterAll, describe, expect, test } from "vitest";
import { Pool } from "pg";
import { PostgresExecutionRepository } from "../../src/db/execution-repository.js";
import type { WorkflowExecution } from "../../src/domain/execution.js";


const testPool = new Pool({
    host: "localhost",
    port: 5432,
    user: "tempura",
    password: "tempura",
    database: "tempura_test"
});

describe("PostgresExecutionRepository", () => {

    const repository = new PostgresExecutionRepository(testPool);

    test("creates and retrieves an execution", async () => {

        const execution: WorkflowExecution = {
            id: crypto.randomUUID(),
            workflowId: "test-workflow",
            status: "PENDING",
            input: {
                userId: 123,
                amount: 100
            },
            steps: [
                {
                    stepId: "charge-user",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "send-email",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        await repository.create(execution);
        const retrieved = await repository.getById(execution.id);

        expect(retrieved).toEqual(execution);

    });

    test("retrieves a non-existent id", async () => {
        const id: string = crypto.randomUUID();
        const retrieved = await repository.getById(id);
        expect(retrieved).toBe(null);
    });

    test("updates an execution", async () => {

        const execution: WorkflowExecution = {
            id: crypto.randomUUID(),
            workflowId: "test-workflow",
            status: "PENDING",
            input: {
                userId: 123,
                amount: 100
            },
            steps: [
                {
                    stepId: "charge-user",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "send-email",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        await repository.create(execution);

        execution.status = "RUNNING";
        if(!execution.steps[0]) {
            throw new Error("Test setup failed");
        }
        execution.steps[0].status = "RUNNING";

        await repository.update(execution);
        const retrieved = await repository.getById(execution.id);

        expect(retrieved).toEqual(execution);

    });

});

afterAll(async () => {
    await testPool.end();
});
