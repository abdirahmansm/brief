"use client";

import { useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { FileItem, FolderItem } from "@/types/workspace";

interface MyFilesSectionProps {
  folders: FolderItem[];
  files: FileItem[];
  loadingFolders: boolean;
  loadingFiles: boolean;
  onCreateFolder: (name: string) => Promise<void>;
  onUploadFile: (input: {
    file: File;
    folderId?: string;
    onProgress?: (progress: number) => void;
  }) => Promise<void>;
  onDeleteFile: (file: FileItem) => Promise<void>;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function readableFileType(type: string): string {
  if (!type) return "Unknown";
  if (type.includes("/")) {
    const [, subtype] = type.split("/");
    return subtype || type;
  }
  return type;
}

export default function MyFilesSection({
  folders,
  files,
  loadingFolders,
  loadingFiles,
  onCreateFolder,
  onUploadFile,
  onDeleteFile,
}: MyFilesSectionProps) {
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [fileModalOpen, setFileModalOpen] = useState(false);

  const [folderName, setFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFolderId, setFileFolderId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [folderError, setFolderError] = useState("");
  const [fileError, setFileError] = useState("");
  const [filesActionError, setFilesActionError] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const folderById = useMemo(() => {
    const map = new Map<string, FolderItem>();
    folders.forEach((folder) => map.set(folder.id, folder));
    return map;
  }, [folders]);

  const loading = loadingFolders || loadingFiles;

  const handleCreateFolder = async () => {
    setFolderError("");
    const trimmed = folderName.trim();
    if (!trimmed) {
      setFolderError("Folder name is required.");
      return;
    }

    setFolderSaving(true);
    try {
      await onCreateFolder(trimmed);
      setFolderName("");
      setFolderModalOpen(false);
    } catch (error) {
      setFolderError(
        error instanceof Error ? error.message : "Could not create folder."
      );
    } finally {
      setFolderSaving(false);
    }
  };

  const handleCreateFile = async () => {
    setFileError("");
    if (!selectedFile) {
      setFileError("Please choose a file to upload.");
      return;
    }

    setFileSaving(true);
    setUploadProgress(0);
    try {
      await onUploadFile({
        file: selectedFile,
        folderId: fileFolderId || undefined,
        onProgress: (progress) => setUploadProgress(progress),
      });
      setSelectedFile(null);
      setFileFolderId("");
      setUploadProgress(0);
      setFileModalOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not add file.");
    } finally {
      setFileSaving(false);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    setFilesActionError("");
    setDeletingFileId(file.id);
    try {
      await onDeleteFile(file);
    } catch (error) {
      setFilesActionError(
        error instanceof Error ? error.message : "Could not delete file."
      );
    } finally {
      setDeletingFileId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Files</h1>
          <p className="mt-1 text-sm text-muted">
            Organize project assets with folders and metadata files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFolderModalOpen(true)}
            className="rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)]"
          >
            New Folder
          </button>
          <button
            onClick={() => setFileModalOpen(true)}
            className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(139,92,246,0.22)] hover:opacity-95"
          >
            Add File
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Folders</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{folders.length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Files</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{files.length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Storage</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {formatBytes(files.reduce((sum, file) => sum + file.size, 0))}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-[var(--muted-foreground)]">
          Loading files...
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.45)] p-12 text-center">
          <p className="text-base font-medium text-[var(--foreground)]">No files yet</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Create your first folder or add a file to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Folders
            </h2>
            {folders.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No folders created yet.</p>
            ) : (
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">{folder.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Created {formatDate(folder.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Files
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No files added yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[rgba(139,92,246,0.16)]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[rgba(139,92,246,0.08)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(139,92,246,0.14)]">
                    {files.map((file) => (
                      <tr key={file.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--foreground)]">{file.name}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {file.folderId && folderById.get(file.folderId)
                              ? `Folder: ${folderById.get(file.folderId)?.name}`
                              : "No folder"}
                            {` • Added ${formatDate(file.createdAt)}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{readableFileType(file.type)}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatBytes(file.size)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={file.downloadURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-[rgba(139,92,246,0.16)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)]"
                            >
                              Download
                            </a>
                            <button
                              onClick={() => handleDeleteFile(file)}
                              disabled={deletingFileId === file.id}
                              className="rounded-lg border border-red-300/50 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {deletingFileId === file.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filesActionError && (
              <p className="mt-3 text-sm text-red-500">{filesActionError}</p>
            )}
          </div>
        </div>
      )}

      <Modal
        open={folderModalOpen}
        title="Create New Folder"
        onClose={() => !folderSaving && setFolderModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Folder name
            </label>
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="e.g. Competitor Research"
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          {folderError && <p className="text-sm text-red-500">{folderError}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFolderModalOpen(false)}
              disabled={folderSaving}
              className="rounded-xl border border-[rgba(139,92,246,0.2)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={folderSaving}
              className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {folderSaving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={fileModalOpen}
        title="Upload File"
        onClose={() => !fileSaving && setFileModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="upload-file-input" className="mb-1.5 block text-sm font-medium text-foreground">
              Select file
            </label>
            <input
              id="upload-file-input"
              ref={fileInputRef}
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              title="Select file to upload"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)]"
            >
              {selectedFile ? selectedFile.name : "Choose a file"}
            </button>
            {selectedFile && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {readableFileType(selectedFile.type || "Unknown")} • {formatBytes(selectedFile.size)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="upload-folder-select" className="mb-1.5 block text-sm font-medium text-foreground">
              Folder (optional)
            </label>
            <select
              id="upload-folder-select"
              value={fileFolderId}
              onChange={(event) => setFileFolderId(event.target.value)}
              title="Choose target folder"
              className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Upload progress
            </label>
            <progress
              value={uploadProgress}
              max={100}
              className="h-2 w-full overflow-hidden rounded-full [accent-color:oklch(0.55_0.24_262)]"
            />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{uploadProgress}%</p>
          </div>

          {fileError && <p className="text-sm text-red-500">{fileError}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setFileModalOpen(false)}
              disabled={fileSaving}
              className="rounded-xl border border-[rgba(139,92,246,0.2)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFile}
              disabled={fileSaving}
              className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {fileSaving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
