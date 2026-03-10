import { defineSkill } from "../../types";
import type { ExtractRequirementsOutput } from "../jira/extract-requirements";
import type { FigmaDesignContext } from "../figma/extract-design-context";
import type { GapAnalysisOutput } from "../analysis/build-gap-analysis";
import type { EffortEstimate } from "../analysis/estimate-effort";

export interface FormatPrerefInput { ticketKey: string; requirements: ExtractRequirementsOutput; design: FigmaDesignContext; gaps: GapAnalysisOutput; effort: EffortEstimate; }
export interface FormatPrerefOutput { jiraWikiMarkup: string; markdownPreview: string; summary: string; }

const A = { create: "🆕", modify: "✏️", reuse: "♻️", investigate: "🔍" };
const S = { high: "🔴", medium: "🟡", low: "🟢" };
const C = { low: "Low", medium: "Medium", high: "High" };
function groupBy<T>(arr: T[], key: (i: T) => string): Record<string, T[]> {
  return arr.reduce((acc, i) => { const k = key(i); (acc[k] ??= []).push(i); return acc; }, {} as Record<string, T[]>);
}

export const formatPrerefReport = defineSkill<FormatPrerefInput, FormatPrerefOutput>(
  {
    name: "formatting_format_preref_report",
    description: "Combine all pre-refinement data into Jira wiki markup and Markdown preview",
    service: "formatting",
    gather: [],
    inputSchema: {
      ticketKey: "PRMV-12345",
      requirements: {
        requirements: [{ id: "REQ-001", title: "...", description: "...", type: "functional", priority: "must", acceptanceCriteria: [] }],
        rawSummary: "Ticket summary",
        tags: ["react", "frontend"],
        figmaLinks: ["https://figma.com/design/..."],
      },
      design: {
        hasDesign: true,
        summary: "Short description of the design",
        links: ["https://figma.com/design/..."],
        components: [],
        notes: "",
      },
      gaps: {
        gaps: [{ requirementId: "REQ-001", requirementTitle: "...", action: "create", description: "...", affectedFiles: [], complexity: "medium" }],
        affectedRepositories: ["promova/monorepo"],
        newFilesNeeded: [],
        modifiedFilesNeeded: [],
        summary: "1 requirements: 1 create, 0 modify, 0 reuse.",
      },
      effort: {
        totalHours: { min: 2, max: 4 },
        taskBreakdown: [{ type: "frontend", title: "Implement component", hours: { min: 2, max: 4 } }],
        risks: [{ title: "Risk title", description: "Risk description", severity: "medium", mitigation: "Mitigation plan" }],
        recommendation: "Ready for sprint.",
      },
    },
  },
  async ({ ticketKey, requirements, design, gaps, effort }) => {
    const now = new Date().toISOString().split("T")[0];
    const byType = groupBy(requirements.requirements, (r) => r.type);

    const md: string[] = [];
    md.push(`## 🤖 Pre-refinement Analysis — ${ticketKey}`, `> Generated on ${now}`, "");
    md.push("### 📋 Requirements", `**${requirements.requirements.length} requirements** across ${Object.keys(byType).length} type(s):`);
    Object.entries(byType).forEach(([t, rs]) => md.push(`- **${t}**: ${rs.length} (${rs.filter((r) => r.priority === "must").length} must-have)`));
    md.push("", "### 🎨 Design");
    design.hasDesign ? (md.push(design.summary), design.links.forEach((l) => md.push(`- ${l}`))) : md.push("No Figma design found.");
    md.push("", "### 🔧 Implementation Plan", `**${gaps.gaps.length} tasks** | Repos: ${gaps.affectedRepositories.join(", ") || "TBD"}`, "");
    gaps.gaps.forEach((g) => {
      md.push(`**${A[g.action] ?? "•"} ${g.action.toUpperCase()}** — ${g.requirementTitle} _(${C[g.complexity]})_`, `> ${g.description}`);
      if (g.affectedFiles.length) md.push(`> Files: \`${g.affectedFiles.join("\`, \`")}\``);
      md.push("");
    });
    md.push("### ⏱️ Effort Estimate", `**Total: ${effort.totalHours.min}–${effort.totalHours.max}h**`, "");
    effort.taskBreakdown.forEach((t) => md.push(`- \`${t.type}\` ${t.title}: ${t.hours.min}–${t.hours.max}h`));
    md.push("");
    if (effort.risks.length) {
      md.push("### ⚠️ Risks");
      effort.risks.forEach((r) => { md.push(`${S[r.severity]} **${r.title}**`, `> ${r.description}`, `> _Mitigation: ${r.mitigation}_`, ""); });
    }
    md.push("---", `_${effort.recommendation}_`);

    const jira: string[] = [];
    jira.push(`h2. 🤖 Pre-refinement Analysis — ${ticketKey}`, `_Generated on ${now}_`, "");
    jira.push("h3. 📋 Requirements", `*${requirements.requirements.length} requirements* across ${Object.keys(byType).length} type(s):`);
    Object.entries(byType).forEach(([t, rs]) => jira.push(`* *${t}*: ${rs.length} (${rs.filter((r) => r.priority === "must").length} must-have)`));
    jira.push("", "h3. 🎨 Design");
    design.hasDesign ? (jira.push(design.summary), design.links.forEach((l) => jira.push(`* [${l}|${l}]`))) : jira.push("No Figma design found.");
    jira.push("", "h3. 🔧 Implementation Plan", `*${gaps.gaps.length} tasks* | Repos: ${gaps.affectedRepositories.join(", ") || "TBD"}`, "");
    gaps.gaps.forEach((g) => {
      jira.push(`h4. ${A[g.action] ?? "•"} ${g.action.toUpperCase()} — ${g.requirementTitle} (${C[g.complexity]})`, g.description);
      if (g.affectedFiles.length) jira.push(`Files: {{${g.affectedFiles.join("}}, {{")}}}}`);
      jira.push("");
    });
    jira.push("h3. ⏱️ Effort Estimate", `*Total: ${effort.totalHours.min}–${effort.totalHours.max}h*`, "||Task||Type||Hours||");
    effort.taskBreakdown.forEach((t) => jira.push(`|${t.title}|${t.type}|${t.hours.min}–${t.hours.max}h|`));
    jira.push("");
    if (effort.risks.length) {
      jira.push("h3. ⚠️ Risks");
      effort.risks.forEach((r) => { jira.push(`${S[r.severity]} *${r.title}* (${r.severity})`, r.description, `_Mitigation: ${r.mitigation}_`, ""); });
    }
    jira.push("----", `_${effort.recommendation}_`);

    return {
      jiraWikiMarkup: jira.join("\n"),
      markdownPreview: md.join("\n"),
      summary: `Analysis complete: ${gaps.gaps.length} tasks, ${effort.totalHours.min}–${effort.totalHours.max}h, ${effort.risks.length} risks`,
    };
  },
);
