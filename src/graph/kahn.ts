import type { Workflow } from "../domain/workflow.js";

export function validateWorkflow(workflow: Workflow): boolean {
    const indegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const queue: string[] = [];

    let head = 0;

    for (const step of workflow.steps) {

        if (indegree.has(step.id)) {
            return false;
        }

        indegree.set(step.id, 0);
        adjacency.set(step.id, []);
    }

    for (const step of workflow.steps) {

        for(const dep of step.dependencies) {
            // update parents

            if(adjacency.has(dep)) {
                const children = adjacency.get(dep)!;
                children.push(step.id);
            }

            else {
                return false;
            }

            // update indegree

            const deps: number = indegree.get(step.id)!;
            indegree.set(step.id, deps + 1);
        }

        if(indegree.get(step.id) === 0) {
            queue.push(step.id);
        }
    }

    while(head !== queue.length) {

        const node: string = queue[head++]!;

        for(const adj of adjacency.get(node)!) {

            let deg: number = indegree.get(adj)!;
            deg--;
            indegree.set(adj, deg);

            if(deg === 0) {

                queue.push(adj);

            }

        }

    }

    return head === workflow.steps.length;
}