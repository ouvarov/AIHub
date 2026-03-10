# CLAUDE.md — Pre-refinement Analyzer MCP

## What this does

Automates Jira pre-refinement. Given a ticket key → produces structured analysis with requirements breakdown, implementation plan, effort estimate (min/max hours), risk flags → posts as Jira comment.

## How to use

Say: *"Проанализируй задачу PROJ-123"*

Claude will:
1. Read Repository Registry from Gandalf (`get_knowledge_page` path=`projects/repository-registry`)
2. Get full Jira ticket via Atlassian MCP
3. Run `semantic_search` in matched repos via Gandalf
4. Optionally fetch Figma design via Figma MCP
5. Call `preref_analyze` with all gathered data
6. Post returned `jiraWikiMarkup` as Jira comment

## Tool: `preref_analyze`

| Parameter | Required | Description |
|---|---|---|
| `ticketData` | ✅ | Full Jira issue data |
| `codeResults` | ✅ | Gandalf semantic_search results (can be `[]`) |
| `repositoryRegistryContent` | ✅ | Raw Markdown from Gandalf knowledge page |
| `figmaDesignContext` | ❌ | Raw text from Figma MCP |

## Skills
- `jira/resolve-repositories` — reads Gandalf registry, matches ticket to project_ids
- `jira/extract-requirements` — parses ticket → structured requirements
- `figma/extract-design-context` — processes Figma context
- `analysis/build-gap-analysis` — requirements vs existing code
- `analysis/estimate-effort` — hours + risks
- `formatting/format-preref-report` — Jira wiki markup

## Repository Registry
Lives in Gandalf: `projects/repository-registry` (project `promova/promova.com_monorepo`).
Add new repos there — no code changes needed.
