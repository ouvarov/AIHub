/**
 * Agent — an orchestrator that combines skills into a workflow.
 *
 * Rules:
 * - Imports and calls skills, never calls APIs directly
 * - Does not know about MCP — just solves a business problem
 * - Receives SkillContext so it can pass env to skills
 */

import type { SkillContext } from "./skill";

export interface AgentMeta {
  name: string;
  description: string;
  /** Which skills this agent depends on */
  skills: string[];
}

export type Agent<TInput, TOutput> = {
  meta: AgentMeta;
  execute: (input: TInput, ctx: SkillContext) => Promise<TOutput>;
};

/** Helper to define an agent with proper typing */
export function defineAgent<TInput, TOutput>(
  meta: AgentMeta,
  execute: (input: TInput, ctx: SkillContext) => Promise<TOutput>,
): Agent<TInput, TOutput> {
  return { meta, execute };
}