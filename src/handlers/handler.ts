import type { Step } from "../domain/step.js";

export interface StepHandler {
    execute(step: Step, input: unknown): Promise<unknown>;
}