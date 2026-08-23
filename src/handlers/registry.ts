import type { StepKind } from "../domain/step.js";
import type { StepHandler } from "./handler.js";

export class HandlerRegistry {

    constructor (
        private readonly handlers: Map<StepKind, StepHandler>
    ) {}

    getHandler(kind: StepKind): StepHandler {

        const handler = this.handlers.get(kind);

        if(!handler) {
            throw new Error(`No handler registered for the kind: ${kind}`);
        }

        return handler;

    }

}