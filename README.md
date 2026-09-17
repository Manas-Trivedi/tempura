# 🍤 Tempura

Tempura is a TypeScript workflow orchestration engine for defining, validating, and executing dependency-aware workflows as directed acyclic graphs (DAGs).

The project now has an end-to-end runnable application: an HTTP client can submit a workflow, Tempura validates and persists it, executes ready steps, and exposes the resulting execution by ID.

> Status: active early-stage implementation. The synchronous HTTP application and execution core are working; queue-backed workers, retries, and API hardening are still being built.

## What is implemented

- DAG validation with Kahn's algorithm
- Workflow execution creation and lifecycle state transitions
- Dependency-aware scheduling of ready steps
- Parallel execution of independent steps
- A worker that advances an execution until it completes or fails
- Pluggable step handlers selected by step kind
- Built-in HTTP step handler
- PostgreSQL persistence for workflow and step executions
- Transactional execution updates with missing-record checks
- Application service that validates, persists, and starts workflows
- Fastify HTTP server for submitting workflows and retrieving executions
- Unit and integration tests covering the execution core

## How execution works

`WorkflowService` is called by the Fastify API when a workflow is submitted:

1. Validate the workflow structure.
2. Create a `PENDING` execution with one pending step execution per workflow step.
3. Persist the execution and its steps.
4. Start the worker.
5. Find pending steps whose dependencies are complete.
6. Run all currently ready steps concurrently.
7. Persist each `RUNNING`, `COMPLETED`, or `FAILED` step transition.
8. Continue through the graph until the execution is `COMPLETED` or `FAILED`.

The current API waits for the in-process worker to finish before returning the execution ID. Queue-backed asynchronous submission is planned for a later stage.

Independent branches run in parallel. A join step remains pending until every dependency has completed. When one step fails, the worker persists that failure and continues evaluating independent work; blocked dependent steps remain pending and the workflow finishes as failed.

## Core components

### Workflow validation

[src/graph/kahn.ts](src/graph/kahn.ts) validates workflow structure by checking for:

- duplicate step IDs
- missing dependency references
- cycles
- a valid topological ordering

### Scheduler and worker

[src/execution/scheduler.ts](src/execution/scheduler.ts) returns pending steps whose dependencies are all `COMPLETED`.

[src/execution/worker.ts](src/execution/worker.ts) resolves step definitions, transitions steps to `RUNNING`, invokes their handlers, persists outputs, and updates the final workflow status.

### Handler system

Handlers implement the `StepHandler` interface and are registered by `StepKind` through [src/handlers/registry.ts](src/handlers/registry.ts). The current supported kind is `http`, implemented by [src/handlers/http.ts](src/handlers/http.ts).

HTTP steps support `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`, optional headers, JSON input for methods with a body, and JSON response output. Non-successful HTTP responses fail the step.

### Persistence

[src/db/schema.sql](src/db/schema.sql) stores workflow execution metadata and step execution state, including input and output JSON payloads and retry-count storage for future retry behavior.

[src/db/execution-repository.ts](src/db/execution-repository.ts) supports:

- creating an execution and all of its steps in one transaction
- fetching an execution by ID
- updating an execution and all steps atomically
- updating one step independently as it runs
- detecting missing workflow or step records

### HTTP API

[src/api/server.ts](src/api/server.ts) creates the Fastify application. The application is composed in [src/index.ts](src/index.ts) with the PostgreSQL repository, HTTP handler registry, worker, and workflow service.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/test` | Basic server response for connectivity checks |
| `POST` | `/workflows/start` | Validate, persist, and execute a workflow |
| `GET` | `/executions/:executionId` | Retrieve a persisted execution or return `404` |

The workflow submission body has this shape:

```json
{
  "workflow": {
    "id": "user-onboarding",
    "steps": [
      {
        "id": "create-user",
        "dependencies": [],
        "kind": "http",
        "config": {
          "method": "POST",
          "url": "https://example.com/users"
        }
      }
    ]
  },
  "input": {
    "userId": 42
  }
}
```

On success, `POST /workflows/start` returns the generated execution ID:

```json
{
  "executionId": "..."
}
```

## Domain model

- `Workflow`: an ID and an ordered collection of steps
- `Step`: an ID, dependency list, handler kind, and handler configuration
- `WorkflowExecution`: workflow ID, input, overall status, and step executions
- `StepExecution`: step ID, status, and handler output

Supported workflow and step statuses are `PENDING`, `RUNNING`, `COMPLETED`, and `FAILED`.

## Example

```ts
const workflow = {
  id: "user-onboarding",
  steps: [
    {
      id: "create-user",
      dependencies: [],
      kind: "http",
      config: {
        method: "POST",
        url: "https://example.com/users"
      }
    },
    {
      id: "send-welcome-email",
      dependencies: ["create-user"],
      kind: "http",
      config: {
        method: "POST",
        url: "https://example.com/welcome-email"
      }
    },
    {
      id: "grant-access",
      dependencies: ["create-user"],
      kind: "http",
      config: {
        method: "POST",
        url: "https://example.com/access"
      }
    }
  ]
};
```

`send-welcome-email` and `grant-access` become runnable after `create-user` completes and can execute in parallel.

## Tech stack

- Runtime: Node.js
- Language: TypeScript with native ESM modules
- Package manager: pnpm
- HTTP framework: Fastify
- Database: PostgreSQL 17
- Data access: `pg`
- Testing: Vitest
- Local infrastructure: Docker Compose
- Planned queue: Redis + BullMQ

## Development setup

### Prerequisites

- Node.js
- pnpm
- Docker and Docker Compose

### Install dependencies

```bash
pnpm install
```

### Start PostgreSQL

PostgreSQL runs locally through [docker-compose.yml](docker-compose.yml):

```bash
docker compose up -d
```

The compose service creates the `tempura` database with the local development credentials configured in the repository. Redis, BullMQ, and the Tempura application container are planned additions to this environment.

### Run the development process

```bash
pnpm dev
```

The server listens on `http://localhost:3000`.

Check that the application is running:

```bash
curl http://localhost:3000/test
```

Submit a workflow:

```bash
curl -X POST http://localhost:3000/workflows/start \
  -H 'content-type: application/json' \
  -d '{
    "workflow": {
      "id": "demo",
      "steps": [
        {
          "id": "fetch-data",
          "dependencies": [],
          "kind": "http",
          "config": {
            "method": "GET",
            "url": "https://example.com/data"
          }
        }
      ]
    },
    "input": {}
  }'
```

Then retrieve the execution using the returned ID:

```bash
curl http://localhost:3000/executions/<execution-id>
```

### Build and start the compiled app

```bash
pnpm build
pnpm start
```

### Run tests

```bash
pnpm test -- --run
```

The PostgreSQL integration tests use the `tempura_test` database. That database is currently created manually during local development; it will be added to Docker Compose later. Unit tests for graph validation, scheduling, handlers, execution state, and worker behavior do not require PostgreSQL.

## Roadmap

Completed foundations:

- [x] workflow DAG validation
- [x] execution creation and state transitions
- [x] dependency-aware scheduler
- [x] parallel in-process worker execution
- [x] pluggable handler registry
- [x] HTTP step handler
- [x] PostgreSQL execution repository
- [x] Dockerized local PostgreSQL
- [x] Fastify application server
- [x] Workflow submission endpoint
- [x] Execution lookup endpoint

Next milestones:

- [ ] retry policies and retry execution behavior
- [ ] idempotency and recovery semantics
- [ ] Redis and BullMQ queue integration
- [ ] queue-backed background workers
- [ ] containerized Tempura runtime
- [ ] request validation and consistent API error responses
- [ ] workflow registration and richer public API
- [ ] API-level test coverage
- [ ] execution observability and metrics
- [ ] compensation workflows and Saga support

## Current direction

Tempura is moving from a synchronous in-process execution core toward a durable distributed runtime. The next architectural step is separating workflow submission from worker execution with Redis/BullMQ, while preserving the current dependency scheduling, handler abstraction, and PostgreSQL-backed execution state.

---

Built for durable, dependency-aware orchestration work.