import { SignInButton } from "@clerk/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bold,
  CalendarDays,
  HeartHandshake,
  ImageOff,
  ImagePlus,
  Italic,
  Palette,
  RefreshCw,
  Undo2,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type {
  CardImageFocus,
  CardImageFrame,
  CardImagePlacement,
  CardDraft,
  CardDraftInput,
  CardPanel,
  CardTextFormat,
  CardTextLayout,
  MemoryItem,
  TextAlignment,
} from "../../src/customerWorkflow";
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
import { cardTemplates, type CardTemplateChoice } from "../cardTemplates";
import {
  buildStudioModel,
  genericOccasion,
  mergePanelTextFormat,
  mergePanelTextLayout,
  normalizeGenerationPanelIds,
  panelArtworkLabel,
  photoWindowTextLayoutPatch,
  styleLabel,
  styleLabels,
  studioVisualStylePresets,
  templatePanelPatch,
  titleCase,
  toggleGenerationPanelId,
  toneImpliesHumor,
  toneLabel,
  toneLabels,
  uploadedImagePanelPatch
} from "../studioModel";
import { Chips, Field, FoldedCardPreview, PanelArt, Step } from "../ui";

const aiButtonLogoSrc = "/customcard-ai-button-logo.png";

const imageFrameLabels: Record<CardImageFrame, string> = {
  fill: "Fill panel",
  fit: "Fit image",
  "photo-window": "Photo window"
};

const imageFocusLabels: Record<CardImageFocus, string> = {
  center: "Center",
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right"
};

const alignmentIcons: Record<TextAlignment, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Image could not be read."));
    };
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });
}

export { isSensitiveOccasion } from "../studioModel";

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
  onReviewProof,
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
  onGenerateAi: (panelId?: CardPanel["id"] | CardPanel["id"][]) => void;
  onKeepArtwork: () => void;
  onReviewProof: () => void;
  onPanelEdit: (panelId: CardPanel["id"], patch: PanelOverride) => void;
  onPanelRevert: (panelId: CardPanel["id"]) => void;
}) {
  const [activePanel, setActivePanel] = useState<CardPanel["id"]>("front");
  const [previewMode, setPreviewMode] = useState<"proof" | "folded">("proof");
  const [templateReviewStarted, setTemplateReviewStarted] = useState(false);
  const [generationPanelIds, setGenerationPanelIds] = useState<CardPanel["id"][]>(["front"]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const {
    activePanel: panel,
    activePanelStatus,
    aiNote,
    aiState,
    approvedForRecipient,
    contextChecklist,
    minContextReady,
    proofWorkspaceVisible,
    selectedGenerationPanels,
    selectedTemplate,
    sensitive,
    setupRecipient,
    stagePanelSummary,
    stages,
    tones
  } = buildStudioModel({
    activePanelId: activePanel,
    aiActive,
    aiLoading,
    aiPanelProgress,
    aiRequiresSignIn,
    aiStatus,
    draft,
    draftInput,
    generationPanelIds,
    memories,
    printFitPassed,
    templateReviewStarted
  });

  // High-care occasions never keep a humorous tone selected.
  useEffect(() => {
    if (sensitive && toneImpliesHumor(draftInput.tone)) onField("tone", "simple");
  }, [draftInput.tone, onField, sensitive]);
  useEffect(() => {
    setGenerationPanelIds((current) => {
      return normalizeGenerationPanelIds({ activePanelId: activePanel, draft, generationPanelIds: current });
    });
  }, [activePanel, draft.panels]);

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

  function startAiGeneration(panelId?: CardPanel["id"] | CardPanel["id"][]) {
    if (aiRequiresSignIn) return;
    setTemplateReviewStarted(false);
    onGenerateAi(panelId);
  }

  function startTemplateReview() {
    setTemplateReviewStarted(true);
  }

  function applyTemplate(template: CardTemplateChoice) {
    setActivePanel("front");
    setTemplateReviewStarted(true);
    if (genericOccasion(draftInput.occasion)) onField("occasion", template.occasion);
    onField("style", template.styleId);
    onPanelEdit("front", templatePanelPatch(template));
  }

  function toggleGenerationPanel(panelId: CardPanel["id"]) {
    setGenerationPanelIds((current) => {
      return toggleGenerationPanelId({ current, draft, panelId });
    });
  }

  const setupSteps = (
    <>
      <Step
        defaultOpen
        meta={displayDraftValue(draftInput.recipient) ? `To ${draftInput.recipient}` : "Add names"}
        number={1}
        title="Who it's for"
      >
        <div className="fieldrow">
          <Field htmlFor="studio-recipient" label="To">
            <input
              id="studio-recipient"
              onChange={(event) => onField("recipient", event.target.value)}
              placeholder="Their name"
              value={displayDraftValue(draftInput.recipient)}
            />
          </Field>
          <Field htmlFor="studio-sender" label="From">
            <input
              id="studio-sender"
              onChange={(event) => onField("sender", event.target.value)}
              placeholder="Your name"
              value={displayDraftValue(draftInput.sender)}
            />
          </Field>
        </div>
        <div className="fieldrow">
          <Field htmlFor="studio-relationship" label="Your relationship">
            <input
              id="studio-relationship"
              onChange={(event) => onField("relationship", event.target.value)}
              placeholder="Friends, siblings, coworkers…"
              value={draftInput.relationship}
            />
          </Field>
          <Field htmlFor="studio-occasion" label="Occasion">
            <input
              id="studio-occasion"
              onChange={(event) => onField("occasion", event.target.value)}
              placeholder="Birthday, anniversary…"
              value={displayDraftValue(draftInput.occasion)}
            />
          </Field>
        </div>
      </Step>

      <Step
        defaultOpen
        meta={selectedTemplate ? selectedTemplate.label : "Gallery or blank"}
        number={2}
        title="Start from a design"
      >
        <TemplateGallery
          onTemplate={applyTemplate}
          selectedTemplateId={selectedTemplate?.id}
        />
      </Step>

      <Step
        defaultOpen
        meta={`${toneLabel(draftInput.tone)} · ${styleLabel(draftInput.style)}`}
        number={3}
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
            options={studioVisualStylePresets}
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
        number={4}
        title="Make it personal"
      >
        <Field htmlFor="studio-personal-note" label="A shared memory, an inside joke, or what you appreciate about them">
          <textarea
            id="studio-personal-note"
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
            aria-checked={draftInput.useMemory}
            aria-label="Use saved notes"
            className="switch"
            data-on={draftInput.useMemory}
            onClick={() => onField("useMemory", !draftInput.useMemory)}
            role="switch"
            type="button"
          />
        </div>
        <button className="textlink textlink-inline" onClick={onAddNote} type="button">
          Add or edit saved notes
        </button>
      </Step>
    </>
  );

  const aiLaunchPanel = aiRequiresSignIn ? (
    <section className="aiLaunch accountgate" data-state={aiState} aria-label="Account needed for AI generation">
      <div className="aiLaunchText">
        <strong>Create a free account to generate your card</strong>
        <span>
          AI drafting needs sign-in so your draft can be generated and saved. You can still review the printable
          template without AI.
        </span>
        <small className="accountgate-privacy">
          Signing in does not connect your email or calendar. You choose that separately.
        </small>
      </div>
      <div className="aiLaunchActions">
        {templateReviewStarted ? (
          <button
            className="btn btn-primary btn-sm"
            disabled={!printFitPassed}
            onClick={onReviewProof}
            type="button"
          >
            Continue to proof checks
            <ArrowRight size={14} />
          </button>
        ) : null}
        <SignInButton mode="modal">
          <button aria-label="Sign in to generate AI card" className="aibutton" type="button">
            <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
            Sign in
          </button>
        </SignInButton>
        <button
          className="btn btn-ghost btn-sm"
          disabled={!minContextReady}
          onClick={startTemplateReview}
          type="button"
        >
          {minContextReady ? "Review template instead" : "Add details before proof"}
        </button>
        {templateReviewStarted && !printFitPassed ? (
          <small className="proofblocked">Shorten panels marked too long before proof checks.</small>
        ) : null}
      </div>
    </section>
  ) : aiAvailable ? (
    <section className="aiLaunch" data-state={aiState} aria-label="AI card drafting">
      <div className="aiLaunchText">
        <strong>
          {aiLoading
            ? "Building your AI card"
            : aiActive
              ? "Card drafted. Review it before checkout."
              : templateReviewStarted
                ? "Template proof is ready to review"
                : "Draft your card with AI"}
        </strong>
        <span aria-live="polite">
          {aiLoading
            ? aiNote
            : aiActive
            ? "Review the copy, artwork, and print fit before continuing."
            : templateReviewStarted
              ? "The template is printable, but AI can still improve the copy and artwork from these details."
              : aiNote}
        </span>
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
      <div className="aiLaunchActions">
        {aiActive || templateReviewStarted ? (
          <button
            className="btn btn-primary btn-sm"
            disabled={!printFitPassed}
            onClick={onReviewProof}
            type="button"
          >
            Continue to proof checks
            <ArrowRight size={14} />
          </button>
        ) : null}
        <button
          className="aibutton"
          disabled={aiLoading || !minContextReady}
          onClick={() => startAiGeneration()}
          type="button"
        >
          <img alt="" aria-hidden="true" className="aibutton-logo" src={aiButtonLogoSrc} />
          {aiLoading
            ? "Drafting card..."
            : !minContextReady
              ? "Add one detail to draft"
              : aiActive
                ? "Improve whole card"
                : "Draft my card"}
        </button>
        {!aiActive && !templateReviewStarted ? (
          <button
            className="btn btn-ghost btn-sm"
            disabled={!minContextReady}
            onClick={startTemplateReview}
            type="button"
          >
            Review template instead
          </button>
        ) : null}
        {(aiActive || templateReviewStarted) && !printFitPassed ? (
          <small className="proofblocked">Shorten panels marked too long before proof checks.</small>
        ) : null}
      </div>
    </section>
  ) : null;

  const aiDrawerLabel = aiRequiresSignIn
    ? "AI drafting"
    : aiLoading
      ? "Building AI card"
      : aiActive
        ? "AI draft ready"
        : "AI drafting";
  const aiDrawerMeta = aiRequiresSignIn
    ? "Sign in for generated copy and artwork."
    : aiLoading
      ? stagePanelSummary
      : aiActive
        ? "Copy and artwork are ready to review."
        : "Optional copy and artwork refresh.";

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your card, their story</h1>
        <p>Add the details first, then draft the card and review the exact proof before printing.</p>
      </header>

      {sourceMoment ? (
        <div className="sourceMomentBanner reveal" role="note">
          <CalendarDays size={17} aria-hidden="true" />
          <div>
            <strong>Drafting from {sourceMoment.title}</strong>
            <span>
              {sourceMoment.dateLabel} · {sourceMoment.sourceLabel}
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

      <div className="studio" data-proof-visible={proofWorkspaceVisible ? "true" : "false"}>
        <div className="stage reveal reveal-1">
          {proofWorkspaceVisible ? (
            <>
              <StudioObjectPreview
                activePanel={activePanel}
                aiStale={aiStale}
                onPanelSelect={setActivePanel}
                panelProgress={aiPanelProgress}
                panels={draft.panels}
              />

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
                    <span>{aiLoading ? "Building AI card" : aiActive ? "Ready to review" : "Template proof"}</span>
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
                    aiRequiresSignIn={aiRequiresSignIn}
                    edited={hasPanelOverride(panelOverrides, panel.id)}
                    onPanelEdit={onPanelEdit}
                    onPanelGenerate={startAiGeneration}
                    onPanelRevert={onPanelRevert}
                    panel={panel}
                    panelStatus={activePanelStatus}
                    sensitive={sensitive}
                  />
                </>
              )}
            </>
          ) : (
            <section className="setupPreview" aria-label="Card setup preview">
              <img alt="Folded greeting card and envelope" decoding="async" src="/generated/landing-hero-product.webp" />
              <div>
                <strong>{setupRecipient ? `Set up the card for ${setupRecipient}` : "Set up the card first"}</strong>
                <span>Once the details are in, draft with AI or review the printable template across four print panels.</span>
              </div>
            </section>
          )}
          <div className="stage-caption">
            <span>5 × 7 in folded card</span>
            <span>Print-ready at 300 DPI</span>
          </div>
        </div>

        <div className="steps reveal reveal-2">
          {proofWorkspaceVisible ? (
            <>
              <SetupSummary draftInput={draftInput} selectedTemplate={selectedTemplate} />
              <details className="setupEditDrawer">
                <summary>
                  <span>Edit original details</span>
                  <small>Names, template, tone, style, and memory notes</small>
                </summary>
                <div className="setupEditDrawer-body">{setupSteps}</div>
              </details>
            </>
          ) : setupSteps}

          {aiStale && !aiLoading ? (
            <section className="stalebanner" aria-label="Artwork out of date">
              <strong>You changed the message after AI artwork was generated.</strong>
              <div className="stalebanner-actions">
                <button className="btn btn-ghost btn-sm" onClick={onKeepArtwork} type="button">
                  Keep current artwork
                </button>
                <button className="btn btn-ink btn-sm" onClick={() => startAiGeneration()} type="button">
                  <RefreshCw size={14} />
                  Regenerate affected panels
                </button>
              </div>
            </section>
          ) : null}

          {proofWorkspaceVisible && aiLaunchPanel ? (
            <details className="aiLaunchDrawer" open={aiLoading || undefined}>
              <summary>
                <span>
                  <strong>{aiDrawerLabel}</strong>
                  <small>{aiDrawerMeta}</small>
                </span>
              </summary>
              {aiLaunchPanel}
            </details>
          ) : aiLaunchPanel}

          {proofWorkspaceVisible ? (
            <GenerationScopePanel
              activePanelId={activePanel}
              aiActive={aiActive}
              aiLoading={aiLoading}
              aiRequiresSignIn={aiRequiresSignIn}
              minContextReady={minContextReady}
              onGenerateSelected={() => startAiGeneration(generationPanelIds)}
              onGenerateWhole={() => startAiGeneration()}
              onTogglePanel={toggleGenerationPanel}
              panels={draft.panels}
              selectedPanels={selectedGenerationPanels}
            />
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
        </div>
      </div>
    </>
  );
}

function SetupSummary({
  draftInput,
  selectedTemplate
}: {
  draftInput: CardDraftInput;
  selectedTemplate?: CardTemplateChoice;
}) {
  const recipient = displayDraftValue(draftInput.recipient).trim();
  const sender = displayDraftValue(draftInput.sender).trim();
  const relationship = draftInput.relationship.trim();
  const occasion = displayDraftValue(draftInput.occasion).trim();
  const personalNote = displayDraftValue(draftInput.personalNote).trim();
  const items = [
    { label: "To", value: recipient || "Not set" },
    { label: "From", value: sender || "Not set" },
    { label: "Occasion", value: occasion || "Not set" },
    { label: "Relationship", value: relationship || "Not set" },
    { label: "Design", value: selectedTemplate?.label ?? "Printable template" },
    { label: "Tone", value: toneLabel(draftInput.tone) },
    { label: "Style", value: styleLabel(draftInput.style) },
    { label: "Personal note", value: personalNote ? "Added" : "None yet" }
  ];

  return (
    <section className="setupSummary" aria-label="Card details summary">
      <div className="setupSummary-head">
        <div>
          <span>Review details</span>
          <strong>{recipient ? `Card for ${recipient}` : "Card details"}</strong>
        </div>
        <small>Names, occasion, design, and tone.</small>
      </div>
      <dl className="setupSummary-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {personalNote ? (
        <p className="setupSummary-note">
          <strong>Memory note</strong>
          <span>{personalNote}</span>
        </p>
      ) : null}
    </section>
  );
}

function TemplateGallery({
  selectedTemplateId,
  onTemplate
}: {
  selectedTemplateId?: string;
  onTemplate: (template: CardTemplateChoice) => void;
}) {
  return (
    <div className="templateGallery" role="list" aria-label="Card template gallery">
      {cardTemplates.map((template) => (
        <button
          aria-pressed={selectedTemplateId === template.id}
          className="templateTile"
          data-on={selectedTemplateId === template.id}
          key={template.id}
          onClick={() => onTemplate(template)}
          role="listitem"
          type="button"
        >
          <img alt={`${template.label} template`} decoding="async" loading="lazy" src={template.imageUrl} />
          <span>
            <strong>{template.label}</strong>
            <small>{template.detail}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function StudioObjectPreview({
  panels,
  activePanel,
  panelProgress,
  aiStale,
  onPanelSelect
}: {
  panels: CardPanel[];
  activePanel: CardPanel["id"];
  panelProgress: AiPanelGenerationProgress;
  aiStale: boolean;
  onPanelSelect: (panelId: CardPanel["id"]) => void;
}) {
  const front = panels.find((panel) => panel.id === "front") ?? panels[0];
  const insideLeft = panels.find((panel) => panel.id === "inside-left") ?? panels[1] ?? front;
  const insideRight = panels.find((panel) => panel.id === "inside-right") ?? panels[2] ?? front;
  const back = panels.find((panel) => panel.id === "back") ?? panels[3] ?? front;
  const orderedPanels = [front, insideLeft, insideRight, back].filter(Boolean);
  const active = panels.find((panel) => panel.id === activePanel) ?? front;

  return (
    <section className="studioObject" aria-label="3D folded card proof">
      <div className="studioObject-head">
        <div>
          <span>Folded card object</span>
          <strong>{active.label}</strong>
        </div>
        <small>Four printable faces, one proof.</small>
      </div>
      <div className="studioObject-scene" data-active-panel={activePanel}>
        <button
          aria-label={`Select ${front.label}`}
          className="studioObject-face studioObject-front"
          data-on={activePanel === front.id}
          onClick={() => onPanelSelect(front.id)}
          type="button"
        >
          <PanelArt panel={front} />
          <span>{front.label}</span>
        </button>
        <button
          aria-label={`Select ${insideLeft.label}`}
          className="studioObject-face studioObject-insideLeft"
          data-on={activePanel === insideLeft.id}
          onClick={() => onPanelSelect(insideLeft.id)}
          type="button"
        >
          <PanelArt panel={insideLeft} />
          <span>{insideLeft.label}</span>
        </button>
        <button
          aria-label={`Select ${insideRight.label}`}
          className="studioObject-face studioObject-insideRight"
          data-on={activePanel === insideRight.id}
          onClick={() => onPanelSelect(insideRight.id)}
          type="button"
        >
          <PanelArt panel={insideRight} />
          <span>{insideRight.label}</span>
        </button>
        <button
          aria-label={`Select ${back.label}`}
          className="studioObject-face studioObject-back"
          data-on={activePanel === back.id}
          onClick={() => onPanelSelect(back.id)}
          type="button"
        >
          <PanelArt panel={back} />
          <span>{back.label}</span>
        </button>
      </div>
      <div className="studioObject-controls" role="group" aria-label="Select card face">
        {orderedPanels.map((panel) => (
          <button
            aria-pressed={activePanel === panel.id}
            data-on={activePanel === panel.id}
            key={panel.id}
            onClick={() => onPanelSelect(panel.id)}
            type="button"
          >
            <span>{panel.label}</span>
            <small>{panelArtworkLabel(panel, aiStale, panelProgress[panel.id])}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function GenerationScopePanel({
  panels,
  selectedPanels,
  activePanelId,
  aiLoading,
  aiRequiresSignIn,
  aiActive,
  minContextReady,
  onTogglePanel,
  onGenerateWhole,
  onGenerateSelected
}: {
  panels: CardPanel[];
  selectedPanels: CardPanel[];
  activePanelId: CardPanel["id"];
  aiLoading: boolean;
  aiRequiresSignIn: boolean;
  aiActive: boolean;
  minContextReady: boolean;
  onTogglePanel: (panelId: CardPanel["id"]) => void;
  onGenerateWhole: () => void;
  onGenerateSelected: () => void;
}) {
  const selectedLabels = selectedPanels.map((panel) => panel.label).join(", ");
  const selectedCount = selectedPanels.length;
  const selectedCopy = selectedCount === 1 ? "1 selected face" : `${selectedCount} selected faces`;

  return (
    <section className="generationScope" aria-label="AI refresh options">
      <details className="generationScopeDetails" open={aiLoading || undefined}>
        <summary>
          <span className="generationScope-summaryText">
            <strong>Choose what to improve</strong>
            <small>{aiLoading ? "Drafting updates now" : "Refresh the whole card or selected faces."}</small>
          </span>
          <span className="generationScope-summaryMeta">{selectedCopy}</span>
        </summary>
        <div className="generationScope-body">
          <div className="generationScope-head">
            <div>
              <strong>Refresh options</strong>
              <span>Use the whole card or one or more faces. Current proof stays reviewable.</span>
            </div>
            <div className="generationScope-actions">
              <button
                className="btn btn-ink btn-sm"
                disabled={aiLoading || !minContextReady || aiRequiresSignIn}
                onClick={onGenerateWhole}
                title={aiRequiresSignIn ? "Sign in to generate with AI." : undefined}
                type="button"
              >
                <RefreshCw size={14} />
                {aiActive ? "Improve whole card" : "Generate whole card"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={aiLoading || !minContextReady || selectedCount === 0 || aiRequiresSignIn}
                onClick={onGenerateSelected}
                title={aiRequiresSignIn ? "Sign in to generate with AI." : undefined}
                type="button"
              >
                <RefreshCw size={14} />
                Improve {selectedCopy}
              </button>
            </div>
          </div>
          <div className="generationTargets" role="group" aria-label="Faces included in selected refresh">
            {panels.map((panel) => {
              const selected = selectedPanels.some((candidate) => candidate.id === panel.id);
              return (
                <button
                  aria-pressed={selected}
                  className={panel.id === activePanelId ? "generationTarget generationTarget-active" : "generationTarget"}
                  data-on={selected}
                  key={panel.id}
                  onClick={() => onTogglePanel(panel.id)}
                  type="button"
                >
                  <span>{panel.label}</span>
                  <small>{panel.id === activePanelId ? "Editing now" : selected ? "Included" : "Keep"}</small>
                </button>
              );
            })}
          </div>
          <div className="generationParts" aria-label="Face parts">
            <span>Copy</span>
            <span>Artwork</span>
            <span>Layout</span>
            <span>Print fit</span>
          </div>
          <ol className="versionTray" aria-label="Proof versions">
            <li data-state="current">
              <strong>Current proof</strong>
              <span>Printed files use this version.</span>
            </li>
            <li>
              <strong>Selected faces</strong>
              <span>{selectedLabels || "Choose faces above."}</span>
            </li>
            <li>
              <strong>Easy revert</strong>
              <span>Each face can go back before proof checks.</span>
            </li>
          </ol>
        </div>
      </details>
    </section>
  );
}

function PanelEditor({
  panel,
  panelStatus,
  aiActive,
  aiLoading,
  aiRequiresSignIn,
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
  aiRequiresSignIn: boolean;
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
  const uploadInputId = `panel-upload-${panel.id}`;
  const placement: CardImagePlacement = panel.imagePlacement ?? { frame: "fill", focus: "center" };
  const textLayout = mergePanelTextLayout(panel, {});
  const headlineFormat = panel.textFormat?.headline ?? {};
  const bodyFormat = panel.textFormat?.body ?? {};

  function updateTextLayout(patch: Partial<CardTextLayout>) {
    onPanelEdit(panel.id, { textLayout: mergePanelTextLayout(panel, patch) });
  }

  function toggleTextFormat(target: keyof CardTextFormat, key: "bold" | "italic" | "accent") {
    const current = panel.textFormat?.[target]?.[key] === true;
    onPanelEdit(panel.id, { textFormat: mergePanelTextFormat(panel, target, { [key]: !current }) });
  }

  function updateImagePlacement(patch: Partial<CardImagePlacement>) {
    const nextPlacement = { ...placement, ...patch };
    onPanelEdit(panel.id, {
      imagePlacement: nextPlacement,
      textLayout: photoWindowTextLayoutPatch(panel, nextPlacement)
    });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const imageUrl = await readFileAsDataUrl(file);
    onPanelEdit(panel.id, uploadedImagePanelPatch(panel, file.name, imageUrl));
  }

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
      <div className="inspectorStrip" role="group" aria-label="Selected face tools">
        <a href="#panel-copy-section">Copy</a>
        <a href="#panel-artwork-section">Artwork</a>
        <a href="#panel-layout-section">Layout</a>
        <a href="#panel-layout-section">History</a>
      </div>
      <details className="editorSection" id="panel-copy-section" open>
        <summary>
          <span>
            <strong>Copy</strong>
            <small>Exact printed words</small>
          </span>
        </summary>
        <div className="editorSection-body">
          <p className="paneleditor-note">These are the exact words that print on this panel.</p>
          <label className="paneltext-field">
            <span>Headline</span>
            <input value={panel.headline} onChange={(event) => onPanelEdit(panel.id, { headline: event.target.value })} />
          </label>
          <label className="paneltext-field">
            <span>Body</span>
            <textarea value={panel.body} onChange={(event) => onPanelEdit(panel.id, { body: event.target.value })} />
          </label>
          <details className="editorSubsection">
            <summary>Rich text formatting</summary>
            <div className="richTextTools" aria-label="Rich text formatting">
              <div className="richTextGroup" role="group" aria-label="Headline formatting">
                <span>Headline</span>
                <button
                  aria-label="Bold headline"
                  aria-pressed={headlineFormat.bold === true}
                  data-on={headlineFormat.bold === true}
                  onClick={() => toggleTextFormat("headline", "bold")}
                  title="Bold headline"
                  type="button"
                >
                  <Bold size={14} />
                </button>
                <button
                  aria-label="Italic headline"
                  aria-pressed={headlineFormat.italic === true}
                  data-on={headlineFormat.italic === true}
                  onClick={() => toggleTextFormat("headline", "italic")}
                  title="Italic headline"
                  type="button"
                >
                  <Italic size={14} />
                </button>
                <button
                  aria-label="Accent headline"
                  aria-pressed={headlineFormat.accent === true}
                  data-on={headlineFormat.accent === true}
                  onClick={() => toggleTextFormat("headline", "accent")}
                  title="Accent headline"
                  type="button"
                >
                  <Palette size={14} />
                </button>
              </div>
              <div className="richTextGroup" role="group" aria-label="Body formatting">
                <span>Body</span>
                <button
                  aria-label="Bold body"
                  aria-pressed={bodyFormat.bold === true}
                  data-on={bodyFormat.bold === true}
                  onClick={() => toggleTextFormat("body", "bold")}
                  title="Bold body"
                  type="button"
                >
                  <Bold size={14} />
                </button>
                <button
                  aria-label="Italic body"
                  aria-pressed={bodyFormat.italic === true}
                  data-on={bodyFormat.italic === true}
                  onClick={() => toggleTextFormat("body", "italic")}
                  title="Italic body"
                  type="button"
                >
                  <Italic size={14} />
                </button>
                <button
                  aria-label="Accent body"
                  aria-pressed={bodyFormat.accent === true}
                  data-on={bodyFormat.accent === true}
                  onClick={() => toggleTextFormat("body", "accent")}
                  title="Accent body"
                  type="button"
                >
                  <Palette size={14} />
                </button>
              </div>
              <div className="richTextGroup" role="group" aria-label="Text alignment">
                <span>Align</span>
                {(["left", "center", "right"] as const).map((alignment) => {
                  const Icon = alignmentIcons[alignment];
                  return (
                    <button
                      aria-label={`${titleCase(alignment)} align`}
                      aria-pressed={textLayout.alignment === alignment}
                      data-on={textLayout.alignment === alignment}
                      key={alignment}
                      onClick={() => updateTextLayout({ alignment })}
                      title={`${titleCase(alignment)} align`}
                      type="button"
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
              <label className="richTextSelect">
                <span>Size</span>
                <select value={textLayout.scale} onChange={(event) => updateTextLayout({ scale: event.target.value as CardTextLayout["scale"] })}>
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="large">Large</option>
                </select>
              </label>
            </div>
          </details>
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
              disabled={aiLoading || aiRequiresSignIn}
              onClick={() => onPanelGenerate(panel.id)}
              title={aiRequiresSignIn ? "Sign in to regenerate this panel with AI." : "Regenerate only the selected panel."}
              type="button"
            >
              <RefreshCw size={14} />
              {aiLoading ? "Generating panel..." : "Regenerate this panel"}
            </button>
          </div>
          <small className="paneleditor-aiNote">
            Panel generation updates only the selected panel. The other panels stay unchanged.
          </small>
        </div>
      </details>
      <details className="editorSection" id="panel-artwork-section">
        <summary>
          <span>
            <strong>Artwork</strong>
            <small>{aiActive && panelStatus === "artwork-missing" && !panel.imageUrl ? "Needs artwork" : panel.imageUrl ? imageFrameLabels[placement.frame] : "Template art"}</small>
          </span>
        </summary>
        <div className="editorSection-body">
          {aiActive && panelStatus === "artwork-missing" && !panel.imageUrl ? (
            <p className="paneleditor-warn" role="status">
              We couldn’t load artwork for this panel. The copy is safe; template artwork will print.
            </p>
          ) : null}
          <section className="imageUploadPanel" aria-label="Panel image">
            <div className="imageUploadHead">
              <span>
                <ImagePlus size={15} />
                Image
              </span>
              <div className="imageUploadActions">
                <label className="uploadButton btn btn-ghost btn-sm" htmlFor={uploadInputId}>
                  <Upload size={14} />
                  Upload image
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    id={uploadInputId}
                    onChange={(event) => void handleImageUpload(event)}
                    type="file"
                  />
                </label>
                {panel.imageUrl ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onPanelEdit(panel.id, { imagePlacement: undefined, imageUrl: undefined })}
                    type="button"
                  >
                    <ImageOff size={14} />
                    Remove image
                  </button>
                ) : null}
              </div>
            </div>
            <div className="imagePlacementControls" role="group" aria-label="Image placement">
              {(["fill", "fit", "photo-window"] as const).map((frame) => (
                <button
                  aria-pressed={placement.frame === frame}
                  data-on={placement.frame === frame}
                  key={frame}
                  onClick={() => updateImagePlacement({ frame })}
                  type="button"
                >
                  {imageFrameLabels[frame]}
                </button>
              ))}
            </div>
            <label className="placementSelect">
              <span>Focus</span>
              <select
                disabled={!panel.imageUrl}
                onChange={(event) => updateImagePlacement({ focus: event.target.value as CardImageFocus })}
                value={placement.focus}
              >
                {(["center", "top", "bottom", "left", "right"] as const).map((focus) => (
                  <option key={focus} value={focus}>
                    {imageFocusLabels[focus]}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      </details>
      <details className="editorSection" id="panel-layout-section">
        <summary>
          <span>
            <strong>Layout & print fit</strong>
            <small>{panel.overflowRisk ? "Needs shortening" : "Fits this face"}</small>
          </span>
        </summary>
        <div className="editorSection-body">
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
          <div className="panelstatus-grid" aria-label="Layout and print fit">
            <span>
              <strong>Text fit</strong>
              <small>{panel.overflowRisk ? "Needs shortening" : "Fits this face"}</small>
            </span>
            <span>
              <strong>Layout</strong>
              <small>{panel.textLayout ? "Custom text layout" : "Template layout"}</small>
            </span>
            <span>
              <strong>Image</strong>
              <small>{panel.imageUrl ? imageFrameLabels[placement.frame] : "Template art"}</small>
            </span>
          </div>
          <div className="panelhistory-note" id="panel-history-section">
            <strong>History</strong>
            <span>{edited ? "This face has edits. Revert restores the previous proof." : "No edits on this face yet."}</span>
          </div>
        </div>
      </details>
    </section>
  );
}
