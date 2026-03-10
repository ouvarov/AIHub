# Promova AI Hub

Unified MCP platform for Promova. All MCP services live here, auto-build on merge, and auto-deploy to Cloudflare Workers.

## Problem

MCP servers are scattered across different repos and hosts. Nobody knows what exists. Adding a new one requires DevOps knowledge.

## Solution

One monorepo. Any team member can create a new MCP service — the AI Builder handles everything from idea to PR.

## How it works

```
Team member: "I want an MCP that analyzes user reviews"
  │
  ├─ Brainstorm — Builder asks questions, researches, produces a brief
  ├─ Architect  — Data flow, Skills, Agent, MCP tools, code
  └─ Ship       — Creates PR, review, merge, auto-deploy
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Gateway                           │
│         (single entry point, auth, routing)          │
└──────┬──────────────┬───────────────┬───────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ skill-runner│ │ service-A │ │ service-B  │
│ (universal) │ │           │ │            │
└─────────────┘ └───────────┘ └────────────┘
       │
┌──────▼──────────────────────────────────┐
│            _shared/                      │
│  skills/ (reusable pure functions)       │
│  agents/ (workflow orchestrators)        │
│  types/  (defineSkill, defineAgent)      │
└──────────────────────────────────────────┘
```

- **Skills** — pure functions, no secrets, no fetch. Reusable across services.
- **Agents** — combine skills into workflows.
- **MCP tools** — entry points for Claude. Tool descriptions tell Claude what data to gather before calling.
- **Gateway** — routes requests, will handle OAuth 2.1 via Authentik.
- **Skill Runner** — universal MCP that auto-exposes all registered skills as tools.

## Project structure

```
├── CLAUDE.md              # AI Builder instructions (Brainstorm → Architect → Ship)
├── _shared/
│   ├── skills/            # Pure functions by domain (jira/, figma/, analysis/, etc.)
│   ├── agents/            # Workflow orchestrators
│   └── types/             # Skill & Agent type definitions
├── _template/
│   └── TEMPLATE.md        # Full reference for creating new services
├── gateway/               # Entry point, routing, future OAuth
├── skill-runner/          # Universal MCP — auto-registers all skills
├── .github/workflows/
│   └── deploy.yml         # Auto-deploy on merge to main
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Creating a new MCP service

Open this project in Claude Code, Claude Desktop, or Claude Web (with GitHub integration) and describe what you need. The Builder (CLAUDE.md) will guide you through Brainstorm → Architect → Ship.

## Tech stack

- **Runtime**: Cloudflare Workers
- **MCP**: `@cloudflare/agents` + `@modelcontextprotocol/sdk`
- **Validation**: `zod`
- **Gateway**: `hono`
- **Auth**: OAuth 2.1 via Authentik (planned)
- **CI/CD**: GitHub Actions → `wrangler deploy`
- **Monorepo**: pnpm workspaces

## Local development

```bash
pnpm install
pnpm --filter gateway dev
pnpm --filter skill-runner dev
```

## Deployment

Push to `main` → GitHub Actions detects changed services → deploys only what changed. If `_shared/` changes, all services redeploy.