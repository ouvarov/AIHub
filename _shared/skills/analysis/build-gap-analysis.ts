import { defineSkill } from "../../types";
import type { Requirement } from "../jira/extract-requirements";

export interface CodeSearchResult { file: string; snippet: string; relevance: number; repository?: string; }
export type GapAction = "create" | "modify" | "reuse" | "investigate";
export interface CodeGap { requirementId: string; requirementTitle: string; action: GapAction; description: string; affectedFiles: string[]; complexity: "low" | "medium" | "high"; }
export interface GapAnalysisOutput { gaps: CodeGap[]; affectedRepositories: string[]; newFilesNeeded: string[]; modifiedFilesNeeded: string[]; summary: string; }

function determineAction(req: Requirement, codeResults: CodeSearchResult[]): GapAction {
  const relevant = codeResults.filter((r) => r.relevance > 0.6);
  if (relevant.length === 0) return "create";
  if (relevant.some((r) => r.relevance > 0.85)) return "modify";
  if (relevant.length > 2) return "reuse";
  return "investigate";
}

function estimateComplexity(req: Requirement, action: GapAction): CodeGap["complexity"] {
  if (action === "reuse") return "low";
  if (req.type === "integration" || req.type === "api") return "high";
  if (req.type === "ui" && action === "create") return "medium";
  if (action === "create") return "medium";
  return "low";
}

function suggestFilePath(req: Requirement, action: GapAction): string[] {
  const base: Record<Requirement["type"], string> = { ui: "components/", api: "api/", data: "models/", integration: "integrations/", functional: "features/", "non-functional": "config/" };
  if (action === "reuse") return [];
  const dir = base[req.type] ?? "src/";
  const name = req.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return [`${dir}${name}.ts`];
}

function buildGapDescription(req: Requirement, action: GapAction, relevant: CodeSearchResult[]): string {
  switch (action) {
    case "create": return `No existing code found. Need to implement from scratch: ${req.description.slice(0, 120)}`;
    case "modify": return `Existing code in ${relevant[0]?.file ?? "unknown"} — needs modification: ${req.description.slice(0, 100)}`;
    case "reuse": return `Existing implementation covers this: ${relevant[0]?.file ?? ""}. Reuse or extend.`;
    case "investigate": return `Partial matches — needs investigation: ${req.description.slice(0, 100)}`;
  }
}

export const buildGapAnalysis = defineSkill<{ requirements: Requirement[]; codeResults: CodeSearchResult[] }, GapAnalysisOutput>(
  {
    name: "analysis_build_gap_analysis",
    description: "Compare structured requirements against existing code search results to identify what needs to be created, modified, or reused",
    service: "analysis",
    gather: ["Code search results from Gandalf — semantic_search using ticket summary and major requirements"],
  },
  async ({ requirements, codeResults }) => {
    const repos = new Set<string>();
    codeResults.forEach((r) => { if (r.repository) repos.add(r.repository); });
    const gaps: CodeGap[] = requirements.filter((r) => r.priority !== "could").map((req) => {
      const relevant = codeResults.filter((cr) => cr.snippet.toLowerCase().includes(req.title.toLowerCase().split(" ")[0]) || cr.relevance > 0.5);
      const action = determineAction(req, relevant);
      return {
        requirementId: req.id, requirementTitle: req.title, action,
        description: buildGapDescription(req, action, relevant),
        affectedFiles: [...relevant.filter((r) => r.relevance > 0.6).map((r) => r.file), ...suggestFilePath(req, action)].slice(0, 5),
        complexity: estimateComplexity(req, action),
      };
    });
    const newFiles = gaps.filter((g) => g.action === "create").flatMap((g) => g.affectedFiles);
    const modifiedFiles = gaps.filter((g) => g.action === "modify").flatMap((g) => g.affectedFiles);
    return {
      gaps, affectedRepositories: [...repos],
      newFilesNeeded: [...new Set(newFiles)], modifiedFilesNeeded: [...new Set(modifiedFiles)],
      summary: `${gaps.length} requirements: ${gaps.filter((g) => g.action === "create").length} create, ${gaps.filter((g) => g.action === "modify").length} modify, ${gaps.filter((g) => g.action === "reuse").length} reuse.`,
    };
  },
);
