import { defineSkill } from "../../types";

export interface FigmaContextInput {
  figmaLinks: string[];
  designContext?: string;
}

export interface FigmaDesignContext {
  hasDesign: boolean;
  links: string[];
  summary: string;
  components: string[];
  notes: string;
}

function extractComponentNames(text: string): string[] {
  const patterns = [/Component\s*[:\-]\s*([^\n,]+)/gi, /<([A-Z][A-Za-z]+)/g];
  const found = new Set<string>();
  patterns.forEach((re) => { let m: RegExpExecArray | null; while ((m = re.exec(text)) !== null) found.add(m[1].trim()); });
  return [...found].slice(0, 10);
}

export const extractDesignContext = defineSkill<FigmaContextInput, FigmaDesignContext>(
  {
    name: "figma_extract_design_context",
    description: "Process Figma links and design context into structured notes for analysis",
    service: "figma",
    gather: ["Figma design context — use Figma MCP get_design_context for each link found in the ticket"],
  },
  async ({ figmaLinks, designContext }) => {
    if (!figmaLinks.length && !designContext) {
      return { hasDesign: false, links: [], summary: "No Figma design provided", components: [], notes: "" };
    }
    const contextText = designContext ?? "";
    const components = extractComponentNames(contextText);
    const summary = contextText
      ? `Design provided (${figmaLinks.length} link${figmaLinks.length !== 1 ? "s" : ""}). ${components.length ? `Components: ${components.join(", ")}.` : ""}`
      : `${figmaLinks.length} Figma link${figmaLinks.length !== 1 ? "s" : ""} found but not fetched.`;
    return { hasDesign: true, links: figmaLinks, summary, components, notes: contextText.slice(0, 1000) };
  },
);
