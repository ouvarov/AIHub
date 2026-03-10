import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prerefAnalyzer } from "../../../_shared/agents/preref-analyzer";

const JiraTicketSchema = z.object({
  key: z.string(),
  summary: z.string(),
  description: z.string(),
  issueType: z.string(),
  priority: z.string(),
  labels: z.array(z.string()).default([]),
  components: z.array(z.string()).default([]),
  acceptanceCriteria: z.string().optional(),
  linkedIssues: z.array(z.object({ key: z.string(), type: z.string(), summary: z.string() })).optional(),
});

const CodeSearchResultSchema = z.object({
  file: z.string(),
  snippet: z.string(),
  relevance: z.number().min(0).max(1),
  repository: z.string().optional(),
});

export function registerTools(server: McpServer) {
  server.tool(
    "preref_analyze",
    `Full pre-refinement analysis for a Jira ticket. Returns ready-to-post Jira wiki markup.

BEFORE calling, gather via your MCP tools:
1. Repository Registry — Gandalf get_knowledge_page(path="projects/repository-registry", project_id="promova/promova.com_monorepo")
2. Jira ticket — Atlassian MCP full issue by key
3. Code results — Gandalf semantic_search with ticket summary (up to 10 results)
4. Figma context (optional) — Figma MCP get_design_context if ticket has Figma links

If needsClarification=true: show clarificationQuestion to user, wait, then call again with correct codeResults.
Post jiraWikiMarkup via Jira MCP addCommentToJiraIssue.`,
    {
      ticketData: JiraTicketSchema,
      codeResults: z.array(CodeSearchResultSchema).default([]),
      figmaDesignContext: z.string().optional(),
      repositoryRegistryContent: z.string().describe("Raw Markdown of Repository Registry from Gandalf"),
    },
    async ({ ticketData, codeResults, figmaDesignContext, repositoryRegistryContent }) => {
      const result = await prerefAnalyzer.execute({ ticketData, codeResults, figmaDesignContext, repositoryRegistryContent });
      if (result.needsClarification) {
        return { content: [{ type: "text" as const, text: `⚠️ Требуется уточнение\n\n${result.clarificationQuestion}\n\nПосле ответа пользователя — запусти semantic_search и вызови preref_analyze снова.` }] };
      }
      return {
        content: [
          { type: "text" as const, text: result.jiraWikiMarkup },
          { type: "text" as const, text: `\n---\n📊 ${result.summary}\n\n_Preview:_\n\n${result.markdownPreview}` },
        ],
      };
    },
  );
}
