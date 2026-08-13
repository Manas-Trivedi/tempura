import { describe, expect, test } from "vitest";
import { createExecution } from "../../src/execution/create.js";
import type { Workflow } from "../../src/domain/workflow.js";

describe("createExecution", () => {
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

    const input = {
        userId: 42,
        amount: 100
    };

    test("creates an execution with an ID", () => {
        const execution = createExecution(workflow, input);
        expect(execution.id).toBeDefined();
    });

    test("uses the workflow ID", () => {
        const execution = createExecution(workflow, input);
        expect(execution.workflowId).toBe("test-workflow");
    });

    test("preserves execution input", () => {
        const execution = createExecution(workflow, input);
        expect(execution.input).toEqual(input);
    });

    test("starts execution as PENDING", () => {
        const execution = createExecution(workflow, input);
        expect(execution.status).toBe("PENDING");
    });

    test("creates a step execution for every workflow step", () => {
        const execution = createExecution(workflow, input);
        expect(execution.steps).toHaveLength(workflow.steps.length);
    });

    test("starts every step as PENDING", () => {
        const execution = createExecution(workflow, input);
        for (const step of execution.steps) {
            expect(step.status).toBe("PENDING");
        }
    });

    test("creates step executions with correct step IDs", () => {
        const execution = createExecution(workflow, input);
        expect(execution.steps.map((step) => step.stepId))
            .toEqual(["A", "B", "C"]);
    });
});
