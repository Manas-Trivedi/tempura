import { afterEach, describe, expect, test } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Step } from "../../src/domain/step.js";
import { HttpHandler } from "../../src/handlers/http.js";

describe("HttpHandler", () => {

    let server: Server;

    afterEach(async () => {
        if (server) {
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        }
    });

    test("sends input as JSON and returns response", async () => {

        server = createServer(async (req, res) => {

            let body = "";

            for await (const chunk of req) {
                body += chunk;
            }

            const input = JSON.parse(body);

            res.writeHead(200, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                received: input,
                success: true
            }));
        });

        await new Promise<void>((resolve) => {
            server.listen(0, resolve);
        });

        const address = server.address() as AddressInfo;

        const step: Step = {
            id: "test-http",
            dependencies: [],
            kind: "http",
            config: {
                method: "POST",
                url: `http://localhost:${address.port}`,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        };

        const input = {
            userId: 123,
            amount: 100
        };

        const handler = new HttpHandler();

        const output = await handler.execute(step, input);

        expect(output).toEqual({
            received: input,
            success: true
        });
    });

    test("throws on non-successful response", async () => {

        server = createServer((req, res) => {
            res.writeHead(500, {
                "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
                error: "something went wrong"
            }));
        });

        await new Promise<void>((resolve) => {
            server.listen(0, resolve);
        });

        const address = server.address() as AddressInfo;

        const step: Step = {
            id: "failing-http",
            dependencies: [],
            kind: "http",
            config: {
                method: "POST",
                url: `http://localhost:${address.port}`
            }
        };

        const handler = new HttpHandler();

        await expect(
            handler.execute(step, { test: true })
        ).rejects.toThrow("HTTP request failed: 500");
    });

});