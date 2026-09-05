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


    test("executes the workflow", async () => {
        const execution = createExecution(workflow, undefined);

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", fakeHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await worker.run(workflow, execution.id);

        expect(
            execution.steps.every(step => step.status === "COMPLETED")
        ).toBe(true);
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

        await worker.run(workflow, execution.id);

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

        const stepUpdates = repository.updates;

        expect(
            stepUpdates.filter(
                step => step.stepId === "A" && step.status === "RUNNING"
            )
        ).toHaveLength(1);

        expect(
            stepUpdates.filter(
                step => step.stepId === "A" && step.status === "COMPLETED"
            )
        ).toHaveLength(1);
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

        await worker.run(workflow, execution.id);

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

    test("Updates execution status as COMPLETED when all steps finish", async () => {

        const workflow: Workflow = {
            id: 'single-step-workflow',
            steps: [
                {
                    id: 'A',
                    dependencies: [],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const execution = createExecution(workflow, undefined);

        const repository = new FakeExecutionRepository(execution);

        const registry = new HandlerRegistry(
            new Map([
                ["http", fakeHandler]
            ])
        );

        const worker = new Worker(repository, registry);

        await worker.run(workflow, execution.id);

        expect(execution.status).toBe("COMPLETED");
    });

    test("Updates execution status as RUNNING when execution starts", async () => {

        const workflow: Workflow = {
            id: 'single-step-workflow',
            steps: [
                {
                    id: 'A',
                    dependencies: [],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const execution = createExecution(workflow, undefined);

        let resolveA!: () => void;

        const aPromise = new Promise<void>((resolve) => {
            resolveA = resolve;
        });

        const handler: StepHandler = {
            execute: async (step) => {
                if (step.id === "A") {
                    await aPromise;
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

        await Promise.resolve();

        expect(execution.status).toBe("RUNNING");

        resolveA();

        await workerPromise;

        expect(execution.status).toBe("COMPLETED");
    });

    test("Updates execution status as FAILED when a step fails", async () => {

        const workflow: Workflow = {
            id: 'single-step-workflow',
            steps: [
                {
                    id: 'A',
                    dependencies: [],
                    kind: "http",
                    config: {}
                }
            ]
        };

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

        await worker.run(workflow, execution.id);

        expect(execution.status).toBe("FAILED");
    });

})