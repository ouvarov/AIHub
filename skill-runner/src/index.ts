import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSkillTools } from "./tools/run-skill";
import { BUILDER_INSTRUCTIONS } from "./builder-instructions";

type Env = {};

export class SkillRunnerMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Promova AI Hub",
    version: "1.0.0",
    instructions: BUILDER_INSTRUCTIONS,
  });

  async init() {
    registerSkillTools(this.server);
  }
}

export default SkillRunnerMCP.serve("/mcp");