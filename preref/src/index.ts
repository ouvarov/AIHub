import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/analyze";

type Env = Record<string, never>;

export class PrerefMCP extends McpAgent<Env> {
  server = new McpServer({ name: "Promova Pre-refinement Analyzer", version: "1.0.0" });
  async init() { registerTools(this.server); }
}

export default PrerefMCP.serve("/mcp");
