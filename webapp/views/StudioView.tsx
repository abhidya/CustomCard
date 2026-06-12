import { SignInButton } from "@clerk/react";
import { CalendarDays, HeartHandshake, RefreshCw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type {
  CardDraft,
  CardDraftInput,
  CardPanel,
  MemoryItem,
  Tone,
  TonePreset,
  VisualStyle,
  VisualStylePreset
} from "../../src/freeMvp";
import type { AiPanelGenerationProgress, AiPanelGenerationStatus } from "../../src/appStateOrchestrator";
import type { CalendarMomentDraftContext } from "../calendarMomentDraft";
import {
  hasPanelOverride,
  panelTransformLabels,
  transformPanelBody,
  type PanelOverride,
  type PanelOverrides,
  type PanelTransformId
} from "../../src/panelEdits";
import { displayDraftValue } from "../draftProgress";
import { Chips, Field, FoldedCardPreview, PanelArt, Step } from "../ui";

const allTones: TonePreset[] = ["warm", "funny", "elegant", "simple", "reverent", "sentimental"];
const styles: VisualStylePreset[] = ["botanical", "bold-type", "photo-note", "minimal"];
const aiButtonLogoSrc = "/customcard-ai-button-logo.png";

const toneLabels: Record<TonePreset, string> = {
  warm: "Warm",
  funny: "Funny",
  elegant: "Elegant",
  simple: "Simple",
  reverent: "Reverent",
  sentimental: "Sentimental"
};

const styleLabels: Record<VisualStylePreset, string> = {
  botanical: "Botanical",
  "bold-type": "Bold type",
  "photo-note": "Photo note",
  minimal: "Minimal"
};

/** High-care occasions hide humor and add a review-everything banner. */
export function isSensitiveOccasion(occasion: string): boolean {
  return /sympath|grief|loss|condol|illness|sick|get well|apolog|memorial|funeral|miscarriage|divorce/i.test(occasion);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanizeChoice(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map(titleCase)
    .join(" ");
}

function toneLabel(value: Tone): string {
  return toneLabels[value as TonePreset] ?? humanizeChoice(value);
}

function styleLabel(value: VisualStyle): string {
  return styleLabels[value as VisualStylePreset] ?? humanizeChoice(value);
}

function toneImpliesHumor(value: string): boolean {
  return /\b(funny|playful|witty|humou?r)\b/i.test(value);
}

function panelArtworkLabel(panel: CardPanel, stale: boolean, status: AiPanelGenerationStatus | undefined): string {
  if (stale) return "Needs review";
  if (status === "queued") return "Queued";
  if (status === "copy-ready") return "Copy ready";
  if (status === "artwork-loading") return "Loading art";
  if (status === "artwork-ready") return "Artwork ready";
  if (status === "artwork-missing") return panel.imageUrl ? "Artwork ready" : "Copy ready";
  if (panel.imageUrl) return "Artwork ready";
  return "Template";
}

type GenerationStageState = "done" | "active" | "pending";

function generationStages({
  aiLoading,
  aiActive,
  panelProgress,
  printFitPassed,
  readyArtworkCount,
  totalPanels
}: {
  aiLoading: boolean;
  aiActive: boolean;
  panelProgress: AiPanelGenerationProgress;
  printFitPassed: boolean;
  readyArtworkCount: number;
  totalPanels: number;
}): Array<{ label: string; state: GenerationStageState }> {
  const statuses = Object.values(panelProgress);
  const copyReady = statuses.some((status) => status !== "queued");
  const artworkExpected = statuses.some((status) => status === "artwork-loading" || status === "artwork-ready");
  const artworkDone = artworkExpected ? readyArtworkCount === totalPanels && totalPanels > 0 : aiActive;
  const artworkLabel = artworkExpected ? `Loading artwork (${readyArtworkCount}/${totalPanels})` : "Applying panel copy";

  if (aiLoading) {
    return [
      { label: "Writing editable copy", state: copyReady ? "done" : "active" },
      { label: artworkLabel, state: copyReady ? (artworkDone ? "done" : "active") : "pending" },
      { label: "Checking print fit", state: artworkDone ? "active" : "pending" },
      { label: "Ready for review", state: "pending" }
    ];
  }
  if (aiActive) {
    return [
      { label: "Writing editable copy", state: "done" },
      { label: artworkLabel, state: artworkDone ? "done" : "active" },
      { label: "Checking print fit", state: printFitPassed ? "done" : "active" },
      { label: "Ready for review", state: printFitPassed ? "done" : "pending" }
    ];
  }
  return [];
}

export function StudioView({
  draft,
  draftInput,
  memories,
  aiAvailable,
  aiLoading,
  aiActive,
  aiStale,
  aiStatus,
  aiPanelProgress,
  aiRequiresSignIn,
  panelOverrides = {},
  printFitPassed,
  sourceMoment,
  onAddNote,
  onField,
  onGenerateAi,
  onKeepArtwork,
  onPanelEdit = () => undefined,
  onPanelRevert = () => undefined
}: {
  draft: CardDraft;
  draftInput: CardDraftInput;
  memories: MemoryItem[];
  aiAvailable: boolean;
  aiLoading: boolean;
  aiActive: boolean;
  aiStale: boolean;
  aiStatus?: string;
  aiPanelProgress: AiPanelGenerationProgress;
  aiRequiresSignIn: boolean;
  panelOverrides: PanelOverrides;
  printFitPassed: boolean;
  sourceMoment?: CalendarMomentDraftContext;
  onAddNote: () => void;
  onField: <K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) => void;
  onGenerateAi: (panelId?: CardPanel["id"]) => void;
  onKeepArtwork: () => void;
  onPanelEdit: (panelId: CardPanel["id"], patch: PanelOverride) => void;
  onPanelRevert: (panelId: CardPanel["id"]) => void;
}) {
  const [activePanel, setActivePanel] = useState<CardPanel["id"]>("front");
  const [previewMode, setPreviewMode] = useState<"proof" | "folded">("proof");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panel = draft.panels.find((candidate) => candidate.id === activePanel) ?? draft.panels[0];
  const approvedForRecipient = memories.filter((memory) => memory.approved).length;
  const artworkCount = draft.panels.filter((candidate) => candidate.imageUrl).length;
  const totalPanels = draft.panels.length;
  const activePanelStatus = aiPanelProgress[panel.id];
  const sensitive = isSensitiveOccasion(draftInput.occasion);
  const tones = sensitive ? allTones.filter((tone) => tone !== "funny") : allTones;

  // High-care occasions never keep a humorous tone selected.
  useEffect(() => {
    if (sensitive && toneImpliesHumor(draftInput.tone)) onField("tone", "simple");
  }, [draftInput.tone, onField, sensitive]);
  const aiState = aiLoading ? "loading" : aiActive ? "ready" : "idle";
  const stages = generationStages({
    aiLoading,
    aiActive,
    panelProgress: aiPanelProgress,
    printFitPassed,
    readyArtworkCount: artworkCount,
    totalPanels
  });
  const aiPanelSummary = aiActive
    ? `${artworkCount}/${totalPanels} artwork panels ready`
    : `${totalPanels} print panels`;
  const stagePanelSummary = aiLoading
    ? artworkCount > 0
      ? `${artworkCount}/${totalPanels} panels ready`
      : "Ready panels will appear here"
    : aiPanelSummary;
  // AI drafting needs the minimum relationship context to write something personal.
  const contextChecklist = [
    { label: "Recipient", done: displayDraftValue(draftInput.recipient).trim() !== "" },
    { label: "Occasion", done: displayDraftValue(draftInput.occasion).trim() !== "" },
    {
      label: "Relationship or one personal detail",
      done: draftInput.relationship.trim() !== "" || displayDraftValue(draftInput.personalNote).trim() !== ""
    }
  ];
  const minContextReady = contextChecklist.every((item) => item.done);
  const aiNote = aiRequiresSignIn
    ? "AI drafting needs sign-in so your draft can be generated and saved. You can still make, edit, preview, and save a print package without AI."
    : aiStatus
      ? aiStatus
      : aiActive
        ? "Review the copy, artwork, and print fit before continuing."
        : minContextReady
          ? "We’ll write editable copy first, then load artwork panel by panel."
          : "Add who it’s for, the occasion, and one real detail so the draft isn’t generic.";
  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = draft.panels.length - 1;
    const nextIndexByKey: Partial<Record<string, number>> = {
      ArrowRight: index === lastIndex ? 0 : index + 1,
      ArrowDown: index === lastIndex ? 0 : index + 1,
      ArrowLeft: index === 0 ? lastIndex : index - 1,
      ArrowUp: index === 0 ? lastIndex : index - 1,
      Home: 0,
      End: lastIndex
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex === undefined) return;
    const nextPanel = draft.panels[nextIndex];
    if (!nextPanel) return;
    event.preventDefault();
    setActivePanel(nextPanel.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your card, their story</h1>
        <p>Everything updates live — what you see here is exactly what prints.</p>
      </header>

      {sourceMoment ? (
        <div className="sourceMomentBanner reveal" role="note">
          <CalendarDays size={17} aria-hidden="true" />
          <div>
            <strong>Drafting from {sourceMoment.title}</strong>
            <span>
              {sourceMoment.dateLabel} · {sourceMoment.sourceLabel} · {sourceMoment.confidenceLabel}
            </span>
          </div>
        </div>
      ) : null}

      {sensitive ? (
        <div className="sensitivebanner reveal" role="note">
          <HeartHandshake size={17} />
          This is a sensitive card. We&rsquo;ll keep the message simple and ask you to review every detail before
          printing.
        </div>
      ) : null}

      <div className="studio">
        <div className="stage reveal reveal-1">
          <div className="previewmodes" role="group" aria-label="Preview mode">
            <button className="previewmode" data-on={previewMode === "proof"} onClick={() => setPreviewMode("proof")} type="button">
              Proof view
            </button>
            <button className="previewmode" data-on={previewMode === "folded"} onClick={() => setPreviewMode("folded")} type="button">
              Folded preview
            </button>
          </div>

          {previewMode === "folded" ? (
            <FoldedCardPreview panels={draft.panels} />
          ) : (
            <>
              <div className="stage-frame" data-panel-status={activePanelStatus ?? "idle"}>
                <PanelArt className="stage-card" panel={panel} />
                <span className="stage-panel-badge">{panelArtworkLabel(panel, aiStale, activePanelStatus)}</span>
              </div>
              <div className="stage-ai-state" data-state={aiState}>
                <span>{aiLoading ? "Building AI card" : aiActive ? "Ready to review" : "AI card generator"}</span>
                <strong>{stagePanelSummary}</strong>
              </div>
              <div aria-label="Card panels" className="pagetabs" role="tablist">
                {draft.panels.map((candidate, index) => {
                  const candidateStatus = aiPanelProgress[candidate.id];
                  return (
                    <button
                      aria-controls="panel-editor"
                      aria-selected={candidate.id === activePanel}
                      className="pagetab"
                      data-on={candidate.id === activePanel}
                      data-status={candidateStatus ?? "idle"}
                      id={`panel-tab-${candidate.id}`}
                      key={candidate.id}
                      onClick={() => setActivePanel(candidate.id)}
                      onKeyDown={(event) => handleTabKeys(event, index)}
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      role="tab"
                      tabIndex={candidate.id === activePanel ? 0 : -1}
                      type="button"
                    >
                      <PanelArt panel={candidate} />
                      <span>{candidate.label}</span>
                      <small data-warn={candidate.overflowRisk || undefined}>
                        {candidate.overflowRisk ? "Too much text" : panelArtworkLabel(candidate, aiStale, candidateStatus)}
                      </small>
                    </button>
                  );
                })}
              </div>
              <PanelEditor
                aiActive={aiActive}
                aiLoading={aiLoading}
                edited={hasPanelOverride(panelOverrides, panel.id)}
                onPanelEdit={onPanelEdit}
                onPanelGenerate={onGenerateAi}
                onPanelRevert={onPanelRevert}
                panel={panel}
                panelStatus={activePanelStatus}
                sensitive={sensitive}
              />
            </>
          )}
          <div className="stage-caption">
            <span>5 × 7 in folded card</span>
            <span>Print-ready at 300 DPI</span>
          </div>
        </div>

        <div className="steps reveal reveal-2">
          {aiStale && !aiLoading ? (
            <section className="stalebanner" aria-label="Artwork out of date">
              <strong>You changed the message after AI artwork was generated.</strong>
              <div className="stalebanner-actions">
                <button className="btn btn-ghost btn-sm" onClick={onKeepArtwork} type="button">
                  Keep current artwork
                </button>
                <button className="btn btn-ink btn-sm" onClick={() => onGenerateAi()} type="button">
                  <RefreshCw size={14} />
                  Regenerate affected panels
                </button>
              </div>
            </section>
          ) : null}

          {aiRequiresSignIn ? (
            <section className="aiLaunch accountgate" data-state={aiState} aria-label="Account needed for AI generation">
              <div className="aiLaunchText">
                <strong>Create a free account to generate your card</strong>
                <span>
                  AI drafting needs sign-in so your draft can be generated and saved. You can still make, edit,
                  preview, and save a print package without AI. Your draft stays right here while you sign in.
                </span>
                <small className="accountgate-privacy">
                  Signing in does not connect your email or calendar. You choose that separately.
                </small>
              </div>
              <SignInButton mode="modal">
                <button aria-label="Sign in to generate AI card" className="aibutton" type="button">
                  <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
                  Sign in
                </button>
              </SignInButton>
            </section>
          ) : aiAvailable ? (
            <section className="aiLaunch" data-state={aiState} aria-label="AI card drafting">
              <div className="aiLaunchText">
                <strong>{aiLoading ? "Building your AI card" : aiActive ? "Ready to review" : "Draft your card with AI"}</strong>
                <span aria-live="polite">{aiNote}</span>
                {!aiActive && !aiLoading ? (
                  <ul aria-label="Details that shape the draft" className="aiContextChecklist">
                    {contextChecklist.map((item) => (
                      <li data-done={item.done} key={item.label}>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <button
                className="aibutton"
                disabled={aiLoading || !minContextReady}
                onClick={() => onGenerateAi()}
                type="button"
              >
                <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
                {aiLoading
                  ? "Drafting card..."
                  : !minContextReady
                    ? "Add one detail to draft a better card"
                    : aiActive
                      ? "Improve whole card"
                      : "Draft my card"}
              </button>
            </section>
          ) : null}

          {stages.length > 0 ? (
            <ol className="genstages" aria-label="Generation progress">
              {stages.map((stage) => (
                <li className="genstage" data-state={stage.state} key={stage.label}>
                  {stage.label}
                </li>
              ))}
            </ol>
          ) : null}

          <Step
            defaultOpen
            meta={displayDraftValue(draftInput.recipient) ? `To ${draftInput.recipient}` : "Add names"}
            number={1}
            title="Who it's for"
          >
            <div className="fieldrow">
              <Field label="To">
                <input
                  onChange={(event) => onField("recipient", event.target.value)}
                  placeholder="Their name"
                  value={displayDraftValue(draftInput.recipient)}
                />
              </Field>
              <Field label="From">
                <input
                  onChange={(event) => onField("sender", event.target.value)}
                  placeholder="Your name"
                  value={displayDraftValue(draftInput.sender)}
                />
              </Field>
            </div>
            <div className="fieldrow">
              <Field label="Your relationship">
                <input
                  onChange={(event) => onField("relationship", event.target.value)}
                  placeholder="Friends, siblings, coworkers…"
                  value={draftInput.relationship}
                />
              </Field>
              <Field label="Occasion">
                <input
                  onChange={(event) => onField("occasion", event.target.value)}
                  placeholder="Birthday, anniversary…"
                  value={displayDraftValue(draftInput.occasion)}
                />
              </Field>
            </div>
          </Step>

          <Step
            defaultOpen
            meta={`${toneLabel(draftInput.tone)} · ${styleLabel(draftInput.style)}`}
            number={2}
            title="The look and feel"
          >
            <Field label="Tone">
              <Chips
                format={(value) => toneLabels[value]}
                onValue={(value) => onField("tone", value)}
                options={tones}
                value={draftInput.tone}
              />
              <input
                aria-label="Custom tone"
                className="choiceinput"
                onChange={(event) => onField("tone", event.target.value)}
                placeholder="Type a tone, e.g. sincere and a little witty"
                value={draftInput.tone}
              />
            </Field>
            <Field label="Style">
              <Chips
                format={(value) => styleLabels[value]}
                onValue={(value) => onField("style", value)}
                options={styles}
                value={draftInput.style}
              />
              <input
                aria-label="Custom style"
                className="choiceinput"
                onChange={(event) => onField("style", event.target.value)}
                placeholder="Type a style, e.g. ink wash with gold accents"
                value={draftInput.style}
              />
            </Field>
          </Step>

          <Step
            defaultOpen={aiRequiresSignIn || Boolean(displayDraftValue(draftInput.personalNote))}
            meta={displayDraftValue(draftInput.personalNote) ? "Note added" : "Optional"}
            number={3}
            title="Make it personal"
          >
            <Field label="A shared memory, an inside joke, or what you appreciate about them">
              <textarea
                onChange={(event) => onField("personalNote", event.target.value)}
                placeholder="The road trip playlist, the Sunday pancakes, that one inside joke…"
                value={displayDraftValue(draftInput.personalNote)}
              />
            </Field>
            <div className="switchrow">
              <div>
                <strong>Use your saved notes</strong>
                <small>
                  {approvedForRecipient > 0
                    ? `${approvedForRecipient} saved ${approvedForRecipient === 1 ? "note" : "notes"} can shape the message`
                    : "Save notes about people to personalise future cards"}
                </small>
              </div>
              <button
                aria-label="Use saved notes"
                className="switch"
                data-on={draftInput.useMemory}
                onClick={() => onField("useMemory", !draftInput.useMemory)}
                type="button"
              />
            </div>
            <button className="textlink textlink-inline" onClick={onAddNote} type="button">
              Add or edit saved notes
            </button>
          </Step>
        </div>
      </div>
    </>
  );
}

function PanelEditor({
  panel,
  panelStatus,
  aiActive,
  aiLoading,
  edited,
  sensitive,
  onPanelEdit,
  onPanelGenerate,
  onPanelRevert
}: {
  panel: CardPanel;
  panelStatus: AiPanelGenerationStatus | undefined;
  aiActive: boolean;
  aiLoading: boolean;
  edited: boolean;
  sensitive: boolean;
  onPanelEdit: (panelId: CardPanel["id"], patch: PanelOverride) => void;
  onPanelGenerate: (panelId: CardPanel["id"]) => void;
  onPanelRevert: (panelId: CardPanel["id"]) => void;
}) {
  const transforms: PanelTransformId[] = sensitive
    ? ["shorten", "warmer", "simpler", "less-generic"]
    : ["improve", "shorten", "warmer", "simpler", "less-generic"];
  const status = panelStatus ?? (aiActive ? "copy-ready" : "idle");

  return (
    <section
      aria-labelledby="panel-editor-heading"
      className="paneleditor"
      id="panel-editor"
      role="tabpanel"
    >
      <div className="paneleditor-head">
        <div>
          <h2 id="panel-editor-heading">Editing: {panel.label}</h2>
          <span data-status={status}>{panelArtworkLabel(panel, false, panelStatus)}</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          disabled={!edited}
          onClick={() => onPanelRevert(panel.id)}
          type="button"
        >
          <Undo2 size={14} />
          Revert panel
        </button>
      </div>
      <p className="paneleditor-note">These are the exact words that print on this panel.</p>
      <label className="paneltext-field">
        <span>Headline</span>
        <input value={panel.headline} onChange={(event) => onPanelEdit(panel.id, { headline: event.target.value })} />
      </label>
      <label className="paneltext-field">
        <span>Body</span>
        <textarea value={panel.body} onChange={(event) => onPanelEdit(panel.id, { body: event.target.value })} />
      </label>
      {panel.overflowRisk ? (
        <p className="paneleditor-warn" role="alert">
          Too much text for this panel — use “Shorten to fit” or trim the body so nothing gets cut off in print.
        </p>
      ) : null}
      <div className="paneltools" aria-label="Panel text tools">
        {transforms.map((transform) => (
          <button
            className="btn btn-ghost btn-sm"
            key={transform}
            onClick={() => onPanelEdit(panel.id, { body: transformPanelBody(transform, panel.body) })}
            type="button"
          >
            {panelTransformLabels[transform]}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          disabled={aiLoading}
          onClick={() => onPanelGenerate(panel.id)}
          title="Regenerate only the selected panel."
          type="button"
        >
          <RefreshCw size={14} />
          {aiLoading ? "Generating panel..." : "Regenerate this panel"}
        </button>
      </div>
      <small className="paneleditor-aiNote">
        Panel generation updates only the selected panel. The other panels stay unchanged.
      </small>
      {aiActive && panelStatus === "artwork-missing" && !panel.imageUrl ? (
        <p className="paneleditor-warn" role="status">
          We couldn’t load artwork for this panel. The copy is safe; template artwork will print.
        </p>
      ) : null}
      <details className="paneleditor-advanced">
        <summary>Advanced: art direction</summary>
        <label className="paneltext-field">
          <span>Art direction (design notes — never printed on the card)</span>
          <input
            value={panel.artDirection}
            onChange={(event) => onPanelEdit(panel.id, { artDirection: event.target.value })}
          />
        </label>
      </details>
    </section>
  );
}
