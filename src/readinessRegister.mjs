/**
 * Readiness Register — the shared kernel behind every CustomCard `*ReadinessData.mjs`.
 *
 * A readiness register is an evidence ledger: a list of readiness items, a
 * summary computed over them, and a validator that fails closed whenever an item
 * would overclaim live capability before real evidence is attached.
 *
 * Each domain (payment, observability, hosted-api, ...) owns what makes it
 * distinct — its item shape, its summary fields, and its rules. This module owns
 * the invariants *every* register shares: ids are unique, the required ids are
 * present, and the summary always carries `total` plus the validator's blockers.
 * Centralising that plumbing keeps the duplicate/missing/blocker wiring in one
 * place (locality) instead of being hand-copied into ten domains.
 *
 * @param {object} config
 * @param {string} config.domainLabel            Domain noun used in default messages, e.g. "observability".
 * @param {Array<object>} config.items           The register's default readiness items.
 * @param {string[]} [config.requiredIds]        Ids that must be present.
 * @param {(id: string) => string} [config.duplicateMessage]  Override the duplicate-id message.
 * @param {(id: string) => string} [config.missingMessage]    Override the missing-required-id message.
 * @param {(item: object, itemsById: Map<string, object>) => string[]} [config.itemRules]   Per-item domain rules (verbatim messages).
 * @param {(itemsById: Map<string, object>, items: Array<object>) => string[]} [config.crossRules]  Cross-item domain rules.
 * @param {(items: Array<object>) => object} [config.summarize]  Domain summary fields (merged under `total`/`blockers`).
 * @returns {{ items: Array<object>, validate: (items?: Array<object>) => string[], summarize: (items?: Array<object>) => object }}
 */
export function defineReadinessRegister(config) {
  const {
    domainLabel,
    items: defaultItems,
    requiredIds = [],
    duplicateMessage = (id) => `Duplicate ${domainLabel} readiness item: ${id}.`,
    missingMessage = (id) => `Missing ${domainLabel} readiness item: ${id}.`,
    itemRules = () => [],
    crossRules = () => [],
    summarize: summarizeExtra = () => ({})
  } = config ?? {};

  if (!domainLabel) throw new Error("defineReadinessRegister requires a domainLabel.");
  if (!Array.isArray(defaultItems)) throw new Error("defineReadinessRegister requires an items array.");

  function validate(items = defaultItems) {
    const issues = [];
    const itemsById = new Map();

    for (const item of items) {
      if (itemsById.has(item.id)) issues.push(duplicateMessage(item.id));
      itemsById.set(item.id, item);
      issues.push(...itemRules(item, itemsById));
    }

    for (const requiredId of requiredIds) {
      if (!itemsById.has(requiredId)) issues.push(missingMessage(requiredId));
    }

    issues.push(...crossRules(itemsById, items));
    return issues;
  }

  function summarize(items = defaultItems) {
    const registerIssues = validate(items);
    return {
      total: items.length,
      ...summarizeExtra(items),
      registerIssues,
      // Deprecated alias: domain registers historically exposed validation
      // output as `blockers`, which overstates what a repo-local validator can
      // know. Consumers should read `registerIssues`; domain summaries may
      // still derive real blockers from per-item `blocker` strings.
      blockers: registerIssues
    };
  }

  return { items: defaultItems, validate, summarize };
}

/**
 * Evidence artifact convention (docs/evidence/README.md): proof recorded by a
 * doctor run or external reviewer lives under docs/evidence/<domain>/ with a
 * date-stamped, slug-named file. Registers may only upgrade an item's status
 * when its evidenceArtifactRefs follow this convention; Node doctors
 * additionally verify the referenced files exist.
 */
export const evidenceArtifactRefPattern =
  /^docs\/evidence\/[a-z0-9][a-z0-9-]*\/\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9.-]*\.(?:json|md|txt|pdf|png|jpg)$/;

export function invalidEvidenceArtifactRefs(refs) {
  return (refs ?? []).filter((ref) => typeof ref !== "string" || !evidenceArtifactRefPattern.test(ref));
}
