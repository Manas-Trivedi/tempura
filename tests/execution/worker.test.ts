import { afterAll, describe, expect, test } from "vitest";
import type { StepHandler } from "../../src/handlers/handler.js";
import type { ExecutionRepository } from "../../src/execution/repository.js";
import type { StepExecution, WorkflowExecution } from "../../src/domain/execution.js";
import type { Workflow } from "../../src/domain/workflow.js";
import { createExecution } from "../../src/execution/create.js";
import { HandlerRegistry } from "../../src/handlers/registry.js";
import { Worker } from "../../src/execution/worker.js";

describe("Worker", () => {

    class FakeExecutionRepository implements ExecutionRepository {
        updates: StepExecution[] = [];
        execution: WorkflowExecution;

        constructor(execution: WorkflowExecution) {
            this.execution = execution;
        }

        async getById(id: string): Promise<WorkflowExecution | null> {
            return this.execution.id === id ? this.execution : null;
        }

        async create(execution: WorkflowExecution): Promise<void> {
            this.execution = execution;
        }

        async update(execution: WorkflowExecution): Promise<void> {
            this.execution = execution;
        }

        async updateStep(
            executionId: string,
            step: StepExecution
        ): Promise<void> {
            this.updates.push({
                stepId: step.stepId,
                status: step.status,
                output: step.output
            });
            const existingStep = this.execution.steps.find(
                currentStep => currentStep.stepId === step.stepId
            );

            if (!existingStep) {
                throw new Error(
                    `Step execution not found: ${executionId}/${step.stepId}`
                );
            }

            existingStep.status = step.status;
            existingStep.output = step.output;
        }
    }

    const fakeHandler: StepHandler = {
        execute: async () => ({ success: true })
    };

    const workflow: Workflow = {
        id: 'test-workflow',
        steps: [
            {
                id: "A",
                dependencies: [],
                kind: "http",
                config: {}
            },
            {
                id: "B",
                dependencies: ["A"],
                kind: "http",
                config: {}
            },
            {
                id: "C",
                dependencies: ["A"],
                kind: "http",
                config: {}
            }
        ]
    };


    test("executes a ready step", async () => {
        const execution: WorkflowExecution = createExecution(workflow, undefined);
        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", fakeHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await worker.run(workflow, execution.id);

        const stepA = execution.steps.find(
            (step) => step.stepId === "A"
        )!;

        expect(stepA.status).toBe("COMPLETED");
        expect(stepA.output).toEqual({ success: true });
    });

    test("marks step as FAILED when handler fails", async () => {
        const execution: WorkflowExecution = createExecution(workflow, undefined);
        const failingHandler: StepHandler = {
            execute: async () => {
                throw new Error("handler failed");
            }
        };

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", failingHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await expect(
            worker.run(workflow, execution.id)
        ).rejects.toThrow("handler failed");

        const stepA = execution.steps.find(
            (step) => step.stepId === "A"
        )!;

        expect(stepA.status).toBe("FAILED");
    });

    test("executes ready steps in parallel", async () => {
        const execution = createExecution(workflow, undefined);

        const stepA = execution.steps.find(
            step => step.stepId === "A"
        )!;

        stepA.status = "COMPLETED";

        let bStarted = false;
        let cStarted = false;

        let resolveB!: () => void;
        let resolveC!: () => void;

        const bPromise = new Promise<void>((resolve) => {
            resolveB = resolve;
        });

        const cPromise = new Promise<void>((resolve) => {
            resolveC = resolve;
        });

        const handler: StepHandler = {
            execute: async (step) => {
                if (step.id === "B") {
                    bStarted = true;
                    await bPromise;
                }

                if (step.id === "C") {
                    cStarted = true;
                    await cPromise;
                }

                return { success: true };
            }
        };

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", handler]
            ])
        );

        const worker = new Worker(repository, registry);

        const workerPromise = worker.run(workflow, execution.id);

        while (!bStarted || !cStarted) {
            await Promise.resolve();
        }

        expect(bStarted).toBe(true);
        expect(cStarted).toBe(true);

        resolveB();
        resolveC();

        await workerPromise;

        expect(
            execution.steps.find(step => step.stepId === "B")!.status
        ).toBe("COMPLETED");

        expect(
            execution.steps.find(step => step.stepId === "C")!.status
        ).toBe("COMPLETED");
    });

    test("persists step state transitions", async () => {
        const execution = createExecution(workflow, undefined);

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", fakeHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await worker.run(workflow, execution.id);

        expect(repository.updates).toHaveLength(2);

        expect(repository.updates[0]).toMatchObject({
            stepId: "A",
            status: "RUNNING"
        });

        expect(repository.updates[1]).toMatchObject({
            stepId: "A",
            status: "COMPLETED",
            output: { success: true }
        });
    });

    test("persists FAILED state when handler fails", async () => {
        const execution = createExecution(workflow, undefined);

        const failingHandler: StepHandler = {
            execute: async () => {
                throw new Error("handler failed");
            }
        };

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", failingHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await expect(
            worker.run(workflow, execution.id)
        ).rejects.toThrow("handler failed");

        expect(repository.updates).toHaveLength(2);

        expect(repository.updates[0]).toMatchObject({
            stepId: "A",
            status: "RUNNING"
        });

        expect(repository.updates[1]).toMatchObject({
            stepId: "A",
            status: "FAILED"
        });
    });

})