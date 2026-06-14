import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buildPanelSvg } from "../src/renderPacket";
import type { CardPanel } from "../src/customerWorkflow";
import { createFlowStepIndex, createFlowSteps } from "./routePolicy";
import type { ViewId } from "../src/appStateOrchestrator";

/** Labeled wayfinding for the create flow; earlier steps are clickable back-paths. */
export function CreateFlowStepper({ currentView, onNavigate }: { currentView: ViewId; onNavigate: (view: ViewId) => void }) {
  const currentIndex = createFlowStepIndex(currentView);

  return (
    <nav aria-label="Card creation steps" className="flowstepper reveal">
      <ol>
        {createFlowSteps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li aria-current={isCurrent ? "step" : undefined} data-done={isDone} data-now={isCurrent} key={step.view}>
              {isDone ? (
                <button onClick={() => onNavigate(step.view)} type="button">
                  <span className="flowstepper-num" aria-hidden="true">{index + 1}</span>
                  {step.label}
                </button>
              ) : (
                <span>
                  <span className="flowstepper-num" aria-hidden="true">{index + 1}</span>
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Render a real print panel as an image (same SVG the export produces). */
export function PanelArt({ panel, className }: { panel: CardPanel; className?: string }) {
  const svg = useMemo(() => buildPanelSvg(panel), [panel]);
  const inlineSrc = useMemo(() => svgDataUri(svg), [svg]);
  const placeholderSrc = useMemo(() => panelPlaceholderDataUri(panel), [panel]);
  const [objectSrc, setObjectSrc] = useState<string | undefined>();
  const [fallbackSrc, setFallbackSrc] = useState<string | undefined>();

  useEffect(() => {
    setFallbackSrc(undefined);
    if (!panel.imageUrl || !canCreateSvgObjectUrl()) {
      setObjectSrc(undefined);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    setObjectSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [panel.imageUrl, svg]);

  const src = fallbackSrc ?? objectSrc ?? (panel.imageUrl ? placeholderSrc : inlineSrc);

  return (
    <img
      alt={`${panel.label} preview`}
      className={className}
      decoding="async"
      onError={() => {
        if (panel.imageUrl && fallbackSrc !== panel.imageUrl) setFallbackSrc(panel.imageUrl);
      }}
      src={src}
    />
  );
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function panelPlaceholderDataUri(panel: CardPanel): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${panel.width}" height="${panel.height}" viewBox="0 0 ${panel.width} ${panel.height}"><rect width="100%" height="100%" fill="#f7f8fa"/></svg>`;
  return svgDataUri(svg);
}

function canCreateSvgObjectUrl(): boolean {
  return typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
}

export function Chips<T extends string>({
  options,
  value,
  onValue,
  format
}: {
  options: readonly T[];
  value: string;
  onValue: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <div className="chips">
      {options.map((option) => (
        <button
          aria-pressed={option === value}
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
      <button aria-expanded={open} className="step-head" onClick={() => setOpen((current) => !current)} type="button">
        <span className="step-num">{number}</span>
        <span className="step-title">{title}</span>
        {meta && !open ? <span className="step-meta">{meta}</span> : null}
      </button>
      {open ? <div className="step-body">{children}</div> : null}
    </section>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="toast" role="status">
      {message}
    </div>
  );
}

type FoldedPreviewMode = "closed" | "open" | "back";

/**
 * CSS-3D folded card preview. Confidence layer only — the 2D proof stays the
 * print source of truth, and the label below says so.
 */
export function FoldedCardPreview({ panels }: { panels: CardPanel[] }) {
  const [mode, setMode] = useState<FoldedPreviewMode>("closed");
  const byId = new Map(panels.map((panel) => [panel.id, panel]));
  const front = byId.get("front") ?? panels[0];
  const insideLeft = byId.get("inside-left") ?? panels[1];
  const insideRight = byId.get("inside-right") ?? panels[2];
  const back = byId.get("back") ?? panels[3];

  return (
    <div className="folded3d" aria-label="Folded card preview">
      <div className="folded3d-stagewrap">
        <div className="folded3d-stage" data-mode={mode}>
          {mode === "open" ? (
            <div className="folded3d-spread">
              <div className="folded3d-panel folded3d-left">
                <PanelArt panel={insideLeft} />
              </div>
              <div className="folded3d-panel folded3d-right">
                <PanelArt panel={insideRight} />
              </div>
            </div>
          ) : (
            <div className="folded3d-panel folded3d-cover">
              <PanelArt panel={mode === "back" ? back : front} />
            </div>
          )}
        </div>
      </div>
      <div className="folded3d-modes" role="group" aria-label="Folded preview angle">
        {(["closed", "open", "back"] as const).map((candidate) => (
          <button
            aria-pressed={candidate === mode}
            className="folded3d-mode"
            data-on={candidate === mode}
            key={candidate}
            onClick={() => setMode(candidate)}
            type="button"
          >
            {candidate === "closed" ? "Front" : candidate === "open" ? "Open" : "Back"}
          </button>
        ))}
      </div>
      <p className="folded3d-note">Folded preview. Use the proof view for exact print review.</p>
    </div>
  );
}
