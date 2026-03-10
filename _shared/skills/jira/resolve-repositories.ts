import { defineSkill } from "../../types";
import type { JiraTicketData } from "./extract-requirements";

export interface RepositoryEntry {
  projectId: string;
  githubUrl: string;
  description: string;
  keywords: string[];
}

export interface ResolveRepositoriesInput {
  ticketData: JiraTicketData;
  /**
   * Raw Markdown of the Repository Registry knowledge page.
   * Fetch via: get_knowledge_page({ path: "projects/repository-registry", project_id: "promova/promova.com_monorepo" })
   */
  registryContent: string;
}

export interface ResolveRepositoriesOutput {
  resolvedProjectIds: string[];
  needsClarification: boolean;
  clarificationQuestion?: string;
  allRepositories: RepositoryEntry[];
  confidence: "high" | "medium" | "low";
}

function parseRegistry(markdown: string): RepositoryEntry[] {
  const entries: RepositoryEntry[] = [];
  const sections = markdown.split(/^###\s+/m).slice(1);
  for (const section of sections) {
    const lines = section.trim().split("\n");
    const projectId = lines[0].trim();
    if (!projectId.includes("/")) continue;
    const githubMatch = section.match(/\*\*GitHub:\*\*\s*(https?:\/\/\S+)/);
    const descMatch = section.match(/\*\*Description:\*\*\s*(.+)/);
    const kwMatch = section.match(/\*\*Keywords:\*\*\s*(.+)/);
    entries.push({
      projectId,
      githubUrl: githubMatch?.[1]?.trim() ?? "",
      description: descMatch?.[1]?.trim() ?? "",
      keywords: kwMatch?.[1]?.split(",").map((k) => k.trim().toLowerCase()) ?? [],
    });
  }
  return entries;
}

function scoreRepo(entry: RepositoryEntry, ticket: JiraTicketData): number {
  const haystack = [ticket.summary, ticket.description ?? "", ...ticket.labels, ...ticket.components]
    .join(" ").toLowerCase();
  let points = 0;
  for (const kw of entry.keywords) {
    if (kw.length < 3) continue;
    if (haystack.includes(kw)) points += kw.length > 6 ? 2 : 1;
  }
  for (const field of [...ticket.components, ...ticket.labels]) {
    if (entry.keywords.includes(field.toLowerCase())) points += 3;
  }
  return points;
}

export const resolveRepositories = defineSkill<ResolveRepositoriesInput, ResolveRepositoriesOutput>(
  {
    name: "jira_resolve_repositories",
    description: "Read the live Repository Registry from Gandalf and match a Jira ticket to relevant Gandalf project_ids for code search.",
    service: "jira",
    gather: ["Repository Registry — call get_knowledge_page with path='projects/repository-registry' and project_id='promova/promova.com_monorepo'"],
  },
  async ({ ticketData, registryContent }) => {
    const repos = parseRegistry(registryContent);
    if (repos.length === 0) {
      return { resolvedProjectIds: [], needsClarification: true, clarificationQuestion: "Could not load repository registry from Gandalf. Which repository should I search for code?", allRepositories: [], confidence: "low" };
    }
    const scored = repos.map((r) => ({ repo: r, points: scoreRepo(r, ticketData) })).sort((a, b) => b.points - a.points);
    const topPoints = scored[0].points;
    if (topPoints === 0) {
      return { resolvedProjectIds: [], needsClarification: true, clarificationQuestion: buildQuestion(ticketData.summary, repos), allRepositories: repos, confidence: "low" };
    }
    const matches = scored.filter((s) => s.points >= topPoints - 2 && s.points > 0);
    if (matches.length > 3) {
      return { resolvedProjectIds: [], needsClarification: true, clarificationQuestion: buildQuestion(ticketData.summary, repos), allRepositories: repos, confidence: "low" };
    }
    return {
      resolvedProjectIds: matches.map((m) => m.repo.projectId),
      needsClarification: false,
      allRepositories: repos,
      confidence: topPoints >= 5 ? "high" : topPoints >= 2 ? "medium" : "low",
    };
  },
);

function buildQuestion(summary: string, repos: RepositoryEntry[]): string {
  const options = repos.map((r) => `- \`${r.projectId}\` — ${r.description}`).join("\n");
  return `Cannot determine the repository for task "${summary}".\n\nWhich repository should I search for code?\n${options}`;
}
