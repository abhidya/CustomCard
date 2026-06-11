export type AdminReadinessClassName = "ready-local" | "credential-gated" | "contract-only" | "blocked";

export interface AdminReadinessMiniListItem {
  id: string;
  eyebrow: string;
  label: string;
  detail: string;
  className: AdminReadinessClassName;
}

export function AdminReadinessMiniList({
  items,
  listClassName = "adapterMiniList",
  rowClassName = "adapterMini"
}: {
  items: AdminReadinessMiniListItem[];
  listClassName?: string;
  rowClassName?: string;
}) {
  return (
    <div className={listClassName}>
      {items.map((item) => (
        <div className={`${rowClassName} ${item.className}`} key={item.id}>
          <span>{item.eyebrow}</span>
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

export function readinessStatusClass(
  status: string,
  options: { ready?: string[]; blocked?: string[]; contractOnly?: string[] } = {}
): AdminReadinessClassName {
  if ((options.ready ?? ["repo-local-ready"]).includes(status)) return "ready-local";
  if ((options.blocked ?? []).includes(status)) return "blocked";
  if ((options.contractOnly ?? []).includes(status)) return "contract-only";
  return "credential-gated";
}
