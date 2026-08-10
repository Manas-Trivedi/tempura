import type { Step } from "./step.js"

export interface Workflow {
    id: string;
    steps: Step[];
}