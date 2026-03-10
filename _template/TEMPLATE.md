# MCP Service Template

This is the reference for creating new MCP services. All examples are taken from the working `preref` service.

When creating a new MCP service, generate each file below, adapting names and logic to the new service.

---

## File Structure

```
{service-name}/
├── src/
│   ├── index.ts          # MCP server entry point
│   └── tools/
│       └── {tool}.ts     # Tool registration with zod schemas
├── package.json
├── tsconfig.json
├── wrangler.jsonc
└── CLAUDE.md             # How Claude should use this MCP
```

Plus shared code:
```
_shared/
├── skills/{domain}/{action}.ts    # Pure functions
├── agents/{agent-name}.ts         # Orchestrators
└── types/                         # defineSkill, defineAgent
```

---

## 1. Skill — `_shared/skills/{domain}/{action}.ts`

Pure function. No fetch, no tokens, no side effects.

```typescript
import { defineSkill } from "../../types";

// 1. Define input/output interfaces
export interface MyInput {
  text: string;
  options?: { verbose: boolean };
}

export interface MyOutput {
  results: string[];
  count: number;
}

// 2. Export skill with camelCase name
export const extractSomething = defineSkill<MyInput, MyOutput>(
  {
    name: "domain_extract_something",        // snake_case with domain prefix
    description: "What this skill does in one sentence",
    service: "domain",                        // knowledge domain: jira, figma, analysis, formatting, slack, etc.
    gather: ["Description of what Claude should fetch before calling this"],
  },
  async ({ text, options }) => {
    // Pure logic here — NO fetch(), NO tokens
    const results = text.split("\n").filter(Boolean);

    return {
      results,
      count: results.length,
    };
  },
);
```

### Real example — `_shared/skills/jira/extract-requirements.ts`

```typescript
import { defineSkill } from "../../types";

export interface JiraTicketData {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  labels: string[];
  components: string[];
  acceptanceCriteria?: string;
  linkedIssues?: Array<{ key: string; type: string; summary: string }>;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: "functional" | "non-functional" | "ui" | "api" | "data" | "integration";
  priority: "must" | "should" | "could";
  acceptanceCriteria: string[];
}

export interface ExtractRequirementsOutput {
  requirements: Requirement[];
  rawSummary: string;
  tags: string[];
}

export const extractRequirements = defineSkill<
  { ticketData: JiraTicketData },
  ExtractRequirementsOutput
>(
  {
    name: "jira_extract_requirements",
    description: "Parse Jira ticket into structured requirements list with types and priorities",
    service: "jira",
    gather: ["Jira ticket data (get issue by key — all fields)"],
  },
  async ({ ticketData }) => {
    // ... pure logic: parse lines, classify, extract tags
  },
);
```

---

## 2. Agent — `_shared/agents/{name}.ts`

Orchestrates skills. No API calls, no MCP knowledge.

```typescript
import { defineAgent } from "../types";
// Import skills
import { extractSomething } from "../skills/domain/extract-something";
import { formatResult } from "../skills/formatting/format-result";

export interface AgentInput {
  rawData: string;
  context?: object;
}

export interface AgentOutput {
  markdown: string;
  itemCount: number;
}

export const myAgent = defineAgent<AgentInput, AgentOutput>(
  {
    name: "my_agent",
    description: "What this agent does end-to-end",
    skills: ["domain_extract_something", "formatting_format_result"],
  },
  async (input, ctx) => {
    // Step 1: Extract
    const extracted = await extractSomething.execute(
      { text: input.rawData },
      ctx,
    );

    // Step 2: Format
    const formatted = await formatResult.execute(
      { items: extracted.results },
      ctx,
    );

    return {
      markdown: formatted.markdown,
      itemCount: extracted.count,
    };
  },
);
```

### Real example — `_shared/agents/preref-analyzer.ts`

Chains 6 skills: extract requirements → extract figma links → identify repos → gap analysis → estimate effort → format report.

---

## 3. MCP Tool — `{service}/src/tools/{tool}.ts`

Entry point with zod validation. Tool description tells Claude what to gather.

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { myAgent } from "../../../_shared/agents/my-agent";

export function registerTools(server: McpServer) {
  server.tool(
    "service_action",                          // snake_case tool name
    `Short description of what this tool does.

BEFORE calling this tool, use your available MCP tools to gather:
1. [Data from Service A] — use your {Service} MCP to [action]
2. [Data from Service B] — use your {Service} MCP to [action]
3. [Optional data] — if [condition], use your {Service} MCP to [action]

Pass ALL gathered data as parameters. The tool will:
- [what it does step 1]
- [what it does step 2]
- [what output format]

The output is [format]. [What Claude should do with the output].`,
    {
      inputData: z.object({
        field1: z.string().describe("What this field contains"),
        field2: z.array(z.object({
          name: z.string(),
          value: z.string(),
        })).describe("Array of items"),
        optionalField: z.object({
          key: z.string(),
        }).optional().describe("Optional context"),
      }),
    },
    async ({ inputData }) => {
      const result = await myAgent.execute(
        { rawData: inputData.field1, context: inputData.optionalField },
        { env: {} },
      );

      return {
        content: [
          { type: "text" as const, text: result.markdown },
          {
            type: "text" as const,
            text: `\n---\nSummary: ${result.itemCount} items processed`,
          },
        ],
      };
    },
  );
}
```

### Real example — `preref/src/tools/analyze.ts`

Defines `preref_analyze` with JiraTicketSchema, CodeContextSchema, FigmaContextSchema. Calls `prerefAnalyzer.execute()` and returns Jira wiki markup.

---

## 4. MCP Server Entry — `{service}/src/index.ts`

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/{tool}";

type Env = {};

export class {ServiceName}MCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Promova {Service Display Name}",
    version: "1.0.0",
  });

  async init() {
    registerTools(this.server);
  }
}

export default {ServiceName}MCP.serve("/mcp");
```

---

## 5. Config Files

### `{service}/wrangler.jsonc`

```jsonc
{
  "name": "promova-mcp-{service-name}",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

### `{service}/package.json`

```json
{
  "name": "{service-name}",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "agents": "^0.7.5",
    "@modelcontextprotocol/sdk": "^1.11.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250214.0",
    "typescript": "^5.7.0",
    "wrangler": "^4.0.0"
  }
}
```

### `{service}/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "paths": {
      "@shared/*": ["../_shared/*"]
    }
  },
  "include": ["src", "../_shared"]
}
```

---

## 6. Service CLAUDE.md — `{service}/CLAUDE.md`

```markdown
# CLAUDE.md — {Service Display Name} MCP Server

## What this MCP does

{One paragraph: what problem it solves, for whom.}

## Authentication

No secrets required (MVP). This is a pure-logic Worker — all data is passed by Claude.
Future: secrets will come from Vault via `SkillContext.env`.

## How to use

BEFORE calling `{tool_name}`, gather data using your available MCP tools:

1. **{Data type}** — use your {Service} MCP to {action}
2. **{Data type}** — use your {Service} MCP to {action}
3. **{Data type}** (optional) — if {condition}, use your {Service} MCP

Then call `{tool_name}` with all gathered data. The tool returns {output format} — {what Claude should do with it}.

## Skills used

- `_shared/skills/{domain}/{action}.ts` — {description}
- `_shared/skills/{domain}/{action}.ts` — {description}

## Agent used

- `_shared/agents/{agent-name}.ts` — {description}

## MCP Tools exposed

- `{tool_name}` — {what it accepts and returns}
```

---

## 7. Gateway Registry — `gateway/src/registry.ts`

Add entry to the `services` record:

```typescript
"{service-name}": {
  name: "{Service Display Name}",
  url: "https://promova-mcp-{service-name}.workers.dev",
  description: "{What this service does — one sentence}",
  skills: ["skill_name_1", "skill_name_2"],
  agents: ["agent_name"],
},
```

---

## 8. Skill Runner Registry — `skill-runner/src/registry.ts`

Add import for every new skill:

```typescript
import { extractSomething } from "../../_shared/skills/domain/extract-something";
```

And add to the exported array.

---

## Checklist

When creating a new MCP service, verify:

- [ ] All skills are pure functions (no fetch, no tokens)
- [ ] All skills registered in `skill-runner/src/registry.ts`
- [ ] Agent only calls skills, never APIs
- [ ] MCP tool description tells Claude what to gather BEFORE calling
- [ ] Tool description references services by name (Jira, Figma), NOT by tool ID
- [ ] `wrangler.jsonc` name matches `promova-mcp-{service-name}`
- [ ] Service added to `gateway/src/registry.ts`
- [ ] Service `CLAUDE.md` documents the full usage flow
- [ ] `package.json` name matches service folder name
- [ ] No hardcoded secrets (MVP: no fetch; future: secrets via Vault + `SkillContext.env`)