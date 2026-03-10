import { defineAgent } from "../types";
import type { JiraTicketData } from "../skills/jira/extract-requirements";
import type { CodeSearchResult } from "../skills/analysis/build-gap-analysis";
import { resolveRepositories } from "../skills/jira/resolve-repositories";
import { extractRequirements } from "../skills/jira/extract-requirements";
import { extractDesignContext } from "../skills/figma/extract-design-context";
import { buildGapAnalysis } from "../skills/analysis/build-gap-analysis";
import { estimateEffort } from "../skills/analysis/estimate-effort";
import { formatPrerefReport } from "../skills/formatting/format-preref-report";

export interface PrerefAnalyzerInput {
  ticketData: JiraTicketData;
  codeResults: CodeSearchResult[];
  figmaDesignContext?: string;
  /** Raw Markdown of Repository Registry from Gandalf get_knowledge_page */
  repositoryRegistryContent: string;
}

export interface PrerefAnalyzerOutput {
  jiraWikiMarkup: string;
  markdownPreview: string;
  summary: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export const prerefAnalyzer = defineAgent<PrerefAnalyzerInput, PrerefAnalyzerOutput>(
  {
    name: "preref_analyzer",
    description: "Full pre-refinement pipeline: resolve repos → requirements → design → gap analysis → effort → formatted Jira comment",
    skills: ["jira_resolve_repositories", "jira_extract_requirements", "figma_extract_design_context", "analysis_build_gap_analysis", "analysis_estimate_effort", "formatting_format_preref_report"],
  },
  async ({ ticketData, codeResults, figmaDesignContext, repositoryRegistryContent }, ctx) => {
    const repoResolution = await resolveRepositories.execute({ ticketData, registryContent: repositoryRegistryContent }, ctx);
    if (repoResolution.needsClarification) {
      return { jiraWikiMarkup: "", markdownPreview: "", summary: "", needsClarification: true, clarificationQuestion: repoResolution.clarificationQuestion };
    }
    const requirements = await extractRequirements.execute({ ticketData }, ctx);
    const design = await extractDesignContext.execute({ figmaLinks: requirements.figmaLinks, designContext: figmaDesignContext }, ctx);
    const gaps = await buildGapAnalysis.execute({ requirements: requirements.requirements, codeResults }, ctx);
    const effort = await estimateEffort.execute({ gaps: gaps.gaps, requirements: requirements.requirements }, ctx);
    const report = await formatPrerefReport.execute({ ticketKey: ticketData.key, requirements, design, gaps, effort }, ctx);
    return { ...report, summary: `[${repoResolution.resolvedProjectIds.join(", ")}] ${report.summary}` };
  },
);
