import { defineSkill } from "../../types";
import type { CodeGap } from "./build-gap-analysis";
import type { Requirement } from "../jira/extract-requirements";

export interface EffortEstimate { taskBreakdown: TaskItem[]; totalHours: { min: number; max: number }; risks: Risk[]; recommendation: string; }
export interface TaskItem { title: string; description: string; hours: { min: number; max: number }; type: "frontend" | "backend" | "infra" | "qa" | "design"; }
export interface Risk { title: string; description: string; severity: "low" | "medium" | "high"; mitigation: string; }

const HOURS: Record<CodeGap["complexity"], Record<CodeGap["action"], { min: number; max: number }>> = {
  low:    { create: { min: 1, max: 3 },  modify: { min: 0.5, max: 2 }, reuse: { min: 0.5, max: 1 },  investigate: { min: 1, max: 2 } },
  medium: { create: { min: 3, max: 8 },  modify: { min: 2, max: 5 },   reuse: { min: 1, max: 2 },    investigate: { min: 2, max: 4 } },
  high:   { create: { min: 8, max: 20 }, modify: { min: 5, max: 12 },  reuse: { min: 2, max: 4 },    investigate: { min: 3, max: 6 } },
};

function taskType(req: Requirement): TaskItem["type"] {
  if (req.type === "ui") return "frontend";
  if (["api", "data", "integration"].includes(req.type)) return "backend";
  if (req.type === "non-functional") return "infra";
  return "frontend";
}

function buildRisks(gaps: CodeGap[], requirements: Requirement[]): Risk[] {
  const risks: Risk[] = [];
  const highC = gaps.filter((g) => g.complexity === "high");
  if (highC.length > 0) risks.push({ title: "High-complexity tasks present", description: `${highC.length} task(s): ${highC.map((g) => g.requirementTitle.slice(0, 40)).join("; ")}`, severity: "high", mitigation: "Break down into sub-tasks. Consider spikes." });
  const intReqs = requirements.filter((r) => r.type === "integration");
  if (intReqs.length > 0) risks.push({ title: "External integration dependencies", description: `${intReqs.length} integration(s). External APIs may have rate limits or unstable contracts.`, severity: "medium", mitigation: "Clarify API contracts upfront. Build with adapters." });
  const unknowns = gaps.filter((g) => g.action === "investigate");
  if (unknowns.length > 0) risks.push({ title: "Unclear scope", description: `${unknowns.length} requirement(s) need investigation.`, severity: "medium", mitigation: "Spike ticket recommended." });
  return risks;
}

export const estimateEffort = defineSkill<{ gaps: CodeGap[]; requirements: Requirement[] }, EffortEstimate>(
  { name: "analysis_estimate_effort", description: "Calculate effort hours and identify risks from gap analysis results", service: "analysis", gather: [] },
  async ({ gaps, requirements }) => {
    const reqMap = new Map(requirements.map((r) => [r.id, r]));
    const taskBreakdown: TaskItem[] = gaps.map((gap) => {
      const req = reqMap.get(gap.requirementId);
      return { title: gap.requirementTitle, description: gap.description, hours: HOURS[gap.complexity][gap.action], type: req ? taskType(req) : "frontend" };
    });
    const devMin = taskBreakdown.reduce((s, t) => s + t.hours.min, 0);
    const devMax = taskBreakdown.reduce((s, t) => s + t.hours.max, 0);
    const qaHours = { min: Math.round(devMin * 0.2), max: Math.round(devMax * 0.2) };
    if (qaHours.min > 0) taskBreakdown.push({ title: "Testing & QA", description: "Unit tests, integration tests, manual QA", hours: qaHours, type: "qa" });
    const totalMin = devMin + qaHours.min;
    const totalMax = devMax + qaHours.max;
    const risks = buildRisks(gaps, requirements);
    const days = (h: number) => (h / 8).toFixed(1);
    const recommendation = risks.some((r) => r.severity === "high")
      ? `Suggest breaking into 2+ sub-tasks. Estimated ${totalMin}–${totalMax}h (${days(totalMin)}–${days(totalMax)} dev days). Review before sprint.`
      : `Ready for sprint. Estimated ${totalMin}–${totalMax}h (${days(totalMin)}–${days(totalMax)} dev days).`;
    return { taskBreakdown, totalHours: { min: totalMin, max: totalMax }, risks, recommendation };
  },
);
