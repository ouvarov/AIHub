export interface ServiceEntry {
  name: string;
  url: string;
  description: string;
  /** Skills this service uses (for discoverability) */
  skills: string[];
  /** Agents this service uses (for discoverability) */
  agents: string[];
}

// Add new services here. After deploy, all engineers see them automatically.
export const services: Record<string, ServiceEntry> = {
  "skill-runner": {
    name: "Skill Runner",
    url: "https://promova-mcp-skill-runner.uvarov-alexandr89.workers.dev",
    description:
      "Universal MCP that exposes all shared skills as tools. Use list_skills to discover available skills, then call any skill by name.",
    skills: ["list_skills", "all shared skills auto-registered"],
    agents: [],
  },
};