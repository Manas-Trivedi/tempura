import { describe, expect, test } from "vitest";
import { validateWorkflow } from "../../src/graph/kahn.js";
import type { Workflow } from "../../src/domain/workflow.js";

describe("validateWorkflow", () => {
    test("accepts a valid linear workflow", () => {
        const workflow: Workflow = {
            id: "linear",
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
                    dependencies: ["B"],
                    kind: "http",
                    config: {}
                }
            ]
        };

        expect(validateWorkflow(workflow)).toBe(true);
    });

    test("accepts a parallel workflow", () => {
        const workflow: Workflow = {
            id: "parallel",
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

        expect(validateWorkflow(workflow)).toBe(true);
    });

    test("rejects workflow with cycle", () => {
        const workflow: Workflow = {
            id: "cyclic",
            steps: [
                {
                    id: "A",
                    dependencies: [],
                    kind: "http",
                    config: {}
                },
                {
                    id: "B",
                    dependencies: ["A", "D"],
                    kind: "http",
                    config: {}
                },
                {
                    id: "C",
                    dependencies: ["B"],
                    kind: "http",
                    config: {}
                },
                {
                    id: "D",
                    dependencies: ["C"],
                    kind: "http",
                    config: {}
                }
            ]
        };

        expect(validateWorkflow(workflow)).toBe(false);
    });

    test("rejects workflow with non-existent steps", () => {
        const workflow: Workflow = {
            id: "does_not_exist",
            steps: [
                {
                    id: "A",
                    dependencies: ["DOES_NOT_EXIST"],
                    kind: "http",
                    config: {}
                }
            ]
        };

        expect(validateWorkflow(workflow)).toBe(false);
    });

    test("rejects workflow with repeated steps", () => {
        const workflow: Workflow = {
            id: "repeats",
            steps: [
                {
                    id: "A",
                    dependencies: [],
                    kind: "http",
                    config: {}
                },
                {
                    id: "A",
                    dependencies: [],
                    kind: "http",
                    config: {}
                },
            ]
        };

        expect(validateWorkflow(workflow)).toBe(false);
    });
});