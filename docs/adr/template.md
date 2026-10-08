# ADR-{NNN}: {Title}

**Status:** Accepted
**Date:** {YYYY-MM-DD}
**Type:** skill | agent | mcp-service
**Author:** {user name or "AI Hub Builder"}

## User Request

> {Exact user messages that initiated this work — copy the full conversation from Brainstorm phase.
> Include ALL user messages, not just the first one. This is the primary source of "why".
> If the user provided links (Jira tickets, Figma, Slack threads) — include them here.}

## Brief

{The Brief produced at the end of Brainstorm, or a summary if user skipped Brainstorm}

**Problem:** {who has what problem}
**Solution:** {what we built}
**Trigger:** {when/how this gets used}

## Decision

**Pattern:** {Pattern 1 (Claude as bridge) | Pattern 2 (Worker with Vault) | Mixed}

**Data sources:**
- {Service} — {what data, how it's gathered}

**What was created:**
- {type}: `{path}` — {description}

**What was reused:**
- `{path}` — {description}

## Data Flow

```
[Source]         → [Skill]              → [Output]           → [Destination]
───────────────────────────────────────────────────────────────────────────────
...
```

## Alternatives Considered

{If any alternatives were discussed — why this path was chosen.
If none — write "None — straightforward implementation."}

## Consequences

- {What this enables}
- {What this depends on}
- {Known limitations or future work}