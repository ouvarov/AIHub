// ─── SkillContext ──────────────────────────────────────────────────────────────

export interface SkillContext {
  env: Record<string, string>;
}

// ─── Skill ────────────────────────────────────────────────────────────────────

export interface SkillMeta {
  name: string;
  description: string;
  service: string;
  gather?: string[];
}

export interface Skill<TInput, TOutput> {
  meta: SkillMeta;
  execute: (input: TInput, ctx?: SkillContext) => Promise<TOutput>;
}

export function defineSkill<TInput, TOutput>(
  meta: SkillMeta,
  fn: (input: TInput, ctx: SkillContext) => Promise<TOutput>,
): Skill<TInput, TOutput> {
  return {
    meta,
    execute: (input, ctx = { env: {} }) => fn(input, ctx),
  };
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export interface AgentMeta {
  name: string;
  description: string;
  skills: string[];
}

export interface Agent<TInput, TOutput> {
  meta: AgentMeta;
  execute: (input: TInput, ctx?: SkillContext) => Promise<TOutput>;
}

export function defineAgent<TInput, TOutput>(
  meta: AgentMeta,
  fn: (input: TInput, ctx: SkillContext) => Promise<TOutput>,
): Agent<TInput, TOutput> {
  return {
    meta,
    execute: (input, ctx = { env: {} }) => fn(input, ctx),
  };
}
