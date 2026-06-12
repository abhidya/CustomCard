import { GalleryHorizontalEnd, RefreshCw, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateCardDraft, buildPanelSvg, type CardDraftInput } from "../../src/customerWorkflow";

/**
 * Admin "Card gallery" curation surface.
 *
 * Generated cards (draft states) appear as candidates with an automatically
 * derived category. Nothing becomes public until an admin writes public-safe
 * copy, approves it, and features it — private customer cards are never
 * auto-published.
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

export function AdminCardGalleryView({
  getAdminApiToken
}: {
  getAdminApiToken?: () => Promise<string | undefined>;
}) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [candidates, setCandidates] = useState<GalleryCandidate[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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

  const visibleEntries = useMemo(
    () => (categoryFilter === "all" ? entries : entries.filter((entry) => entry.category === categoryFilter)),
    [categoryFilter, entries]
  );

  const featuredByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      if (entry.featured && entry.publicApproved) {
        map.set(entry.category, (map.get(entry.category) ?? 0) + 1);
      }
    }
    return map;
  }, [entries]);

  function addCandidateToGallery(candidate: GalleryCandidate) {
    const draftInput = candidate.draftInput ?? {};
    let frontSvg = "";
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
      frontSvg = frontPanel ? buildPanelSvg(frontPanel) : "";
    } catch {
      frontSvg = "";
    }
    void saveEntry({
      sourceDraftId: candidate.sourceDraftId,
      category: candidate.derivedCategory,
      title: `${labelFor(candidate.derivedCategory)} card`,
      publicCaption: "Made with CustomCard",
      featured: false,
      publicApproved: false,
      featuredRank: 100,
      frontSvg
    });
  }

  return (
    <section className="panelcard opsCard opsCard-wide" aria-label="Card gallery curation">
      <div className="opsCardHead">
        <h2>Card gallery</h2>
        <span className="opsStatus" data-ok={entries.some((entry) => entry.featured && entry.publicApproved)}>
          <GalleryHorizontalEnd size={14} />
          {entries.filter((entry) => entry.featured && entry.publicApproved).length} featured live
        </span>
      </div>
      <p className="opsFoot">
        Featured + approved cards appear in the landing &ldquo;Made for real moments&rdquo; section. Categories with
        more than one featured card rotate as a carousel. Private customer cards never publish automatically.
      </p>

      <div className="importactions" role="group" aria-label="Gallery controls">
        <label>
          Filter by category{" "}
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

      {visibleEntries.length === 0 ? (
        <p className="opsFoot">No gallery entries{categoryFilter === "all" ? "" : ` for ${labelFor(categoryFilter)}`} yet. Add one from the generated-card candidates below.</p>
      ) : (
        <table className="galleryTable">
          <thead>
            <tr>
              <th scope="col">Preview</th>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Featured</th>
              <th scope="col">Public</th>
              <th scope="col">Rank</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry) => (
              <GalleryEntryRow
                entry={entry}
                featuredCountInCategory={featuredByCategory.get(entry.category) ?? 0}
                key={entry.entryId}
                onSave={saveEntry}
              />
            ))}
          </tbody>
        </table>
      )}

      <h3>Generated card candidates</h3>
      {candidates.length === 0 ? (
        <p className="opsFoot">No generated cards yet. Once customers generate cards, they appear here with an automatic category.</p>
      ) : (
        <ul className="opsFacts" aria-label="Generated card candidates">
          {candidates.slice(0, 10).map((candidate) => (
            <li key={candidate.sourceDraftId}>
              <span>
                {String(candidate.draftInput?.occasion ?? "card")} · category {labelFor(candidate.derivedCategory)} ·{" "}
                {candidate.updatedAtIso?.slice(0, 10) ?? "recent"}
              </span>
              <button
                aria-label={`Add ${labelFor(candidate.derivedCategory)} candidate to gallery`}
                className="btn btn-ghost btn-sm"
                onClick={() => addCandidateToGallery(candidate)}
                type="button"
              >
                Add to gallery
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GalleryEntryRow({
  entry,
  featuredCountInCategory,
  onSave
}: {
  entry: GalleryEntry;
  featuredCountInCategory: number;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(entry.title);
  const [caption, setCaption] = useState(entry.publicCaption);
  const [category, setCategory] = useState(entry.category);
  const [rank, setRank] = useState(String(entry.featuredRank));

  useEffect(() => {
    setTitle(entry.title);
    setCaption(entry.publicCaption);
    setCategory(entry.category);
    setRank(String(entry.featuredRank));
  }, [entry.category, entry.entryId, entry.featuredRank, entry.publicCaption, entry.title]);

  function buildBody(patch: Partial<GalleryEntry>) {
    return {
      entryId: entry.entryId,
      sourceDraftId: entry.sourceDraftId,
      projectId: entry.projectId,
      category,
      title,
      publicCaption: caption,
      featured: entry.featured,
      publicApproved: entry.publicApproved,
      featuredRank: Number(rank) || 100,
      ...patch
    };
  }

  return (
    <tr>
      <td>
        {entry.frontSvg ? (
          <img
            alt={`${entry.title} preview`}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(entry.frontSvg)}`}
            style={{ width: 56, height: 78, objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          <span aria-hidden="true">—</span>
        )}
      </td>
      <td>
        <label>
          <span className="visually-hidden">Public title for {entry.entryId}</span>
          <input onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label>
          <span className="visually-hidden">Public caption for {entry.entryId}</span>
          <input onChange={(event) => setCaption(event.target.value)} value={caption} />
        </label>
      </td>
      <td>
        <label>
          <span className="visually-hidden">Category for {entry.entryId}</span>
          <select onChange={(event) => setCategory(event.target.value)} value={category}>
            {galleryCategories.map((candidate) => (
              <option key={candidate} value={candidate}>
                {labelFor(candidate)}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <button
          aria-label={entry.featured ? `Unfeature ${entry.title}` : `Feature ${entry.title}`}
          aria-pressed={entry.featured}
          className="btn btn-ghost btn-sm"
          onClick={() => void onSave(buildBody({ featured: !entry.featured }))}
          type="button"
        >
          <Star size={14} fill={entry.featured ? "currentColor" : "none"} />
          {entry.featured ? "Featured" : "Feature"}
        </button>
        {entry.featured && featuredCountInCategory > 1 ? <small> carousel ×{featuredCountInCategory}</small> : null}
      </td>
      <td>
        <button
          aria-label={entry.publicApproved ? `Revoke public approval for ${entry.title}` : `Approve ${entry.title} for public gallery`}
          aria-pressed={entry.publicApproved}
          className="btn btn-ghost btn-sm"
          onClick={() => void onSave(buildBody({ publicApproved: !entry.publicApproved }))}
          type="button"
        >
          {entry.publicApproved ? "Public" : "Private"}
        </button>
      </td>
      <td>
        <label>
          <span className="visually-hidden">Featured rank for {entry.entryId}</span>
          <input
            inputMode="numeric"
            onChange={(event) => setRank(event.target.value)}
            style={{ width: 56 }}
            value={rank}
          />
        </label>
      </td>
      <td>
        <button
          aria-label={`Save changes to ${entry.title}`}
          className="btn btn-primary btn-sm"
          onClick={() => void onSave(buildBody({}))}
          type="button"
        >
          Save
        </button>
        <button
          aria-label={`Remove ${entry.title} from gallery`}
          className="btn btn-ghost btn-sm"
          onClick={() => void onSave({ entryId: entry.entryId, remove: true })}
          type="button"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

function labelFor(category: string): string {
  return category
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}
