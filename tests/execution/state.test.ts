import { describe, expect, test } from "vitest";
import type { StepExecution } from "../../src/domain/execution.js";
import { completeStep, failStep, startStep } from "../../src/execution/state.js";

describe("stepTransition", () => {

    test("transition from pending to running", ()=>{

        const pendingStep: StepExecution = {
            stepId: "pending-step",
            status: "PENDING",
            output: undefined,
        };

        startStep(pendingStep);
        expect(pendingStep.status).toEqual("RUNNING");
    });

    test("transition from running to completed", ()=>{

        const runningStep: StepExecution = {
            stepId: "running-step",
            status: "RUNNING",
            output: undefined,
        };

        completeStep(runningStep, undefined);
        expect(runningStep.status).toEqual("COMPLETED");
    });

    test("transition from running to failing", ()=>{

        const runningStep: StepExecution = {
            stepId: "running-step",
            status: "RUNNING",
            output: undefined,
        };

        failStep(runningStep);
        expect(runningStep.status).toEqual("FAILED");
    });

    test("cannot complete a pending step", () => {

        const pendingStep: StepExecution = {
            stepId: "pending-step",
            status: "PENDING",
            output: undefined,
        };

        expect(() => completeStep(pendingStep, {})).toThrow();
    });

    test("cannot fail a pending step", () => {

        const pendingStep: StepExecution = {
            stepId: "pending-step",
            status: "PENDING",
            output: undefined,
        };

        expect(() => failStep(pendingStep)).toThrow();
    });

    test("cannot start a completed step", () => {

        const completedStep: StepExecution = {
            stepId: "completed-step",
            status: "COMPLETED",
            output: undefined,
        };

        expect(() => startStep(completedStep)).toThrow();
    });

});