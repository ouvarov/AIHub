/**
 * Skill — an atomic action. One function, one responsibility.
 *
 * Rules:
 * - Pure input → output, no side knowledge of MCP or agents
 * - All external dependencies (tokens, base URLs) passed via `ctx`
 * - Always async, always returns typed output
 * - Handles its own HTTP errors
 */

export interface SkillContext {
  /** API tokens, base URLs, and other config injected from Worker env */
  env: Record<string, string>;
}

export interface SkillMeta {
  name: string;
  description: string;
  /** Knowledge domain: jira, figma, analysis, formatting */
  service: string;
  /** What Claude should fetch from other MCPs before calling this skill */
  gather?: string[];
}

export type Skill<TInput, TOutput> = {
  meta: SkillMeta;
  execute: (input: TInput, ctx: SkillContext) => Promise<TOutput>;
};

/** Helper to define a skill with proper typing */
export function defineSkill<TInput, TOutput>(
  meta: SkillMeta,
  execute: (input: TInput, ctx: SkillContext) => Promise<TOutput>,
): Skill<TInput, TOutput> {
  return { meta, execute };
}