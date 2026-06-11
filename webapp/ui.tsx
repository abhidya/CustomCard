import { useMemo, useState, type ReactNode } from "react";
import { buildPanelSvg } from "../src/renderPacket";
import type { CardPanel } from "../src/customerWorkflow";

/** Render a real print panel as an image (same SVG the export produces). */
export function PanelArt({ panel, className }: { panel: CardPanel; className?: string }) {
  const src = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(buildPanelSvg(panel))}`,
    [panel]
  );
  return <img alt={`${panel.label} preview`} className={className} src={src} />;
}

export function Chips<T extends string>({
  options,
  value,
  onValue,
  format
}: {
  options: readonly T[];
  value: T;
  onValue: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div className="chips">
      {options.map((option) => (
        <button
          className="chip"
          data-on={option === value}
          key={option}
          onClick={() => onValue(option)}
          type="button"
        >
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Step({
  number,
  title,
  meta,
  defaultOpen = false,
  children
}: {
  number: number;
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="step" data-open={open}>
      <button className="step-head" onClick={() => setOpen((current) => !current)} type="button">
        <span className="step-num">{number}</span>
        <span className="step-title">{title}</span>
        {meta && !open ? <span className="step-meta">{meta}</span> : null}
      </button>
      {open ? <div className="step-body">{children}</div> : null}
    </section>
  );
}

export function Toast({ message }: { message: string }) {
  return <div className="toast">{message}</div>;
}
