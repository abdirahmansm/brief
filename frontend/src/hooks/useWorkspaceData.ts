"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  FileItem,
  FolderItem,
  NoteItem,
  TeamMemberItem,
} from "@/types/workspace";

interface UploadFileInput {
  file: File;
  folderId?: string;
  onProgress?: (progress: number) => void;
}

function timestampToDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export function useWorkspaceData(user: User | null) {
  const uid = user?.uid ?? null;

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);

  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(true);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const foldersQuery = query(
      collection(db, "users", uid, "folders"),
      orderBy("createdAt", "desc")
    );
    const filesQuery = query(
      collection(db, "users", uid, "files"),
      orderBy("createdAt", "desc")
    );
    const notesQuery = query(
      collection(db, "users", uid, "notes"),
      orderBy("createdAt", "desc")
    );
    const membersQuery = query(
      collection(db, "users", uid, "teamMembers"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
      setFolders(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: String(doc.data().name ?? "Untitled Folder"),
          createdAt: timestampToDate(doc.data().createdAt),
        }))
      );
      setLoadingFolders(false);
    });

    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      setFiles(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: String(doc.data().name ?? "Untitled File"),
          storagePath: String(doc.data().storagePath ?? ""),
          downloadURL: String(doc.data().downloadURL ?? ""),
          folderId: doc.data().folderId ? String(doc.data().folderId) : undefined,
          size: Number(doc.data().size ?? 0),
          type: String(doc.data().type ?? "application/octet-stream"),
          createdAt: timestampToDate(doc.data().createdAt),
        }))
      );
      setLoadingFiles(false);
    });

    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      setNotes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: String(doc.data().title ?? "Untitled Note"),
          content: doc.data().content ? String(doc.data().content) : undefined,
          createdAt: timestampToDate(doc.data().createdAt),
        }))
      );
      setLoadingNotes(false);
    });

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      setTeamMembers(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: String(doc.data().name ?? "Unnamed Member"),
          role: doc.data().role ? String(doc.data().role) : undefined,
          createdAt: timestampToDate(doc.data().createdAt),
        }))
      );
      setLoadingTeamMembers(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
      unsubscribeNotes();
      unsubscribeMembers();
    };
  }, [uid]);

  const folderMap = useMemo(() => {
    const map = new Map<string, FolderItem>();
    folders.forEach((folder) => {
      map.set(folder.id, folder);
    });
    return map;
  }, [folders]);

  const createFolder = async (name: string) => {
    if (!uid) return;
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Folder name is required.");
    }
    await addDoc(collection(db, "users", uid, "folders"), {
      name: trimmed,
      createdAt: serverTimestamp(),
    });
  };

  const uploadFile = async (input: UploadFileInput) => {
    if (!uid) {
      throw new Error("You must be logged in to upload files.");
    }

    const rawName = input.file.name.trim();
    if (!rawName) {
      throw new Error("Please choose a file first.");
    }

    const fileDocRef = doc(collection(db, "users", uid, "files"));
    const safeName = rawName.replace(/[\\/]/g, "_");
    const storagePath = `user_uploads/${uid}/${safeName}`;
    const fileRef = ref(storage, storagePath);

    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, input.file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (!input.onProgress) return;
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          input.onProgress(progress);
        },
        (error) => reject(error),
        () => resolve()
      );
    });

    const downloadURL = await getDownloadURL(fileRef);

    await setDoc(fileDocRef, {
      name: input.file.name,
      storagePath,
      downloadURL,
      size: input.file.size,
      type: input.file.type || "application/octet-stream",
      folderId: input.folderId?.trim() || null,
      createdAt: serverTimestamp(),
    });
  };

  const deleteFile = async (file: FileItem) => {
    if (!uid) {
      throw new Error("You must be logged in to delete files.");
    }
    if (!file.storagePath) {
      throw new Error("Missing storage path for this file.");
    }

    await deleteObject(ref(storage, file.storagePath));
    await deleteDoc(doc(db, "users", uid, "files", file.id));
  };

  const createNote = async (title: string, content?: string) => {
    if (!uid) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error("Note title is required.");
    }

    await addDoc(collection(db, "users", uid, "notes"), {
      title: trimmedTitle,
      content: content?.trim() || "",
      createdAt: serverTimestamp(),
    });
  };

  const createTeamMember = async (name: string, role?: string) => {
    if (!uid) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Member name is required.");
    }

    await addDoc(collection(db, "users", uid, "teamMembers"), {
      name: trimmedName,
      role: role?.trim() || "",
      createdAt: serverTimestamp(),
    });
  };

  return {
    folders: uid ? folders : [],
    files: uid ? files : [],
    notes: uid ? notes : [],
    teamMembers: uid ? teamMembers : [],
    folderMap,
    loadingFolders: uid ? loadingFolders : false,
    loadingFiles: uid ? loadingFiles : false,
    loadingNotes: uid ? loadingNotes : false,
    loadingTeamMembers: uid ? loadingTeamMembers : false,
    createFolder,
    uploadFile,
    deleteFile,
    createNote,
    createTeamMember,
  };
}
