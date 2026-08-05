# 🍤 Tempura

**Tempura** is a distributed workflow orchestration engine built with **Node.js** and **TypeScript**. It executes workflows defined as **Directed Acyclic Graphs (DAGs)**, providing durable execution, dependency-aware scheduling, and fault tolerance.

> 🚧 **Status:** Early development

## Vision

Tempura aims to provide a lightweight workflow engine capable of:

- Executing DAG-based workflows
- Persisting workflow state for crash recovery
- Parallel execution of independent tasks
- Automatic retries and dependency resolution
- Durable, at-least-once task execution
- Compensation workflows (Saga pattern)

## Planned Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **API:** Fastify
- **Database:** PostgreSQL
- **Queue:** BullMQ + Redis
- **ORM:** Drizzle
- **Validation:** Zod

## Roadmap

- [ ] Workflow definition & DAG validation
- [ ] Workflow persistence
- [ ] Task orchestration
- [ ] Background workers
- [ ] Retry policies
- [ ] Idempotent execution
- [ ] Compensation (Saga) support
- [ ] Dashboard & metrics

---

**Work in progress.** Contributions, feedback, and ideas are always welcome.