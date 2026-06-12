export interface ReadinessRegisterConfig<TItem extends { id: string }> {
  domainLabel: string;
  items: TItem[];
  requiredIds?: string[];
  duplicateMessage?: (id: string) => string;
  missingMessage?: (id: string) => string;
  itemRules?: (item: TItem, itemsById: Map<string, TItem>) => string[];
  crossRules?: (itemsById: Map<string, TItem>, items: TItem[]) => string[];
  summarize?: (items: TItem[]) => Record<string, unknown>;
}

export interface ReadinessRegister<TItem extends { id: string }> {
  items: TItem[];
  validate: (items?: TItem[]) => string[];
  summarize: (
    items?: TItem[]
  ) => Record<string, unknown> & { total: number; registerIssues: string[]; blockers: string[] };
}

export function defineReadinessRegister<TItem extends { id: string }>(
  config: ReadinessRegisterConfig<TItem>
): ReadinessRegister<TItem>;

export const evidenceArtifactRefPattern: RegExp;
export function invalidEvidenceArtifactRefs(refs: string[] | undefined): string[];
