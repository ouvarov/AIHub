import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { skills } from "../registry";

/**
 * Auto-register all skills from the registry as MCP tools.
 * Each skill becomes a tool with name = skill.meta.name.
 * Input is passed as a JSON string (universal schema).
 */
export function registerSkillTools(server: McpServer) {
  // Builder entry point — returns architecture instructions
  server.tool(
    "start_building",
    `Call this FIRST when user wants to create a new MCP service in AI Hub.\nReturns the architecture rules and templates. You MUST read and follow them before generating any code.\nTrigger words: "создай MCP", "новый сервис", "автоматизировать", "AI Hub", "аи хаб".`,
    {},
    async () => {
      // Fetch CLAUDE.md and TEMPLATE.md from GitHub
      const files = [
        { name: "CLAUDE.md", url: "https://raw.githubusercontent.com/ouvarov/AIHub/main/CLAUDE.md" },
        { name: "TEMPLATE.md", url: "https://raw.githubusercontent.com/ouvarov/AIHub/main/_template/TEMPLATE.md" },
      ];

      const results = await Promise.all(
        files.map(async (f) => {
          try {
            const res = await fetch(f.url);
            if (!res.ok) return `# ${f.name}\n\nFailed to fetch: ${res.status}`;
            return `# ${f.name}\n\n${await res.text()}`;
          } catch (e) {
            return `# ${f.name}\n\nFetch error: ${e}`;
          }
        })
      );

      return {
        content: [{ type: "text" as const, text: results.join("\n\n---\n\n") }],
      };
    },
  );

  // List all available skills
  server.tool(
    "list_skills",
    "List all available skills with their names and descriptions.",
    {},
    async () => {
      const list = skills.map((s) => ({
        name: s.meta.name,
        description: s.meta.description,
        domain: s.meta.service,
        gather: s.meta.gather || [],
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  // Register each skill as a tool
  for (const skill of skills) {
    // Build description with gather instructions + input schema hint
    let description = skill.meta.description;
    if (skill.meta.gather && skill.meta.gather.length > 0) {
      description += "\nBEFORE calling this skill, use your available MCP tools to gather:\n";
      description += skill.meta.gather.map((g, i) => `${i + 1}. ${g}`).join("\n");
      description += "\nPass the gathered data as JSON input.";
    }
    if (skill.meta.inputSchema) {
      description += `\n\nExpected input JSON structure:\n${JSON.stringify(skill.meta.inputSchema, null, 2)}`;
    }

    server.tool(
      skill.meta.name,
      description,
      {
        input: z.string().describe("JSON string with skill input parameters"),
      },
      async ({ input }) => {
        try {
          const parsed = JSON.parse(input);
          const result = await skill.execute(parsed, { env: {} });

          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }
}
