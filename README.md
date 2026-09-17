# 🍤 Tempura

Tempura is a TypeScript workflow orchestration engine for defining, validating, and executing dependency-aware workflows as directed acyclic graphs (DAGs).

The project now has an end-to-end in-process execution path: workflows are validated, executions are persisted, ready steps are scheduled, handlers run concurrently where dependencies allow, and step and workflow state is written back to PostgreSQL.

> Status: active early-stage implementation. The execution core is working; queue-backed workers, retries, and the public API are still being built.

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
- Unit and integration tests covering the execution core

## How execution works

`WorkflowService` is the application entry point for starting a workflow:

1. Validate the workflow structure.
2. Create a `PENDING` execution with one pending step execution per workflow step.
3. Persist the execution and its steps.
4. Start the worker.
5. Find pending steps whose dependencies are complete.
6. Run all currently ready steps concurrently.
7. Persist each `RUNNING`, `COMPLETED`, or `FAILED` step transition.
8. Continue through the graph until the execution is `COMPLETED` or `FAILED`.

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

Next milestones:

- [ ] retry policies and retry execution behavior
- [ ] idempotency and recovery semantics
- [ ] Redis and BullMQ queue integration
- [ ] queue-backed background workers
- [ ] containerized Tempura runtime
- [ ] workflow registration and public API
- [ ] execution observability and metrics
- [ ] compensation workflows and Saga support

## Current direction

Tempura is moving from a synchronous in-process execution core toward a durable distributed runtime. The next architectural step is separating workflow submission from worker execution with Redis/BullMQ, while preserving the current dependency scheduling, handler abstraction, and PostgreSQL-backed execution state.

---

Built for durable, dependency-aware orchestration work.