export const services = {
  "preref": {
    name: "Pre-refinement Analyzer",
    url: "https://promova-mcp-preref.workers.dev",
    description: "Analyzes Jira tickets: extracts requirements, checks code via Gandalf, processes Figma designs, estimates effort, posts Jira comment.",
    skills: ["jira_resolve_repositories", "jira_extract_requirements", "figma_extract_design_context", "analysis_build_gap_analysis", "analysis_estimate_effort", "formatting_format_preref_report"],
    agents: ["preref_analyzer"],
  },
};
