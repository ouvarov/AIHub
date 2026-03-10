import { resolveRepositories } from "../../_shared/skills/jira/resolve-repositories";
import { extractRequirements } from "../../_shared/skills/jira/extract-requirements";
import { extractDesignContext } from "../../_shared/skills/figma/extract-design-context";
import { buildGapAnalysis } from "../../_shared/skills/analysis/build-gap-analysis";
import { estimateEffort } from "../../_shared/skills/analysis/estimate-effort";
import { formatPrerefReport } from "../../_shared/skills/formatting/format-preref-report";

export const skills = [resolveRepositories, extractRequirements, extractDesignContext, buildGapAnalysis, estimateEffort, formatPrerefReport];
