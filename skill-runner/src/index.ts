import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSkillTools } from "./tools/run-skill";

type Env = {};

export class SkillRunnerMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Promova Skill Runner",
    version: "1.0.0",
  });

  async init() {
    registerSkillTools(this.server);
  }
}

export default SkillRunnerMCP.serve("/mcp");