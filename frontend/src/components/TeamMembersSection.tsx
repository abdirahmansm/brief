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
          className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(139,92,246,0.22)] hover:opacity-95"
        >
          Add Member
        </button>
      </div>

      <div className="glass-panel mb-6 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Team Size</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{members.length}</p>
      </div>

      {loadingMembers ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[var(--muted-foreground)]">
          Loading team members...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.45)] p-12 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">No team members yet</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Add your first team member to start collaborating.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.52)] p-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(139,92,246,0.14)] text-sm font-semibold text-[var(--accent)]">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{member.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{member.role?.trim() || "No role set"}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Added {formatDate(member.createdAt)}</p>
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
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
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
              onClick={handleCreateMember}
              disabled={saving}
              className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
