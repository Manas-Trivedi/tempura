import { describe, expect, test } from "vitest";
import type { WorkflowExecution } from "../../src/domain/execution.js";
import type { Workflow } from "../../src/domain/workflow.js";
import type { ExecutionRepository } from "../../src/execution/repository.js";
import type { Worker } from "../../src/execution/worker.js";
import { WorkflowService } from "../../src/application/workflow-service.js";

describe("WorkflowService", () => {
    class FakeExecutionRepository implements ExecutionRepository {
        execution: WorkflowExecution | null = null;
        async create(execution: WorkflowExecution): Promise<void> {
            this.execution = execution;
        }
        async getById(id: string): Promise<WorkflowExecution | null> {
            return this.execution?.id === id
                ? this.execution
                : null;
        }
        async update(execution: WorkflowExecution): Promise<void> {
            this.execution = execution;
        }
        async updateStep(
            executionId: string,
            step: WorkflowExecution["steps"][number]
        ): Promise<void> {
            const existingStep = this.execution?.steps.find(
                current => current.stepId === step.stepId
            );
            if (!existingStep) {
                throw new Error("Step execution not found");
            }
            existingStep.status = step.status;
            existingStep.output = step.output;
        }
    }

    class FakeWorker {
        runCalled = false;
        executionId: string | null = null;
        async run(
            workflow: Workflow,
            executionId: string
        ): Promise<void> {
            this.runCalled = true;
            this.executionId = executionId;
        }
    }

    test("creates and starts an execution", async () => {

        const workflow: Workflow = {
            id: "test-workflow",
            steps: [
                {
                    id: "step-a",
                    dependencies: [],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const repository = new FakeExecutionRepository();
        const worker = new FakeWorker();

        const service = new WorkflowService(
            repository,
            worker as unknown as Worker
        );

        const executionId = await service.start(
            workflow,
            { name: "Manas" }
        );

        expect(repository.execution).not.toBeNull();
        expect(repository.execution?.workflowId).toBe("test-workflow");
        expect(repository.execution?.input).toEqual({ name: "Manas" });

        expect(worker.runCalled).toBe(true);
        expect(worker.executionId).toBe(executionId);
    });

    test("rejects an invalid workflow", async () => {
        const workflow: Workflow = {
            id: "test-workflow",
            steps: [
                {
                    id: "step-a",
                    dependencies: ["B"],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const repository = new FakeExecutionRepository();
        const worker = new FakeWorker();

        const service = new WorkflowService(
            repository,
            worker as unknown as Worker
        );

        await expect(
            service.start(workflow, { name: "Manas" })
        ).rejects.toThrow("Invalid workflow");

        expect(repository.execution).toBeNull();
        expect(worker.runCalled).toBe(false);
        expect(worker.executionId).toBeNull();
    });
});