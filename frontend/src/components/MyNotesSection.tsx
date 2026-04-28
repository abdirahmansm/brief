"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { NoteItem } from "@/types/workspace";

interface MyNotesSectionProps {
  notes: NoteItem[];
  loadingNotes: boolean;
  onCreateNote: (title: string, content?: string) => Promise<void>;
}

function formatDate(date: Date | null): string {
  if (!date) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function MyNotesSection({
  notes,
  loadingNotes,
  onCreateNote,
}: MyNotesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateNote = async () => {
    setError("");
    if (!title.trim()) {
      setError("Note title is required.");
      return;
    }

    setSaving(true);
    try {
      await onCreateNote(title, content);
      setTitle("");
      setContent("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Notes</h1>
          <p className="mt-1 text-sm text-muted">
            Capture insights, reminders, and strategy ideas.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(139,92,246,0.22)] hover:opacity-95"
        >
          New Note
        </button>
      </div>

      <div className="glass-panel mb-6 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Total Notes</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{notes.length}</p>
      </div>

      {loadingNotes ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[var(--muted-foreground)]">
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.45)] p-12 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">No notes yet</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Start by creating your first note.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <article key={note.id} className="glass-panel rounded-2xl p-4">
              <h2 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">{note.title}</h2>
              <p className="mt-2 line-clamp-4 text-sm text-[var(--muted-foreground)]">
                {note.content?.trim() || "No additional content."}
              </p>
              <p className="mt-4 text-xs text-[var(--muted-foreground)]">Created {formatDate(note.createdAt)}</p>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Create New Note"
        onClose={() => !saving && setModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Q2 campaign ideas"
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Content (optional)
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your note..."
              rows={4}
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-xl border border-[rgba(139,92,246,0.2)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNote}
              disabled={saving}
              className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
