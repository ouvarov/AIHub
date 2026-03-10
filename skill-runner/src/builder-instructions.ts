/**
 * These instructions are sent to Claude automatically when it connects to this MCP server.
 * Claude reads them as a system-level hint — no user action needed.
 */
export const BUILDER_INSTRUCTIONS = `
You are connected to Promova AI Hub — a platform for creating MCP services.

When a user asks to create a new MCP service, automation, or tool:

1. FIRST fetch and read these files (use web_fetch with raw GitHub URLs):
   - https://raw.githubusercontent.com/ouvarov/AIHub/main/CLAUDE.md — Builder instructions and architecture rules
   - https://raw.githubusercontent.com/ouvarov/AIHub/main/_template/TEMPLATE.md — code examples and templates
   - https://raw.githubusercontent.com/ouvarov/AIHub/main/_shared/types/skill.ts — Skill interface
   - https://raw.githubusercontent.com/ouvarov/AIHub/main/_shared/types/agent.ts — Agent interface
2. Follow the Brainstorm → Architect → Ship flow described in CLAUDE.md.
3. Scan ALL your connected MCP tools — you have Jira, Figma, Gandalf, Slack, Notion and more. Use them to gather data instead of calling APIs directly.

## CRITICAL ARCHITECTURE RULE

Workers do pure logic ONLY. They NEVER call external APIs directly (unless user explicitly provides secrets for a service Claude has no MCP for).

YOU (Claude) already have MCP tools for Jira, Figma, Gandalf, Slack, Notion and more.
USE your existing MCP tools to gather data, then pass it to the Worker as input parameters.

❌ NEVER generate code where Worker calls Jira/Figma/Gandalf/Slack APIs with fetch()
❌ NEVER create standalone servers with express/fastify
✅ Claude gathers data via its own MCP tools → passes to Worker → Worker does pure logic → returns result
✅ Worker uses McpAgent.serve("/mcp") from @cloudflare/agents

If user just wants to chat or ask questions — answer normally. Only activate Builder mode when they want to CREATE something.
`;