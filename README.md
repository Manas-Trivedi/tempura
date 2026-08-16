# 🍤 Tempura

Tempura is a TypeScript-based workflow orchestration engine for defining, validating, and executing DAG-driven processes. The project is aimed at building a lightweight but durable runtime for dependency-aware workflows, with a focus on execution state tracking and persistence from the beginning.

> Status: active early-stage implementation with a working core model and persistence foundation

## What is implemented

The codebase has already moved beyond the original placeholder stage and includes a working foundation for:

- Workflow DAG validation using topological ordering logic
- Execution creation for workflow runs
- Step lifecycle state transitions
- PostgreSQL-backed execution persistence
- Repository-style storage for workflow execution records
- Type-safe domain models for workflows and step execution

## Core capabilities

### Workflow validation

The engine validates workflow graphs to ensure they are valid DAGs before execution. The implementation in [src/graph/kahn.ts](src/graph/kahn.ts) checks for:

- duplicate step IDs
- missing dependency references
- cyclic graphs
- valid topological ordering

This is based on Kahn's algorithm and provides a fast structural validation step for workflow definitions.

### Execution lifecycle

Execution state is modeled in [src/domain/execution.ts](src/domain/execution.ts) and [src/execution/state.ts](src/execution/state.ts). Supported statuses include:

- `PENDING`
- `RUNNING`
- `COMPLETED`
- `FAILED`

The system enforces valid transitions so a step cannot be marked complete unless it was started, and a pending step cannot be failed or completed.

### Persistence model

The PostgreSQL schema in [src/db/schema.sql](src/db/schema.sql) stores:

- workflow execution metadata
- step execution status
- execution input payloads
- step output payloads
- retry metadata hooks for future runtime behavior

The repository layer in [src/db/execution-repository.ts](src/db/execution-repository.ts) can create, fetch, and update workflow executions in the database.

## Current architecture

### Domain model

- `Workflow`: a workflow consists of multiple steps and an ID
- `Step`: a workflow node with `id`, `dependencies`, `kind`, and `config`
- `WorkflowExecution`: a single run of a workflow with input and step state
- `StepExecution`: the state and output for one step in an execution

### Execution flow

A typical flow looks like this:

1. define a workflow as a DAG
2. validate the graph structure
3. create a workflow execution instance
4. persist the initial execution state
5. schedule runnable steps based on dependency completion
6. update step statuses as work progresses
7. persist final state and outputs

## Example workflow

```ts
const workflow = {
  id: "user-onboarding",
  steps: [
    { id: "create-user", dependencies: [], kind: "http", config: {} },
    { id: "send-welcome-email", dependencies: ["create-user"], kind: "http", config: {} },
    { id: "grant-access", dependencies: ["create-user"], kind: "http", config: {} },
    { id: "finalize-account", dependencies: ["send-welcome-email", "grant-access"], kind: "http", config: {} }
  ]
};
```

This pattern supports both linear and parallel execution paths while preserving dependency correctness.

## Tech stack

- Runtime: Node.js
- Language: TypeScript
- Build/test: TypeScript + Vitest
- Database: PostgreSQL
- Containerization: Docker + Docker Compose
- Data access: `pg` client
- Execution model: strongly typed domain objects

## Development setup

### Prerequisites

- Node.js
- pnpm
- Docker and Docker Compose
- PostgreSQL (for repository integration and persistence work)

### Local database with Docker

The project is already using Docker for local PostgreSQL via [docker-compose.yml](docker-compose.yml). This gives a consistent dev environment for the workflow persistence layer and makes it easy to extend toward Redis, BullMQ, and the app itself.

```bash
docker compose up -d
```

This starts the Postgres service with the expected `tempura` database and credentials used by the app and integration tests.

### Install dependencies

```bash
pnpm install
```

### Run tests

```bash
pnpm test -- --run
```

> Note: the repository integration tests currently expect a local PostgreSQL instance with both the `tempura` and `tempura_test` databases available. At the moment, `tempura_test` is created manually during local development, and the plan is to add it to the Docker Compose setup later as part of the full containerized dev environment.

### Start the app

```bash
pnpm dev
```

## Containerization roadmap

Tempura is designed to evolve into a fully containerized workflow runtime:

- [x] PostgreSQL in Docker for local development
- [ ] Redis + BullMQ in Docker for queueing and worker orchestration
- [ ] containerized Tempura application runtime
- [ ] production-ready Docker image and compose environment

## Roadmap

The project is now focused on the following milestones:

- [x] workflow DAG validation
- [x] execution creation and step state transitions
- [x] PostgreSQL persistence layer
- [x] repository CRUD for workflow execution records
- [x] Dockerized local Postgres development environment
- [ ] Redis + BullMQ queue infrastructure in Docker
- [ ] scheduler for dependency-aware step execution
- [ ] background worker runtime
- [ ] retry and failure policies
- [ ] idempotent execution guarantees
- [ ] queue/worker orchestration
- [ ] app containerization for Tempura
- [ ] compensation workflows and saga support
- [ ] API layer and observability dashboard

## Current direction

Tempura is evolving from a foundational workflow engine into a more complete orchestration runtime. The near-term focus is on moving from static validation and persistence into scheduling, durable job execution, and operational resilience.

---

Built for durable, dependency-aware orchestration work.