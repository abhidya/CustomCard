import { SignInButton } from "@clerk/react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
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
import { Chips, Field, PanelArt, Step } from "../ui";

const tones: Tone[] = ["warm", "playful", "elegant", "reverent"];
const styles: VisualStyle[] = ["botanical", "bold-type", "photo-note", "minimal"];
const languages: LanguageChoice[] = ["English", "Spanish", "Urdu", "Arabic"];

const styleLabels: Record<VisualStyle, string> = {
  botanical: "Botanical",
  "bold-type": "Bold type",
  "photo-note": "Photo note",
  minimal: "Minimal"
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function StudioView({
  draft,
  draftInput,
  memories,
  aiAvailable,
  aiLoading,
  aiActive,
  aiRequiresSignIn,
  onField,
  onGenerateAi
}: {
  draft: CardDraft;
  draftInput: CardDraftInput;
  memories: MemoryItem[];
  aiAvailable: boolean;
  aiLoading: boolean;
  aiActive: boolean;
  aiRequiresSignIn: boolean;
  onField: <K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) => void;
  onGenerateAi: () => void;
}) {
  const [activePanel, setActivePanel] = useState<CardPanel["id"]>("front");
  const panel = draft.panels.find((candidate) => candidate.id === activePanel) ?? draft.panels[0];
  const approvedForRecipient = memories.filter((memory) => memory.approved).length;

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your card, their story</h1>
        <p>Everything updates live — what you see here is exactly what prints.</p>
      </header>

      <div className="studio">
        <div className="stage reveal reveal-1">
          <div className="stage-frame">
            <PanelArt className="stage-card" panel={panel} />
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
              </button>
            ))}
          </div>
          <div className="stage-caption">
            <span>5 × 7 in folded card</span>
            <span>Print-ready at 300 DPI</span>
          </div>
        </div>

        <div className="steps reveal reveal-2">
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
            meta={`${titleCase(draftInput.tone)} · ${styleLabels[draftInput.style]}`}
            number={2}
            title="The look and feel"
          >
            <Field label="Tone">
              <Chips format={titleCase} onValue={(value) => onField("tone", value)} options={tones} value={draftInput.tone} />
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
            defaultOpen={aiRequiresSignIn}
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
            {aiAvailable ? (
              <div className="airow">
                {aiRequiresSignIn ? (
                  <SignInButton mode="modal">
                    <button className="aibutton" type="button">
                      <Sparkles size={16} />
                      Sign in to use AI
                    </button>
                  </SignInButton>
                ) : (
                  <button className="aibutton" disabled={aiLoading} onClick={onGenerateAi} type="button">
                    <Sparkles size={16} />
                    {aiLoading ? "Writing…" : aiActive ? "Rewrite with AI" : "Write it with AI"}
                  </button>
                )}
                <span className="ainote">
                  {aiRequiresSignIn
                    ? "Create and print without an account. AI writing needs sign-in."
                    : aiActive
                      ? "AI draft applied — edit anything above to reset."
                      : "Uses your details and notes."}
                </span>
              </div>
            ) : null}
          </Step>
        </div>
      </div>
    </>
  );
}
