import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Eye,
  GalleryHorizontalEnd,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateCardDraft, buildPanelSvg, type CardDraftInput, type CardPanel } from "../../src/customerWorkflow";

/**
 * Admin "Card gallery" curation surface.
 *
 * Generated cards (draft states) appear as candidates with an automatically
 * derived category. Nothing becomes public until an admin writes public-safe
 * copy, approves it, and features it. The front-card SVG is also curated here,
 * so editing/regenerating card copy updates the exact public preview.
 */

const galleryCategories = [
  "birthday",
  "graduation",
  "wedding",
  "anniversary",
  "thank-you",
  "sympathy",
  "get-well",
  "new-baby",
  "holiday",
  "custom"
] as const;

type GalleryStage = "candidates" | "drafts" | "needs-review" | "featured";
type ReviewChecklistId = "permissionConfirmed" | "privacyReviewed" | "textFitReviewed" | "publicCopyReviewed";

interface GalleryEntry {
  entryId: string;
  sourceDraftId?: string;
  projectId?: string;
  category: string;
  title: string;
  publicCaption: string;
  featured: boolean;
  featuredRank: number;
  publicApproved: boolean;
  frontSvg?: string;
  updatedAtIso?: string;
}

interface GalleryCandidate {
  sourceDraftId: string;
  status: string;
  draftInput?: Partial<CardDraftInput>;
  derivedCategory: string;
  updatedAtIso?: string;
}

interface GalleryPayload {
  entries?: GalleryEntry[];
  candidates?: GalleryCandidate[];
  galleryReadStatus?: {
    ok: boolean;
    message?: string;
  };
}

interface CardCopyState {
  headline: string;
  body: string;
  artDirection: string;
}

interface GalleryEditorState {
  entryId: string;
  sourceDraftId?: string;
  projectId?: string;
  category: string;
  title: string;
  publicCaption: string;
  featuredRank: string;
  featured: boolean;
  publicApproved: boolean;
  frontSvg: string;
  cardCopy: CardCopyState;
}

type ReviewChecklistState = Record<ReviewChecklistId, boolean>;

const emptyReviewChecklist: ReviewChecklistState = {
  permissionConfirmed: false,
  privacyReviewed: false,
  textFitReviewed: false,
  publicCopyReviewed: false
};

const reviewChecklistItems: Array<{ id: ReviewChecklistId; label: string }> = [
  { id: "permissionConfirmed", label: "Permission to share is confirmed" },
  { id: "privacyReviewed", label: "Names, notes, and private details are public-safe" },
  { id: "textFitReviewed", label: "Card text fits the front preview" },
  { id: "publicCopyReviewed", label: "Gallery title and caption are approved" }
];

const headlineLimit = 90;
const bodyLimit = 360;
const captionLimit = 120;
const sensitiveCategories = new Set(["sympathy", "get-well"]);

export function AdminCardGalleryView({
  getAdminApiToken
}: {
  getAdminApiToken?: () => Promise<string | undefined>;
}) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [candidates, setCandidates] = useState<GalleryCandidate[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeStage, setActiveStage] = useState<GalleryStage>("candidates");
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [editor, setEditor] = useState<GalleryEditorState>(() => editorFromCandidate(undefined));
  const [reviewChecklist, setReviewChecklist] = useState<ReviewChecklistState>(emptyReviewChecklist);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [regenerationCount, setRegenerationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState("");

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminApiToken?.();
      const response = await fetch("/api/admin/card-gallery", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) {
        setStatusLine("Gallery repository is not available yet.");
        return;
      }
      const payload = await response.json() as GalleryPayload;
      setEntries(payload.entries ?? []);
      setCandidates(payload.candidates ?? []);
      setStatusLine(payload.galleryReadStatus?.ok === false ? payload.galleryReadStatus.message ?? "Gallery repository is not fully available yet." : "");
    } catch {
      setStatusLine("Gallery repository is not available yet.");
    } finally {
      setLoading(false);
    }
  }, [getAdminApiToken]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  const saveEntry = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const token = await getAdminApiToken?.();
        const response = await fetch("/api/admin/card-gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Idempotency-Key": `card-gallery-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({})) as { status?: string };
          setStatusLine(`Save failed: ${detail.status ?? `HTTP ${response.status}`}`);
          return false;
        }
        setStatusLine("Saved.");
        await loadGallery();
        return true;
      } catch {
        setStatusLine("Save failed.");
        return false;
      }
    },
    [getAdminApiToken, loadGallery]
  );

  const filteredEntries = useMemo(
    () => (categoryFilter === "all" ? entries : entries.filter((entry) => entry.category === categoryFilter)),
    [categoryFilter, entries]
  );

  const stageEntries = useMemo(
    () => filteredEntries.filter((entry) => stageForEntry(entry) === activeStage),
    [activeStage, filteredEntries]
  );

  const selectedCandidate = useMemo(
    () => (activeStage === "candidates" ? candidates.find((candidate) => itemKey("candidate", candidate.sourceDraftId) === selectedKey) : undefined),
    [activeStage, candidates, selectedKey]
  );

  const selectedEntry = useMemo(
    () => (activeStage !== "candidates" ? stageEntries.find((entry) => itemKey("entry", entry.entryId) === selectedKey) : undefined),
    [activeStage, selectedKey, stageEntries]
  );

  const availableKeys = useMemo(
    () =>
      activeStage === "candidates"
        ? candidates.map((candidate) => itemKey("candidate", candidate.sourceDraftId))
        : stageEntries.map((entry) => itemKey("entry", entry.entryId)),
    [activeStage, candidates, stageEntries]
  );

  useEffect(() => {
    if (availableKeys.length === 0) {
      setSelectedKey(undefined);
      return;
    }
    if (!selectedKey || !availableKeys.includes(selectedKey)) setSelectedKey(availableKeys[0]);
  }, [availableKeys, selectedKey]);

  useEffect(() => {
    if (selectedEntry) {
      setEditor(editorFromEntry(selectedEntry));
      setReviewChecklist(selectedEntry.featured && selectedEntry.publicApproved ? reviewedChecklist() : emptyReviewChecklist);
      setPreviewDirty(false);
      return;
    }
    if (selectedCandidate) {
      setEditor(editorFromCandidate(selectedCandidate));
      setReviewChecklist(emptyReviewChecklist);
      setPreviewDirty(false);
    }
  }, [selectedCandidate, selectedEntry]);

  const stageCounts = useMemo(
    () => ({
      candidates: candidates.length,
      drafts: filteredEntries.filter((entry) => stageForEntry(entry) === "drafts").length,
      "needs-review": filteredEntries.filter((entry) => stageForEntry(entry) === "needs-review").length,
      featured: filteredEntries.filter((entry) => stageForEntry(entry) === "featured").length
    }),
    [candidates.length, filteredEntries]
  );

  const featuredLiveCount = entries.filter((entry) => entry.featured && entry.publicApproved).length;
  const previewSvg = editor.frontSvg || buildFrontPreviewSvg(editor.cardCopy, editor.category);
  const publishIssues = buildPublishIssues(editor, reviewChecklist, Boolean(selectedEntry), previewDirty);
  const canPublish = publishIssues.length === 0;
  const currentStageLabel = activeStage === "needs-review" ? "Needs review" : labelFor(activeStage);

  function updateEditor(patch: Partial<GalleryEditorState>) {
    setEditor((current) => ({ ...current, ...patch }));
  }

  function updatePublicCopy(patch: Partial<Pick<GalleryEditorState, "category" | "title" | "publicCaption">>) {
    setEditor((current) => ({ ...current, ...patch, publicApproved: false, featured: false }));
    setReviewChecklist((current) => ({ ...current, publicCopyReviewed: false }));
  }

  function updateCardCopy(patch: Partial<CardCopyState>) {
    setEditor((current) => ({ ...current, cardCopy: { ...current.cardCopy, ...patch } }));
    setPreviewDirty(true);
    setReviewChecklist(emptyReviewChecklist);
  }

  function applyCardCopyToPreview() {
    setEditor((current) => ({
      ...current,
      frontSvg: buildFrontPreviewSvg(current.cardCopy, current.category),
      publicApproved: false,
      featured: false
    }));
    setPreviewDirty(false);
    setReviewChecklist(emptyReviewChecklist);
    setStatusLine("Preview updated; review required before featuring.");
  }

  function regenerateCardText() {
    const nextCount = regenerationCount + 1;
    const nextCopy = suggestedCardCopy(editor.category, editor.title, nextCount);
    setRegenerationCount(nextCount);
    setEditor((current) => ({
      ...current,
      cardCopy: nextCopy,
      frontSvg: buildFrontPreviewSvg(nextCopy, current.category),
      publicApproved: false,
      featured: false
    }));
    setPreviewDirty(false);
    setReviewChecklist(emptyReviewChecklist);
    setStatusLine("Card text regenerated; review required before featuring.");
  }

  function regenerateGalleryCopy() {
    const nextTitle = `${labelFor(editor.category)} card example`;
    const nextCaption = captionForCategory(editor.category);
    setEditor((current) => ({
      ...current,
      title: nextTitle,
      publicCaption: nextCaption,
      publicApproved: false,
      featured: false
    }));
    setReviewChecklist((current) => ({ ...current, publicCopyReviewed: false }));
    setStatusLine("Gallery copy regenerated; public copy review required.");
  }

  async function saveCurrent(overrides: Partial<GalleryEntry> = {}) {
    const entryId = editor.entryId || buildCandidateEntryId(selectedCandidate);
    const frontSvg = previewDirty ? buildFrontPreviewSvg(editor.cardCopy, editor.category) : previewSvg;
    const body = {
      entryId,
      sourceDraftId: editor.sourceDraftId,
      projectId: editor.projectId,
      category: editor.category,
      title: editor.title,
      publicCaption: editor.publicCaption,
      featured: false,
      publicApproved: false,
      featuredRank: Number(editor.featuredRank) || 100,
      frontSvg,
      ...overrides
    };
    const saved = await saveEntry(body);
    if (saved) {
      const nextFeatured = Boolean(body.featured);
      const nextPublicApproved = Boolean(body.publicApproved);
      setActiveStage(nextFeatured && nextPublicApproved ? "featured" : nextFeatured || nextPublicApproved ? "needs-review" : "drafts");
      setSelectedKey(itemKey("entry", entryId));
      setPreviewDirty(false);
    }
    return saved;
  }

  async function archiveCurrent() {
    if (!selectedEntry) return;
    const saved = await saveEntry({ entryId: selectedEntry.entryId, remove: true });
    if (saved) {
      setSelectedKey(undefined);
      setActiveStage("drafts");
    }
  }

  const listEmpty =
    activeStage === "candidates"
      ? "No generated cards yet. Once customers generate cards, they appear here as candidates."
      : `No ${currentStageLabel.toLowerCase()} cards${categoryFilter === "all" ? "" : ` for ${labelFor(categoryFilter)}`} yet.`;

  return (
    <section className="panelcard opsCard opsCard-wide galleryWorkflow" aria-label="Card gallery curation">
      <div className="opsCardHead">
        <div>
          <h2>Card gallery</h2>
          <p className="opsFoot">
            Curate card candidates into public-safe featured examples for the landing &ldquo;Made for real moments&rdquo; section.
          </p>
        </div>
        <span className="opsStatus" data-ok={featuredLiveCount > 0}>
          <GalleryHorizontalEnd size={14} />
          {featuredLiveCount} featured live
        </span>
      </div>

      <div className="galleryToolbar">
        <div className="galleryTabs" role="tablist" aria-label="Gallery workflow stages">
          {(["candidates", "drafts", "needs-review", "featured"] as GalleryStage[]).map((stage) => (
            <button
              aria-selected={activeStage === stage}
              className="galleryTab"
              data-on={activeStage === stage}
              key={stage}
              onClick={() => setActiveStage(stage)}
              role="tab"
              type="button"
            >
              <span>{stage === "needs-review" ? "Needs review" : labelFor(stage)}</span>
              <strong>{stageCounts[stage]}</strong>
            </button>
          ))}
        </div>
        <label className="galleryFilter">
          Category{" "}
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">All categories</option>
            {galleryCategories.map((category) => (
              <option key={category} value={category}>
                {labelFor(category)}
              </option>
            ))}
          </select>
        </label>
        <button aria-label="Reload card gallery" className="btn btn-ghost btn-sm" disabled={loading} onClick={() => void loadGallery()} type="button">
          <RefreshCw size={14} />
          Reload
        </button>
      </div>
      {statusLine ? <p aria-live="polite" className="opsFoot">{statusLine}</p> : null}

      <div className="galleryWorkspace">
        <aside className="galleryList" aria-label={`${currentStageLabel} cards`}>
          {activeStage === "candidates"
            ? candidates.map((candidate) => (
                <button
                  className="galleryListItem"
                  data-selected={itemKey("candidate", candidate.sourceDraftId) === selectedKey}
                  key={candidate.sourceDraftId}
                  onClick={() => setSelectedKey(itemKey("candidate", candidate.sourceDraftId))}
                  type="button"
                >
                  <span className="galleryListKicker">Candidate</span>
                  <strong>{String(candidate.draftInput?.occasion ?? "Card")}</strong>
                  <small>{labelFor(candidate.derivedCategory)} · {candidate.status} · {candidate.updatedAtIso?.slice(0, 10) ?? "recent"}</small>
                </button>
              ))
            : stageEntries.map((entry) => (
                <button
                  className="galleryListItem"
                  data-selected={itemKey("entry", entry.entryId) === selectedKey}
                  key={entry.entryId}
                  onClick={() => setSelectedKey(itemKey("entry", entry.entryId))}
                  type="button"
                >
                  {entry.frontSvg ? (
                    <img alt="" src={`data:image/svg+xml;utf8,${encodeURIComponent(entry.frontSvg)}`} />
                  ) : (
                    <span aria-hidden="true" className="galleryThumbMissing" />
                  )}
                  <span className="galleryListKicker">{labelFor(stageForEntry(entry))}</span>
                  <strong>{entry.title}</strong>
                  <small>{labelFor(entry.category)} · rank {entry.featuredRank} · {entry.updatedAtIso?.slice(0, 10) ?? "draft"}</small>
                </button>
              ))}
          {availableKeys.length === 0 ? <p className="opsFoot">{listEmpty}</p> : null}
        </aside>

        <article className="galleryEditor" aria-label="Selected card curation">
          {selectedCandidate || selectedEntry ? (
            <>
              <div className="galleryEditorHead">
                <div>
                  <span className="galleryListKicker">{selectedCandidate ? "Candidate setup" : currentStageLabel}</span>
                  <h3>{editor.title || `${labelFor(editor.category)} card`}</h3>
                </div>
                <div className="galleryEditorActions">
                  {selectedEntry ? (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => void saveCurrent({ featured: false, publicApproved: false })} type="button">
                        Save draft
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={!canPublish}
                        onClick={() => void saveCurrent({ featured: false, publicApproved: true })}
                        type="button"
                      >
                        <ShieldCheck size={14} />
                        Approve
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!canPublish}
                        onClick={() => void saveCurrent({ featured: true, publicApproved: true })}
                        type="button"
                      >
                        <Star size={14} />
                        Feature
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => void saveCurrent()} type="button">
                      Create gallery draft
                    </button>
                  )}
                </div>
              </div>

              <div className="galleryEditorGrid">
                <section className="galleryPreviewPane" aria-label="Public gallery preview">
                  <div className="galleryPreviewCard">
                    {previewSvg ? (
                      <img alt={`${editor.title} card front`} src={`data:image/svg+xml;utf8,${encodeURIComponent(previewSvg)}`} />
                    ) : (
                      <div className="galleryPreviewMissing">
                        <Eye size={18} />
                        <span>Preview missing</span>
                      </div>
                    )}
                    <strong>{editor.title || "Untitled card"}</strong>
                    <p>{editor.publicCaption || "Public caption needed."}</p>
                  </div>
                  {previewDirty ? (
                    <p className="galleryWarning">
                      <AlertTriangle size={14} />
                      Preview has unsaved text edits.
                    </p>
                  ) : null}
                </section>

                <section className="galleryForm" aria-label="Card and gallery copy editor">
                  <div className="galleryFieldGrid">
                    <label className="galleryField">
                      Category
                      <select onChange={(event) => updatePublicCopy({ category: event.target.value })} value={editor.category}>
                        {galleryCategories.map((category) => (
                          <option key={category} value={category}>
                            {labelFor(category)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="galleryField">
                      Rank
                      <input inputMode="numeric" onChange={(event) => updateEditor({ featuredRank: event.target.value })} value={editor.featuredRank} />
                    </label>
                  </div>

                  <div className="galleryCopyBlock">
                    <div className="galleryBlockHead">
                      <h4>Card text</h4>
                      <button className="btn btn-ghost btn-sm" onClick={regenerateCardText} type="button">
                        <WandSparkles size={14} />
                        Regenerate
                      </button>
                    </div>
                    <label className="galleryField">
                      Front headline
                      <input
                        maxLength={headlineLimit + 20}
                        onChange={(event) => updateCardCopy({ headline: event.target.value })}
                        value={editor.cardCopy.headline}
                      />
                    </label>
                    <label className="galleryField">
                      Front body
                      <textarea
                        maxLength={bodyLimit + 80}
                        onChange={(event) => updateCardCopy({ body: event.target.value })}
                        value={editor.cardCopy.body}
                      />
                    </label>
                    <label className="galleryField">
                      Art direction note
                      <input
                        onChange={(event) => updateCardCopy({ artDirection: event.target.value })}
                        value={editor.cardCopy.artDirection}
                      />
                    </label>
                    <button className="btn btn-ghost btn-sm" onClick={applyCardCopyToPreview} type="button">
                      <Sparkles size={14} />
                      Update preview
                    </button>
                  </div>

                  <div className="galleryCopyBlock">
                    <div className="galleryBlockHead">
                      <h4>Gallery copy</h4>
                      <button className="btn btn-ghost btn-sm" onClick={regenerateGalleryCopy} type="button">
                        <WandSparkles size={14} />
                        Regenerate
                      </button>
                    </div>
                    <label className="galleryField">
                      Public title
                      <input onChange={(event) => updatePublicCopy({ title: event.target.value })} value={editor.title} />
                    </label>
                    <label className="galleryField">
                      Public caption
                      <textarea maxLength={captionLimit + 40} onChange={(event) => updatePublicCopy({ publicCaption: event.target.value })} value={editor.publicCaption} />
                    </label>
                  </div>
                </section>
              </div>

              <section className="galleryReview" aria-label="Public approval checklist">
                <div className="galleryBlockHead">
                  <h4>Review checklist</h4>
                  {canPublish ? (
                    <span className="galleryReady">
                      <CheckCircle2 size={14} />
                      Ready to feature
                    </span>
                  ) : (
                    <span className="galleryNotReady">
                      <AlertTriangle size={14} />
                      Review needed
                    </span>
                  )}
                </div>
                {sensitiveCategories.has(editor.category) ? (
                  <p className="galleryWarning">
                    <AlertTriangle size={14} />
                    Sensitive occasion: review tone and privacy before publishing.
                  </p>
                ) : null}
                <div className="galleryChecks">
                  {reviewChecklistItems.map((item) => (
                    <label className="galleryCheck" key={item.id}>
                      <input
                        checked={reviewChecklist[item.id]}
                        onChange={(event) => setReviewChecklist((current) => ({ ...current, [item.id]: event.target.checked }))}
                        type="checkbox"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                {publishIssues.length > 0 ? (
                  <ul className="galleryBlockers" aria-label="Publish blockers">
                    {publishIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </section>

              {selectedEntry ? (
                <div className="galleryDangerActions">
                  <button className="btn btn-ghost btn-sm" onClick={() => void saveCurrent({ featured: false, publicApproved: editor.publicApproved })} type="button">
                    <Star size={14} />
                    Unfeature
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void archiveCurrent()} type="button">
                    <Archive size={14} />
                    Archive
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="galleryEmpty">
              <img
                alt=""
                className="adminGalleryEmptyImage"
                decoding="async"
                loading="lazy"
                src="/generated/admin-gallery-empty.webp"
              />
              <GalleryHorizontalEnd size={18} />
              <strong>Select a card to curate.</strong>
              <p>{listEmpty}</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function stageForEntry(entry: GalleryEntry): GalleryStage {
  if (entry.featured && entry.publicApproved) return "featured";
  if (entry.featured || entry.publicApproved || !entry.frontSvg) return "needs-review";
  return "drafts";
}

function itemKey(kind: "candidate" | "entry", id: string): string {
  return `${kind}:${id}`;
}

function editorFromCandidate(candidate: GalleryCandidate | undefined): GalleryEditorState {
  const category = candidate?.derivedCategory ?? "custom";
  const generated = generateCandidateFrontCopy(candidate);
  const entryId = buildCandidateEntryId(candidate);
  return {
    entryId,
    sourceDraftId: candidate?.sourceDraftId,
    category,
    title: `${labelFor(category)} card`,
    publicCaption: "Made with CustomCard",
    featuredRank: "100",
    featured: false,
    publicApproved: false,
    frontSvg: buildFrontPreviewSvg(generated, category),
    cardCopy: generated
  };
}

function editorFromEntry(entry: GalleryEntry): GalleryEditorState {
  const fallbackCopy = {
    headline: entry.title || `${labelFor(entry.category)} card`,
    body: entry.publicCaption || captionForCategory(entry.category),
    artDirection: "Curated public gallery front preview"
  };
  return {
    entryId: entry.entryId,
    sourceDraftId: entry.sourceDraftId,
    projectId: entry.projectId,
    category: entry.category,
    title: entry.title,
    publicCaption: entry.publicCaption,
    featuredRank: String(entry.featuredRank),
    featured: entry.featured,
    publicApproved: entry.publicApproved,
    frontSvg: entry.frontSvg ?? "",
    cardCopy: fallbackCopy
  };
}

function buildCandidateEntryId(candidate: GalleryCandidate | undefined): string {
  return `gallery-${String(candidate?.sourceDraftId ?? "draft").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64)}`;
}

function generateCandidateFrontCopy(candidate: GalleryCandidate | undefined): CardCopyState {
  const draftInput = candidate?.draftInput ?? {};
  try {
    const draft = generateCardDraft(
      {
        recipient: "Someone special",
        sender: "A CustomCard customer",
        relationship: String(draftInput.relationship ?? "Friends"),
        occasion: String(draftInput.occasion ?? "card"),
        tone: (draftInput.tone ?? "warm") as CardDraftInput["tone"],
        style: (draftInput.style ?? "botanical") as CardDraftInput["style"],
        language: (draftInput.language ?? "English") as CardDraftInput["language"],
        personalNote: "",
        useMemory: false
      },
      []
    );
    const frontPanel = draft.panels.find((panel) => panel.id === "front");
    if (frontPanel) {
      return {
        headline: frontPanel.headline,
        body: frontPanel.body,
        artDirection: frontPanel.artDirection
      };
    }
  } catch {
    // Fall through to a safe public fallback.
  }
  return suggestedCardCopy(candidate?.derivedCategory ?? "custom", `${labelFor(candidate?.derivedCategory ?? "custom")} card`, 0);
}

function buildFrontPreviewSvg(copy: CardCopyState, category: string): string {
  const panel: CardPanel = {
    id: "front",
    label: "Front",
    headline: copy.headline.trim() || `${labelFor(category)} card`,
    body: copy.body.trim() || captionForCategory(category),
    artDirection: copy.artDirection.trim() || "Public gallery-safe card preview",
    width: 1500,
    height: 2100,
    dpi: 300,
    rtl: false,
    overflowRisk: !textFits(copy)
  };
  return buildPanelSvg(panel);
}

function textFits(copy: CardCopyState): boolean {
  return copy.headline.trim().length > 0 && copy.headline.length <= headlineLimit && copy.body.trim().length > 0 && copy.body.length <= bodyLimit;
}

function reviewedChecklist(): ReviewChecklistState {
  return {
    permissionConfirmed: true,
    privacyReviewed: true,
    textFitReviewed: true,
    publicCopyReviewed: true
  };
}

function buildPublishIssues(
  editor: GalleryEditorState,
  checklist: ReviewChecklistState,
  hasPersistedEntry: boolean,
  previewDirty: boolean
): string[] {
  const issues: string[] = [];
  if (!hasPersistedEntry) issues.push("Create a gallery draft first.");
  if (!editor.category) issues.push("Choose a category.");
  if (!editor.title.trim()) issues.push("Add a public title.");
  if (!editor.publicCaption.trim()) issues.push("Add a public caption.");
  if (editor.publicCaption.length > captionLimit) issues.push(`Public caption must be ${captionLimit} characters or fewer.`);
  if (!editor.frontSvg.trim()) issues.push("Attach or generate a front preview.");
  if (previewDirty) issues.push("Update the front preview after editing card text.");
  if (!textFits(editor.cardCopy)) issues.push("Shorten card headline or body copy.");
  if (!checklist.permissionConfirmed) issues.push("Confirm permission to share.");
  if (!checklist.privacyReviewed) issues.push("Complete privacy review.");
  if (!checklist.textFitReviewed) issues.push("Confirm the text-fit review.");
  if (!checklist.publicCopyReviewed) issues.push("Approve the gallery title and caption.");
  return issues;
}

function suggestedCardCopy(category: string, title: string, iteration: number): CardCopyState {
  const label = labelFor(category);
  const variants: CardCopyState[] = [
    {
      headline: `${label} card, made personal`,
      body: `A polished ${label.toLowerCase()} card with warm copy, reviewed details, and a print-ready front panel.`,
      artDirection: "Public gallery-safe 5x7 front with calm spacing and no private notes"
    },
    {
      headline: `For a real ${label.toLowerCase()} moment`,
      body: "A CustomCard example built from reviewed occasion details and prepared for a careful print proof.",
      artDirection: "Clean public sample card front with soft accents and generous text-safe margins"
    },
    {
      headline: title.trim() || `${label} card`,
      body: captionForCategory(category),
      artDirection: "Curated landing gallery preview with public-safe copy and restrained ornament"
    }
  ];
  return variants[iteration % variants.length];
}

function captionForCategory(category: string): string {
  const captions: Record<string, string> = {
    birthday: "A personal birthday card prepared for review and print.",
    graduation: "A graduation card with public-safe copy and a clean proof.",
    wedding: "An elegant card example for a wedding or engagement moment.",
    anniversary: "A relationship card shaped around a remembered date.",
    "thank-you": "A thoughtful thank-you card ready for a final proof check.",
    sympathy: "A quiet sympathy card reviewed for tone and privacy.",
    "get-well": "A supportive get-well card with careful, human-reviewed copy.",
    "new-baby": "A gentle new-baby card example for a shared family moment.",
    holiday: "A seasonal card example with editable copy and print-safe artwork.",
    custom: "A public-safe card example curated from a CustomCard draft."
  };
  return captions[category] ?? captions.custom;
}

function labelFor(category: string): string {
  return category
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}
