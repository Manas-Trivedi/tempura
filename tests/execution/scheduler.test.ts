import { describe, expect, test } from "vitest";
import type { Workflow } from "../../src/domain/workflow.js";
import type { WorkflowExecution } from "../../src/domain/execution.js";
import { getReadySteps } from "../../src/execution/scheduler.js";

describe("getReadySteps", () => {

    test("returns root steps", () => {

        const workflow: Workflow = {
            id: "root-test",
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
                }
            ]
        };

        const execution: WorkflowExecution = {
            id: "execution-1",
            workflowId: "root-test",
            status: "RUNNING",
            input: null,
            steps: [
                {
                    stepId: "A",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "B",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        expect(getReadySteps(workflow, execution)).toEqual(["A"]);
    });

    test("does not return a step whose dependency is incomplete", () => {

        const workflow: Workflow = {
            id: "dependency-test",
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
                }
            ]
        };

        const execution: WorkflowExecution = {
            id: "execution-2",
            workflowId: "dependency-test",
            status: "RUNNING",
            input: null,
            steps: [
                {
                    stepId: "A",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "B",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        expect(getReadySteps(workflow, execution)).toEqual(["A"]);
    });

    test("returns parallel steps together", () => {

        const workflow: Workflow = {
            id: "parallel-test",
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

        const execution: WorkflowExecution = {
            id: "execution-3",
            workflowId: "parallel-test",
            status: "RUNNING",
            input: null,
            steps: [
                {
                    stepId: "A",
                    status: "COMPLETED",
                    output: null
                },
                {
                    stepId: "B",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "C",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        expect(getReadySteps(workflow, execution)).toEqual(["B", "C"]);
    });

    test("waits for all dependencies of a join step", () => {

        const workflow: Workflow = {
            id: "join-test",
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
                },
                {
                    id: "D",
                    dependencies: ["B", "C"],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const execution: WorkflowExecution = {
            id: "execution-4",
            workflowId: "join-test",
            status: "RUNNING",
            input: null,
            steps: [
                {
                    stepId: "A",
                    status: "COMPLETED",
                    output: null
                },
                {
                    stepId: "B",
                    status: "COMPLETED",
                    output: null
                },
                {
                    stepId: "C",
                    status: "PENDING",
                    output: null
                },
                {
                    stepId: "D",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        expect(getReadySteps(workflow, execution)).toEqual(["C"]);

        execution.steps[2]!.status = "COMPLETED";

        expect(getReadySteps(workflow, execution)).toEqual(["D"]);
    });

    test("does not return non-pending steps", () => {

        const workflow: Workflow = {
            id: "status-test",
            steps: [
                {
                    id: "A",
                    dependencies: [],
                    kind: "http",
                    config: {}
                },
                {
                    id: "B",
                    dependencies: [],
                    kind: "http",
                    config: {}
                },
                {
                    id: "C",
                    dependencies: [],
                    kind: "http",
                    config: {}
                }
            ]
        };

        const execution: WorkflowExecution = {
            id: "execution-5",
            workflowId: "status-test",
            status: "RUNNING",
            input: null,
            steps: [
                {
                    stepId: "A",
                    status: "COMPLETED",
                    output: null
                },
                {
                    stepId: "B",
                    status: "RUNNING",
                    output: null
                },
                {
                    stepId: "C",
                    status: "PENDING",
                    output: null
                }
            ]
        };

        expect(getReadySteps(workflow, execution)).toEqual(["C"]);
    });

});