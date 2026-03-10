# Agents — How to Write

## What is an Agent?

An agent is an **orchestrator** — it combines multiple skills into a workflow
to solve a business problem. It does NOT know about MCP.

## Contract

```typescript
import { defineAgent, type SkillContext } from "../types";
import { getTicket } from "../skills/jira/get-ticket";
import { createPR } from "../skills/github/create-pr";

export const prBuilderAgent = defineAgent<
  { ticketId: string },
  { prUrl: string }
>(
  {
    name: "pr_builder",
    description: "Takes a Jira ticket and creates a PR with proper title",
    skills: ["jira_get_ticket", "github_create_pr"],
  },
  async (input, ctx) => {
    const ticket = await getTicket.execute({ ticketId: input.ticketId }, ctx);
    const pr = await createPR.execute({
      branch: `feature/${input.ticketId}`,
      title: ticket.summary,
      body: ticket.description,
    }, ctx);
    return { prUrl: pr.url };
  },
);
```

## Rules

1. **Import skills, never call APIs directly** — if there's no skill for what you need, create one first
2. **All secrets flow through `ctx`** — agent passes ctx to every skill
3. **One agent = one business workflow**
4. **Typed input and output** — define interfaces clearly
5. **No MCP imports** — agents don't know about MCP

## Naming

- File: `kebab-case.ts` (e.g. `pr-builder.ts`)
- Agent name: `snake_case` (e.g. `pr_builder`)
- Export: named export, camelCase (e.g. `export const prBuilderAgent = defineAgent(...)`)