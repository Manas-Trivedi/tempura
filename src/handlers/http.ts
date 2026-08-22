import type { Step } from "../domain/step.js";
import type { StepHandler } from "./handler.js"

interface HttpConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
}

export class HttpHandler implements StepHandler {

    async execute(step: Step, input: unknown): Promise<unknown> {

        const config = step.config as HttpConfig;

        const body =
        config.method === "GET" || config.method === "DELETE"
            ? undefined
            : JSON.stringify(input);

        const response = await fetch(config.url, {
            method: config.method,
            ...(config.headers && { headers: config.headers }),
            ...(body !== undefined && { body })
        });

        if (!response.ok) {
            throw new Error(`HTTP request failed: ${response.status}`);
        }

        return response.json();

    }

}
