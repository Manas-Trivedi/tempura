import { describe, expect, test } from "vitest";
import type { StepHandler } from "../../src/handlers/handler.js";
import { HandlerRegistry } from "../../src/handlers/registry.js";

describe("registry", () => {

    const fakeHandler: StepHandler = {
        execute: async () => ({ok: true})
    };

    const registry = new HandlerRegistry(

    new Map([
        ["http", fakeHandler]
        ])
    );

    test("returns a hander for the specified kind", () => {
        const handler = registry.getHandler("http");
        expect(handler).toEqual(fakeHandler);
    });

    test("throws when non-existent kind provided", () => {
        expect(() => registry.getHandler("does-not-exist" as "http")).toThrow(
            "No handler registered for the kind: does-not-exist"
        );
    });

});