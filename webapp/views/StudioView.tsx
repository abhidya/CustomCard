import { SignInButton } from "@clerk/react";
import { HeartHandshake, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CardDraft,
  CardDraftInput,
  CardPanel,
  LanguageChoice,
  MemoryItem,
  Tone,
  VisualStyle
} from "../../src/freeMvp";
import { displayDraftValue } from "../draftProgress";
import { Chips, Field, FoldedCardPreview, PanelArt, Step } from "../ui";

const allTones: Tone[] = ["warm", "playful", "elegant", "simple", "reverent", "sentimental"];
const styles: VisualStyle[] = ["botanical", "bold-type", "photo-note", "minimal"];
const languages: LanguageChoice[] = ["English", "Spanish", "Urdu", "Arabic"];
const aiButtonLogoSrc = "/customcard-ai-button-logo.png";

const toneLabels: Record<Tone, string> = {
  warm: "Warm",
  playful: "Funny",
  elegant: "Elegant",
  simple: "Simple",
  reverent: "Reverent",
  sentimental: "Sentimental"
};

const styleLabels: Record<VisualStyle, string> = {
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

function panelArtworkLabel(panel: CardPanel, generating: boolean, stale: boolean): string {
  if (generating && !panel.imageUrl) return "Creating artwork…";
  if (stale) return "Needs review";
  if (panel.imageUrl) return "Artwork ready";
  return "Template";
}

type GenerationStageState = "done" | "active" | "pending";

function generationStages(aiLoading: boolean, aiActive: boolean, printFitPassed: boolean): Array<{ label: string; state: GenerationStageState }> {
  if (aiLoading) {
    return [
      { label: "Drafting message", state: "active" },
      { label: "Preparing panels", state: "active" },
      { label: "Checking print fit", state: "pending" },
      { label: "Ready for review", state: "pending" }
    ];
  }
  if (aiActive) {
    return [
      { label: "Drafting message", state: "done" },
      { label: "Preparing panels", state: "done" },
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
  aiRequiresSignIn,
  printFitPassed,
  onAddNote,
  onField,
  onGenerateAi,
  onKeepArtwork
}: {
  draft: CardDraft;
  draftInput: CardDraftInput;
  memories: MemoryItem[];
  aiAvailable: boolean;
  aiLoading: boolean;
  aiActive: boolean;
  aiStale: boolean;
  aiStatus?: string;
  aiRequiresSignIn: boolean;
  printFitPassed: boolean;
  onAddNote: () => void;
  onField: <K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) => void;
  onGenerateAi: () => void;
  onKeepArtwork: () => void;
}) {
  const [activePanel, setActivePanel] = useState<CardPanel["id"]>("front");
  const [previewMode, setPreviewMode] = useState<"proof" | "folded">("proof");
  const panel = draft.panels.find((candidate) => candidate.id === activePanel) ?? draft.panels[0];
  const approvedForRecipient = memories.filter((memory) => memory.approved).length;
  const artworkCount = draft.panels.filter((candidate) => candidate.imageUrl).length;
  const sensitive = isSensitiveOccasion(draftInput.occasion);
  const tones = sensitive ? allTones.filter((tone) => tone !== "playful") : allTones;

  // High-care occasions never keep a humorous tone selected.
  useEffect(() => {
    if (sensitive && draftInput.tone === "playful") onField("tone", "simple");
  }, [draftInput.tone, onField, sensitive]);
  const aiState = aiLoading ? "loading" : aiActive ? "ready" : "idle";
  const stages = generationStages(aiLoading, aiActive, printFitPassed);
  const aiPanelSummary = aiActive
    ? `${artworkCount}/${draft.panels.length} artwork panels ready`
    : `${draft.panels.length} print panels`;
  const aiNote = aiRequiresSignIn
    ? "Create and print without an account. AI card generation needs sign-in."
    : aiStatus
      ? aiStatus
      : aiActive
        ? "Copy + artwork applied to the four print panels."
        : "Creates editable copy and artwork for every panel.";

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your card, their story</h1>
        <p>Everything updates live — what you see here is exactly what prints.</p>
      </header>

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
              <div className="stage-frame">
                <PanelArt className="stage-card" panel={panel} />
              </div>
              <div className="stage-ai-state" data-state={aiState}>
                <span>{aiLoading ? "Generating AI card" : aiActive ? "AI card applied" : "AI card generator"}</span>
                <strong>{aiLoading ? "Copy + artwork in progress" : aiPanelSummary}</strong>
              </div>
              <div className="pagetabs">
                {draft.panels.map((candidate) => (
                  <button
                    className="pagetab"
                    data-on={candidate.id === activePanel}
                    key={candidate.id}
                    onClick={() => setActivePanel(candidate.id)}
                    type="button"
                  >
                    <PanelArt panel={candidate} />
                    <span>{candidate.label}</span>
                    <small>{panelArtworkLabel(candidate, aiLoading, aiStale)}</small>
                  </button>
                ))}
              </div>
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
              <strong>You changed the message after artwork was generated.</strong>
              <div className="stalebanner-actions">
                <button className="btn btn-ghost btn-sm" onClick={onKeepArtwork} type="button">
                  Keep current artwork
                </button>
                <button className="btn btn-ink btn-sm" onClick={onGenerateAi} type="button">
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
                  We&rsquo;ll save your progress, generate your draft, and keep your card history for next time. Your
                  draft stays right here while you sign in.
                </span>
                <small className="accountgate-privacy">
                  Signing in does not connect your email or calendar. You choose that separately.
                </small>
              </div>
              <SignInButton mode="modal">
                <button className="aibutton" type="button">
                  <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
                  Sign in to generate AI card
                </button>
              </SignInButton>
            </section>
          ) : aiAvailable ? (
            <section className="aiLaunch" data-state={aiState} aria-label="AI card generation">
              <div className="aiLaunchText">
                <strong>{aiLoading ? "Generating AI card" : aiActive ? "AI card ready" : "AI card generator"}</strong>
                <span>{aiNote}</span>
              </div>
              <button className="aibutton" disabled={aiLoading} onClick={onGenerateAi} type="button">
                <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
                {aiLoading ? "Generating…" : aiActive ? "Regenerate AI card" : "Generate AI card"}
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
            meta={`${toneLabels[draftInput.tone]} · ${styleLabels[draftInput.style]}`}
            number={2}
            title="The look and feel"
          >
            <Field label="Tone">
              <Chips
                format={(value) => toneLabels[value]}
                onValue={(value) => onField("tone", value)}
                options={tones}
                value={tones.includes(draftInput.tone) ? draftInput.tone : "simple"}
              />
            </Field>
            <Field label="Style">
              <Chips
                format={(value) => styleLabels[value]}
                onValue={(value) => onField("style", value)}
                options={styles}
                value={draftInput.style}
              />
            </Field>
            <Field label="Card language">
              <Chips onValue={(value) => onField("language", value)} options={languages} value={draftInput.language} />
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
