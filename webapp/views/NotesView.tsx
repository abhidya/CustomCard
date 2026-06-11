import { ArrowRight, Trash2 } from "lucide-react";
import type { CardDraft, MemoryItem } from "../../src/freeMvp";
import { Field, PanelArt } from "../ui";

/** "My cards" hub: card in progress, personal details (notes), and account-backed history. */
export function NotesView({
  draft,
  hasProgress,
  isSignedIn,
  memories,
  form,
  onForm,
  onAdd,
  onDelete,
  onResume
}: {
  draft: CardDraft;
  hasProgress: boolean;
  isSignedIn: boolean;
  memories: MemoryItem[];
  form: { recipient: string; note: string };
  onForm: (form: { recipient: string; note: string }) => void;
  onAdd: () => void;
  onDelete: (memoryId: string) => void;
  onResume: () => void;
}) {
  const canAdd = form.recipient.trim().length > 0 && form.note.trim().length > 0;

  return (
    <>
      <header className="pagehead reveal">
        <h1>Your cards</h1>
        <p>
          Cards in progress and the personal details that make them feel hand-written.
          {isSignedIn ? "" : " Everything stays on this device until you sign in."}
        </p>
      </header>

      {hasProgress ? (
        <button className="resume reveal reveal-1" onClick={onResume} type="button">
          <PanelArt panel={draft.panels[0]} />
          <span>
            <span className="resume-kicker">In progress</span>
            <strong>{draft.panels[0].headline}</strong>
            <span>Keep designing</span>
          </span>
          <ArrowRight className="resume-arrow" size={20} />
        </button>
      ) : null}

      <div className="notes" style={{ marginTop: hasProgress ? 26 : 0 }}>
        <section className="panelcard noteform reveal reveal-2">
          <h2>Add a personal detail</h2>
          <Field label="Who it's about">
            <input
              onChange={(event) => onForm({ ...form, recipient: event.target.value })}
              placeholder="Sara, Mom, the Khan family…"
              value={form.recipient}
            />
          </Field>
          <Field label="The detail">
            <textarea
              onChange={(event) => onForm({ ...form, note: event.target.value })}
              placeholder="She still laughs about the burnt birthday pancakes."
              value={form.note}
            />
          </Field>
          <div>
            <button className="btn btn-primary" disabled={!canAdd} onClick={onAdd} type="button">
              Save detail
            </button>
          </div>
        </section>

        <div className="notelist reveal reveal-3">
          {memories.length === 0 ? (
            <div className="panelcard emptynotes">
              Nothing saved yet. Nicknames, shared memories, and inside jokes you keep here shape every future card.
            </div>
          ) : (
            memories.map((memory) => (
              <article className="panelcard notecard" key={memory.id}>
                <div className="notecard-body">
                  <strong>{memory.recipient}</strong>
                  <p>{memory.note}</p>
                </div>
                <button
                  aria-label={`Delete detail about ${memory.recipient}`}
                  className="notedelete"
                  onClick={() => onDelete(memory.id)}
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}
