# Skills — How to Write

## What is a Skill?

A skill is an **atomic action** — one function that does one thing.
It does NOT know about MCP, agents, or Claude. Just input → output.

## Contract

```typescript
import { defineSkill } from "../types";

export const mySkill = defineSkill<InputType, OutputType>(
  {
    name: "domain_action",           // snake_case, prefixed with domain
    description: "What it does",
    service: "domain-name",          // knowledge domain: jira, figma, analysis, formatting
    gather: [                        // OPTIONAL: what Claude should fetch from other MCPs before calling
      "Jira ticket data (get issue by key)",
      "Code context from Gandalf (semantic search)",
    ],
  },
  async (input, ctx) => {
    // Pure logic — no fetch, no tokens
    // All data arrives pre-fetched as input parameters
    return { processed: true };
  },
);
```

## Rules

1. **One file = one skill** (or a few closely related ones)
2. **No fetch, no tokens** — skills receive pre-fetched data as input. Claude gathers data from his MCPs and passes it.
3. **Typed input and output** — define interfaces in the same file
4. **No MCP imports** — skills don't know about MCP
5. **Folder = knowledge domain** — `skills/figma/`, `skills/jira/`, `skills/analysis/`, NOT `skills/preref/`
6. **`gather` field** — if the skill needs data from external MCPs (Jira, Gandalf, Figma), describe what Claude should fetch. This appears in the tool description when skill-runner registers it.
7. **Always register in `skill-runner/src/registry.ts`** — so Claude Desktop can call it

## Naming

- File: `kebab-case.ts` (e.g. `create-pr.ts`)
- Skill name: `snake_case` with service prefix (e.g. `github_create_pr`)
- Export: named export, camelCase (e.g. `export const createPR = defineSkill(...)`)

## Example

See `_shared/skills/` for existing skills.