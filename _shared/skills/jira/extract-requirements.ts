import { defineSkill } from "../../types";

export interface JiraTicketData {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  labels: string[];
  components: string[];
  acceptanceCriteria?: string;
  linkedIssues?: Array<{ key: string; type: string; summary: string }>;
}

export type RequirementType = "functional" | "non-functional" | "ui" | "api" | "data" | "integration";
export type RequirementPriority = "must" | "should" | "could";

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  acceptanceCriteria: string[];
}

export interface ExtractRequirementsOutput {
  requirements: Requirement[];
  rawSummary: string;
  tags: string[];
  figmaLinks: string[];
}

function classifyType(line: string): RequirementType {
  const l = line.toLowerCase();
  if (/figma|design|ui|ux|layout|component|screen|page|button|modal/.test(l)) return "ui";
  if (/api|endpoint|request|response|rest|graphql|webhook/.test(l)) return "api";
  if (/database|db|table|schema|migration|model|field|column/.test(l)) return "data";
  if (/integrat|third.party|external|service|stripe|jira|slack/.test(l)) return "integration";
  if (/performance|security|scalab|reliab|uptime|latency/.test(l)) return "non-functional";
  return "functional";
}

function classifyPriority(line: string, index: number): RequirementPriority {
  const l = line.toLowerCase();
  if (/must|required|critical|should have|blocker/.test(l)) return "must";
  if (/should|important|high priority|expected/.test(l)) return "should";
  if (/could|nice.to.have|optional|low priority/.test(l)) return "could";
  return index < 3 ? "must" : "should";
}

function extractFigmaLinks(text: string): string[] {
  const re = /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[^\s\)\\"']+/g;
  return [...new Set(text.match(re) ?? [])];
}

function extractTags(ticket: JiraTicketData): string[] {
  const tags = new Set<string>();
  ticket.labels.forEach((l) => tags.add(l.toLowerCase()));
  ticket.components.forEach((c) => tags.add(c.toLowerCase()));
  const text = `${ticket.summary} ${ticket.description}`.toLowerCase();
  ["react", "next.js", "nestjs", "typescript", "api", "ui", "backend", "frontend"].forEach((kw) => {
    if (text.includes(kw)) tags.add(kw);
  });
  return [...tags];
}

export const extractRequirements = defineSkill<{ ticketData: JiraTicketData }, ExtractRequirementsOutput>(
  {
    name: "jira_extract_requirements",
    description: "Parse Jira ticket fields into a structured requirements list with types and priorities",
    service: "jira",
    gather: ["Full Jira ticket data — summary, description, labels, components, linked issues"],
    inputSchema: {
      ticketData: {
        key: "PRMV-12345",
        summary: "Ticket summary",
        description: "Ticket description",
        issueType: "Task",
        priority: "Medium",
        labels: [],
        components: [],
        acceptanceCriteria: "optional string",
        linkedIssues: [{ key: "PRMV-111", type: "relates to", summary: "Related ticket" }],
      },
    },
  },
  async ({ ticketData }) => {
    const fullText = [ticketData.summary, ticketData.description ?? "", ticketData.acceptanceCriteria ?? ""].join("\n");
    const lines = fullText.split(/\n|;/).map((l) => l.replace(/^[-*•#]+\s*/, "").trim()).filter((l) => l.length > 15);
    const requirements: Requirement[] = lines.map((line, i) => ({
      id: `REQ-${String(i + 1).padStart(3, "0")}`,
      title: line.length > 80 ? line.slice(0, 77) + "..." : line,
      description: line,
      type: classifyType(line),
      priority: classifyPriority(line, i),
      acceptanceCriteria: ticketData.acceptanceCriteria
        ? ticketData.acceptanceCriteria.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
        : [],
    }));
    return { requirements, rawSummary: ticketData.summary, tags: extractTags(ticketData), figmaLinks: extractFigmaLinks(fullText) };
  },
);
