import { ArrowRight, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import type { CardHistoryEntry, MemoryItem } from "../../src/freeMvp";
import { Field } from "../ui";

interface PersonProfile {
  recipient: string;
  notes: MemoryItem[];
  cardCount: number;
  lastCardLabel?: string;
}

function buildPeople(memories: MemoryItem[], history: CardHistoryEntry[]): PersonProfile[] {
  const byRecipient = new Map<string, PersonProfile>();
  const ensure = (recipient: string): PersonProfile => {
    const key = recipient.trim();
    let person = byRecipient.get(key.toLowerCase());
    if (!person) {
      person = { recipient: key, notes: [], cardCount: 0 };
      byRecipient.set(key.toLowerCase(), person);
    }
    return person;
  };
  for (const memory of memories) {
    ensure(memory.recipient).notes.push(memory);
  }
  for (const entry of history) {
    const person = ensure(entry.recipient);
    person.cardCount += 1;
    person.lastCardLabel = `${entry.occasion} · ${entry.exportedAtIso.slice(0, 10)}`;
  }
  return [...byRecipient.values()].sort((first, second) => first.recipient.localeCompare(second.recipient));
}

/**
 * People: every recipient you've made cards for, with the saved details that
 * shape future messages. Details are saved only when you choose to save them.
 */
export function PeopleView({
  form,
  history,
  isSignedIn,
  memories,
  onAdd,
  onDelete,
  onForm,
  onMakeCard
}: {
  form: { recipient: string; note: string };
  history: CardHistoryEntry[];
  isSignedIn: boolean;
  memories: MemoryItem[];
  onAdd: (saveToAccount: boolean) => void;
  onDelete: (memoryId: string) => void;
  onForm: (form: { recipient: string; note: string }) => void;
  onMakeCard: (recipient: string) => void;
}) {
  const [saveToAccount, setSaveToAccount] = useState(false);
  const canAdd = form.recipient.trim().length > 0 && form.note.trim().length > 0;
  const people = buildPeople(memories, history);

  return (
    <>
      <header className="pagehead reveal">
        <h1>People</h1>
        <p>
          The people you make cards for, and the details that make those cards feel hand-written.
          {isSignedIn ? "" : " As a guest, your work lasts until you close or refresh this tab — sign in to keep it."}
        </p>
      </header>

      <div className="notes">
        <section className="panelcard noteform reveal reveal-1">
          <h2>Save a personal detail</h2>
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
          <div className="switchrow">
            <div>
              <strong>Save for future cards</strong>
              <small>
                {isSignedIn
                  ? saveToAccount
                    ? "Saved to your account — delete it here whenever you like."
                    : "Off means use once: it shapes your next card only and is never saved to your account."
                  : "Sign in to save details to your account. Until then, details last only for this visit."}
              </small>
            </div>
            <button
              aria-checked={saveToAccount}
              aria-label="Save this detail for future cards"
              className="switch"
              data-on={saveToAccount}
              onClick={() => setSaveToAccount((current) => !current)}
              role="switch"
              type="button"
            />
          </div>
          <div>
            <button className="btn btn-primary" disabled={!canAdd} onClick={() => onAdd(saveToAccount)} type="button">
              Remember this for next time
            </button>
          </div>
        </section>

        {people.length === 0 ? (
          <section className="panelcard emptyhub reveal reveal-2">
            <p>No people saved yet. Save approved details after your first card, and recipients will appear here.</p>
          </section>
        ) : (
          <div className="peoplelist reveal reveal-2">
            {people.map((person) => (
              <article className="panelcard personcard" key={person.recipient}>
                <div className="personhead">
                  <span className="personicon">
                    <UserRound size={17} />
                  </span>
                  <div>
                    <strong>{person.recipient}</strong>
                    <small>
                      {person.cardCount > 0
                        ? `${person.cardCount} card${person.cardCount === 1 ? "" : "s"} · last: ${person.lastCardLabel}`
                        : "No cards yet"}
                    </small>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => onMakeCard(person.recipient)} type="button">
                    Make a card
                    <ArrowRight size={14} />
                  </button>
                </div>
                {person.notes.length > 0 ? (
                  <ul className="personnotes">
                    {person.notes.map((note) => (
                      <li key={note.id}>
                        <p>{note.note}</p>
                        <button
                          aria-label={`Delete detail about ${person.recipient}`}
                          className="notedelete"
                          onClick={() => onDelete(note.id)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
