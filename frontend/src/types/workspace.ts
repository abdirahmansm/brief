export interface FolderItem {
  id: string;
  name: string;
  createdAt: Date | null;
}

export interface FileItem {
  id: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  folderId?: string;
  size: number;
  type: string;
  createdAt: Date | null;
}

export interface NoteItem {
  id: string;
  title: string;
  content?: string;
  createdAt: Date | null;
}

export interface TeamMemberItem {
  id: string;
  name: string;
  role?: string;
  createdAt: Date | null;
}
