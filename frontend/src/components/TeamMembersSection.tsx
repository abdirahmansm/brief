"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { TeamMemberItem } from "@/types/workspace";

interface TeamMembersSectionProps {
  members: TeamMemberItem[];
  loadingMembers: boolean;
  onCreateMember: (name: string, role?: string) => Promise<void>;
}

function formatDate(date: Date | null): string {
  if (!date) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function TeamMembersSection({
  members,
  loadingMembers,
  onCreateMember,
}: TeamMembersSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateMember = async () => {
    setError("");
    if (!name.trim()) {
      setError("Member name is required.");
      return;
    }

    setSaving(true);
    try {
      await onCreateMember(name, role);
      setName("");
      setRole("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team Members</h1>
          <p className="mt-1 text-sm text-muted">
            Keep a lightweight roster of collaborators.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Add Member
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Team Size</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{members.length}</p>
      </div>

      {loadingMembers ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted">
          Loading team members...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-base font-medium text-foreground">No team members yet</p>
          <p className="mt-2 text-sm text-muted">
            Add your first team member to start collaborating.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted">{member.role?.trim() || "No role set"}</p>
                </div>
              </div>
              <p className="text-xs text-muted">Added {formatDate(member.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title="Add Team Member"
        onClose={() => !saving && setModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Fatima Noor"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Role (optional)
            </label>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Growth Lead"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMember}
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
