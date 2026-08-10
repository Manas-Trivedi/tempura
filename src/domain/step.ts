export type StepKind =
    | "http";

export interface Step {
    id: string;
    dependencies: string[];
    kind: StepKind;
    config: unknown;
}
