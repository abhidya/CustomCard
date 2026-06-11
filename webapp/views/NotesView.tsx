import { Trash2 } from "lucide-react";
import type { MemoryItem } from "../../src/freeMvp";
import { Field } from "../ui";

export function NotesView({
  memories,
  form,
  onForm,
  onAdd,
  onDelete
}: {
  memories: MemoryItem[];
  form: { recipient: string; note: string };
  onForm: (form: { recipient: string; note: string }) => void;
  onAdd: () => void;
  onDelete: (memoryId: string) => void;
}) {
  const canAdd = form.recipient.trim().length > 0 && form.note.trim().length > 0;

  return (
    <>
      <header className="pagehead reveal">
        <h1>Little things worth remembering</h1>
        <p>Nicknames, shared memories, what they love. Notes stay on this device and shape future cards.</p>
      </header>

      <div className="notes">
        <section className="panelcard noteform reveal reveal-1">
          <h2>Save a note</h2>
          <Field label="Who it's about">
            <input
              onChange={(event) => onForm({ ...form, recipient: event.target.value })}
              placeholder="Sara, Mom, the Khan family…"
              value={form.recipient}
            />
          </Field>
          <Field label="The note">
            <textarea
              onChange={(event) => onForm({ ...form, note: event.target.value })}
              placeholder="She still laughs about the burnt birthday pancakes."
              value={form.note}
            />
          </Field>
          <div>
            <button className="btn btn-primary" disabled={!canAdd} onClick={onAdd} type="button">
              Save note
            </button>
          </div>
        </section>

        <div className="notelist reveal reveal-2">
          {memories.length === 0 ? (
            <div className="panelcard emptynotes">
              No notes yet. The small details you save here make every card feel hand-written.
            </div>
          ) : (
            memories.map((memory) => (
              <article className="panelcard notecard" key={memory.id}>
                <div className="notecard-body">
                  <strong>{memory.recipient}</strong>
                  <p>{memory.note}</p>
                </div>
                <button
                  aria-label={`Delete note about ${memory.recipient}`}
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
