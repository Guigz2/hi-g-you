"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { STORAGE_BUCKET } from "@/lib/storage/config";

// Auto rename utility (pattern: "name (n).ext")
function autoRename(base: string, existing: Set<string>): string {
  if (!existing.has(base.toLowerCase())) return base;
  const dot = base.lastIndexOf(".");
  const stem = dot === -1 ? base : base.slice(0, dot);
  const ext = dot === -1 ? "" : base.slice(dot);
  let i = 1;
  while (existing.has(`${stem} (${i})${ext}`.toLowerCase())) i++;
  return `${stem} (${i})${ext}`;
}

// Slugify filename segment for storage key safety (keep original name separately)
function sanitizeForStorage(name: string): string {
  // Remove leading/trailing spaces
  let base = name.trim();
  // Normalize accents
  base = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Replace forbidden / risky chars except dot, dash, underscore
  base = base.replace(/[^A-Za-z0-9._-]+/g, "-");
  // Collapse consecutive dashes
  base = base.replace(/-+/g, "-");
  // Limit length
  if (base.length > 120) base = base.slice(0, 120);
  // Prevent empty
  if (!base) base = "file";
  return base;
}

export async function createFolder(parentId: string | null, name: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  name = name.trim();
  if (!name) throw new Error("Nom requis");

  // Récupérer siblings actifs pour éviter collisions
  let siblingsQuery = supabase
    .from("folders")
    .select("name")
    .eq("user_id", user.id)
    .eq("is_trashed", false);
  if (parentId === null) {
    siblingsQuery = siblingsQuery.is("parent_id", null);
  } else {
    siblingsQuery = siblingsQuery.eq("parent_id", parentId);
  }
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).map(s => s.name.toLowerCase()));
  const finalName = autoRename(name, existing);

  // Calcul path parent
  let parentPath = "/";
  if (parentId) {
    const { data: parent } = await supabase
      .from("folders")
      .select("path")
      .eq("id", parentId)
      .maybeSingle();
    parentPath = parent?.path || "/";
  }
  const path = parentPath === "/" ? `/${finalName}` : `${parentPath}/${finalName}`;

  const { error } = await supabase.from("folders").insert({ user_id: user.id, parent_id: parentId, name: finalName, path });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { name: finalName, path };
}

export async function listFolder(folderId: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { folders: [], files: [] };
  let foldersQuery = supabase
    .from("folders")
    .select("id,name,path,parent_id")
    .eq("user_id", user.id)
    .eq("is_trashed", false);
  if (folderId === null) foldersQuery = foldersQuery.is("parent_id", null); else foldersQuery = foldersQuery.eq("parent_id", folderId);

  let filesQuery = supabase
    .from("files")
    .select("id,name,ext,mime,size,is_trashed")
    .eq("user_id", user.id)
    .eq("is_trashed", false);
  if (folderId === null) filesQuery = filesQuery.is("folder_id", null); else filesQuery = filesQuery.eq("folder_id", folderId);

  const [{ data: folders }, { data: files }] = await Promise.all([
    foldersQuery.order("name"),
    filesQuery.order("name"),
  ]);
  return { folders: folders || [], files: files || [] };
}

export async function getFolderBreadcrumb(folderId: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !folderId) return [];

  const { data: folder } = await supabase
    .from("folders")
    .select("id,name,path,parent_id")
    .eq("id", folderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!folder) return [];

  // Parse the path to build breadcrumb
  const pathParts = folder.path.split('/').filter(Boolean);
  const breadcrumb: Array<{ id: string | null; name: string }> = [{ id: null, name: "Mon Drive" }];

  // For each part of the path, we need to find the folder ID
  let currentPath = "";
  for (const part of pathParts) {
    currentPath += "/" + part;
    const { data: pathFolder } = await supabase
      .from("folders")
      .select("id,name")
      .eq("path", currentPath)
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (pathFolder) {
      breadcrumb.push({ id: pathFolder.id, name: pathFolder.name });
    }
  }

  return breadcrumb;
}

export async function uploadMetadata(folderId: string | null, originalName: string, mime: string, size: number) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const nameTrim = originalName.trim();
  const dot = nameTrim.lastIndexOf(".");
  const ext = dot === -1 ? "" : nameTrim.slice(dot + 1).toLowerCase();

  // collisions
  let filesQuery = supabase
    .from("files")
    .select("name")
    .eq("user_id", user.id)
    .eq("is_trashed", false);
  if (folderId === null) filesQuery = filesQuery.is("folder_id", null); else filesQuery = filesQuery.eq("folder_id", folderId);
  const { data: existingFiles } = await filesQuery;
  const existingSet = new Set((existingFiles || []).map(f => f.name.toLowerCase()));
  const finalName = autoRename(nameTrim, existingSet);
  const dot2 = finalName.lastIndexOf(".");
  const extForStorage = dot2 === -1 ? "" : finalName.slice(dot2 + 1);
  const baseForStorage = dot2 === -1 ? finalName : finalName.slice(0, dot2);
  const safeBase = sanitizeForStorage(baseForStorage);
  const safeFileName = extForStorage ? `${safeBase}.${extForStorage}` : safeBase;
  // storage path using uuid + sanitized filename segment
  const storagePath = `${user.id}/${folderId || "root"}/${randomUUID()}-${safeFileName}`;
  const { error } = await supabase.from("files").insert({
    user_id: user.id,
    folder_id: folderId,
    name: finalName,
    ext,
    mime,
    size,
    storage_path: storagePath,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { finalName, storagePath };
}

export async function trashFile(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase
    .from("files")
    .update({ is_trashed: true })
    .match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { id };
}

export async function trashFolder(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // Récupérer chemin du dossier
  const { data: folder, error: fErr } = await supabase
    .from("folders")
    .select("path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!folder) throw new Error("Dossier introuvable");
  const basePath = folder.path;
  // Tous les dossiers descendants
  const { data: descendants } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", user.id)
    .like("path", `${basePath}/%`);
  const allFolderIds = [id, ...(descendants?.map(d => d.id) || [])];
  // Fichiers des dossiers impactés
  const { data: impactedFiles } = await supabase
    .from("files")
    .select("id")
    .eq("user_id", user.id)
    .in("folder_id", allFolderIds);
  const fileIds = impactedFiles?.map(f => f.id) || [];

  if (allFolderIds.length) {
    const { error: upFoldErr } = await supabase
      .from("folders")
      .update({ is_trashed: true })
      .in("id", allFolderIds);
    if (upFoldErr) throw new Error(upFoldErr.message);
  }
  if (fileIds.length) {
    const { error: upFileErr } = await supabase
      .from("files")
      .update({ is_trashed: true })
      .in("id", fileIds);
    if (upFileErr) throw new Error(upFileErr.message);
  }
  revalidatePath("/cloud");
  return { id };
}

export async function listTrash() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { folders: [], files: [] };
  const [{ data: folders }, { data: files }] = await Promise.all([
    supabase.from("folders").select("id,name,parent_id,path").eq("user_id", user.id).eq("is_trashed", true).order("name"),
    supabase.from("files").select("id,name,folder_id,ext,mime,size,storage_path").eq("user_id", user.id).eq("is_trashed", true).order("name"),
  ]);
  return { folders: folders || [], files: files || [] };
}

export async function restoreFile(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // récupérer fichier
  const { data: file, error: fErr } = await supabase
    .from("files")
    .select("id,name,folder_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", true)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!file) throw new Error("Fichier introuvable");
  // collisions actives
  let siblingsQuery = supabase.from("files").select("name").eq("user_id", user.id).eq("is_trashed", false);
  if (file.folder_id === null) siblingsQuery = siblingsQuery.is("folder_id", null); else siblingsQuery = siblingsQuery.eq("folder_id", file.folder_id);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).map(s => s.name.toLowerCase()));
  const finalName = autoRename(file.name, existing);
  const { error: upErr } = await supabase.from("files").update({ is_trashed: false, name: finalName }).eq("id", id);
  if (upErr) throw new Error(upErr.message);
  revalidatePath("/cloud");
  return { id, name: finalName };
}

export async function restoreFolder(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // dossier ciblé
  const { data: folder, error: fErr } = await supabase
    .from("folders")
    .select("id,name,parent_id,path")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", true)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!folder) throw new Error("Dossier introuvable");
  // siblings actifs
  let siblingsQuery = supabase
    .from("folders")
    .select("name")
    .eq("user_id", user.id)
    .eq("is_trashed", false);
  if (folder.parent_id === null) siblingsQuery = siblingsQuery.is("parent_id", null); else siblingsQuery = siblingsQuery.eq("parent_id", folder.parent_id);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).map(s => s.name.toLowerCase()));
  const finalName = autoRename(folder.name, existing);

  // si renommé, recalcul path + descendants
  let newPath = folder.path;
  if (finalName !== folder.name) {
    const parentPath = (() => {
      if (!folder.parent_id) return "/";
      // récupérer parent
      return folder.path.split("/").slice(0, -1).join("/") || "/";
    })();
    newPath = parentPath === "/" ? `/${finalName}` : `${parentPath}/${finalName}`;
    // descendants
    const { data: descendants } = await supabase
      .from("folders")
      .select("id,path")
      .eq("user_id", user.id)
      .like("path", `${folder.path}/%`);
    // mise à jour dossier cible
    const { error: upMainErr } = await supabase.from("folders").update({ name: finalName, path: newPath }).eq("id", id);
    if (upMainErr) throw new Error(upMainErr.message);
    // mise à jour descendants paths
    for (const d of descendants || []) {
      const replaced = d.path.replace(folder.path + "/", newPath + "/");
      await supabase.from("folders").update({ path: replaced }).eq("id", d.id);
    }
  }
  // restaurer dossier + descendants + fichiers
  const { data: allDesc } = await supabase.from("folders").select("id").eq("user_id", user.id).like("path", `${newPath}/%`);
  const folderIds = [id, ...(allDesc?.map(d => d.id) || [])];
  if (folderIds.length) await supabase.from("folders").update({ is_trashed: false }).in("id", folderIds);
  // fichiers
  const { data: impactedFiles } = await supabase.from("files").select("id").eq("user_id", user.id).in("folder_id", folderIds);
  const fileIds = impactedFiles?.map(f => f.id) || [];
  if (fileIds.length) await supabase.from("files").update({ is_trashed: false }).in("id", fileIds);
  revalidatePath("/cloud");
  return { id, name: finalName };
}

export async function purgeTrash() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: trashedFiles } = await supabase
    .from("files")
    .select("id,storage_path")
    .eq("user_id", user.id)
    .eq("is_trashed", true);
  const { data: trashedFolders } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_trashed", true);
  const pathsToRemove = (trashedFiles || []).map(f => f.storage_path);
  if (pathsToRemove.length) {
    await supabase.storage.from(STORAGE_BUCKET).remove(pathsToRemove);
  }
  if (trashedFiles?.length) await supabase.from("files").delete().in("id", trashedFiles.map(f => f.id));
  if (trashedFolders?.length) await supabase.from("folders").delete().in("id", trashedFolders.map(f => f.id));
  revalidatePath("/cloud");
  return { purgedFiles: trashedFiles?.length || 0, purgedFolders: trashedFolders?.length || 0 };
}

// --- Rename & Move utilities ---
export async function renameFile(id: string, newName: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  newName = newName.trim();
  if (!newName) throw new Error("Nom requis");
  const { data: file, error: fErr } = await supabase
    .from("files")
    .select("id,name,folder_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!file) throw new Error("Fichier introuvable");
  let siblingsQuery = supabase.from("files").select("name").eq("user_id", user.id).eq("is_trashed", false);
  if (file.folder_id === null) siblingsQuery = siblingsQuery.is("folder_id", null); else siblingsQuery = siblingsQuery.eq("folder_id", file.folder_id);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).filter(s => s.name.toLowerCase() !== file.name.toLowerCase()).map(s => s.name.toLowerCase()));
  const finalName = autoRename(newName, existing);
  const { error: upErr } = await supabase.from("files").update({ name: finalName }).eq("id", id);
  if (upErr) throw new Error(upErr.message);
  revalidatePath("/cloud");
  return { id, name: finalName };
}

export async function setFolderColor(id: string, color: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase
    .from("folders")
    .update({ color })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { id, color };
}

export async function trashMultipleFiles(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { error } = await supabase
    .from("files")
    .update({ is_trashed: true })
    .in("id", ids)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { ids };
}

export async function trashMultipleFolders(ids: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  
  for (const id of ids) {
    await trashFolder(id);
  }
  
  return { ids };
}

export async function renameFolder(id: string, newName: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  newName = newName.trim();
  if (!newName) throw new Error("Nom requis");
  const { data: folder, error: fErr } = await supabase
    .from("folders")
    .select("id,name,parent_id,path")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!folder) throw new Error("Dossier introuvable");
  let siblingsQuery = supabase.from("folders").select("name").eq("user_id", user.id).eq("is_trashed", false);
  if (folder.parent_id === null) siblingsQuery = siblingsQuery.is("parent_id", null); else siblingsQuery = siblingsQuery.eq("parent_id", folder.parent_id);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).filter(s => s.name.toLowerCase() !== folder.name.toLowerCase()).map(s => s.name.toLowerCase()));
  const finalName = autoRename(newName, existing);
  if (finalName === folder.name) return { id, name: finalName };
  const oldPath = folder.path;
  const parentPath = oldPath.split("/").slice(0, -1).join("/") || "/"; // path includes folder name
  const newPath = parentPath === "/" ? `/${finalName}` : `${parentPath}/${finalName}`;
  // Update folder name/path
  const { error: upMain } = await supabase.from("folders").update({ name: finalName, path: newPath }).eq("id", id);
  if (upMain) throw new Error(upMain.message);
  // Update descendants paths
  const { data: descendants } = await supabase
    .from("folders")
    .select("id,path")
    .eq("user_id", user.id)
    .like("path", `${oldPath}/%`);
  for (const d of descendants || []) {
    const replaced = d.path.replace(oldPath + "/", newPath + "/");
    await supabase.from("folders").update({ path: replaced }).eq("id", d.id);
  }
  revalidatePath("/cloud");
  return { id, name: finalName };
}

async function resolveFolderPathRaw(userId: string, path: string) {
  if (path === "/" || path.trim() === "") return null;
  const supabase = await createSupabaseServerClient();
  const { data: folder } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", userId)
    .eq("path", path)
    .maybeSingle();
  return folder?.id || null;
}

export async function moveFile(id: string, targetParentPath: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: file, error: fErr } = await supabase
    .from("files")
    .select("id,name,folder_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!file) throw new Error("Fichier introuvable");
  const targetFolderId = await resolveFolderPathRaw(user.id, targetParentPath.trim());
  // collisions in target
  let siblingsQuery = supabase.from("files").select("name").eq("user_id", user.id).eq("is_trashed", false);
  if (targetFolderId === null) siblingsQuery = siblingsQuery.is("folder_id", null); else siblingsQuery = siblingsQuery.eq("folder_id", targetFolderId);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).map(s => s.name.toLowerCase()));
  const finalName = autoRename(file.name, existing);
  const { error: upErr } = await supabase
    .from("files")
    .update({ folder_id: targetFolderId, name: finalName })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);
  revalidatePath("/cloud");
  return { id, name: finalName, folder_id: targetFolderId };
}

export async function moveFolder(id: string, targetParentPath: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: folder, error: fErr } = await supabase
    .from("folders")
    .select("id,name,parent_id,path")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!folder) throw new Error("Dossier introuvable");
  const targetPathTrim = targetParentPath.trim();
  const newParentId = await resolveFolderPathRaw(user.id, targetPathTrim);
  // Safety: cannot move into own subtree
  if (targetPathTrim.startsWith(folder.path + "/")) throw new Error("Impossible de déplacer dans un sous-dossier du dossier lui-même");
  // Siblings collisions in new parent
  let siblingsQuery = supabase.from("folders").select("name").eq("user_id", user.id).eq("is_trashed", false);
  if (newParentId === null) siblingsQuery = siblingsQuery.is("parent_id", null); else siblingsQuery = siblingsQuery.eq("parent_id", newParentId);
  const { data: siblings } = await siblingsQuery;
  const existing = new Set((siblings || []).map(s => s.name.toLowerCase()));
  const finalName = autoRename(folder.name, existing);
  // Build new path
  const parentPath = targetPathTrim === "/" || targetPathTrim === "" ? "/" : targetPathTrim;
  const newPath = parentPath === "/" ? `/${finalName}` : `${parentPath}/${finalName}`;
  const oldPath = folder.path;
  // Update folder record
  const { error: upMain } = await supabase
    .from("folders")
    .update({ parent_id: newParentId, name: finalName, path: newPath })
    .eq("id", id);
  if (upMain) throw new Error(upMain.message);
  // Update descendants
  const { data: descendants } = await supabase
    .from("folders")
    .select("id,path")
    .eq("user_id", user.id)
    .like("path", `${oldPath}/%`);
  for (const d of descendants || []) {
    const replaced = d.path.replace(oldPath + "/", newPath + "/");
    await supabase.from("folders").update({ path: replaced }).eq("id", d.id);
  }
  revalidatePath("/cloud");
  return { id, name: finalName, parent_id: newParentId };
}

// --- Tags management ---
const TAG_COLORS = ["blue","green","red","yellow","purple","pink","indigo","gray"] as const;
type TagColor = typeof TAG_COLORS[number];

function validateTagColor(color: string): TagColor {
  const c = color.trim().toLowerCase();
  if ((TAG_COLORS as readonly string[]).includes(c)) return c as TagColor;
  throw new Error("Couleur invalide (utiliser: " + TAG_COLORS.join(", ") + ")");
}

export async function listTags() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("tags")
    .select("id,name,color")
    .eq("user_id", user.id)
    .order("name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTag(name: string, color: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  name = name.trim();
  if (!name) throw new Error("Nom requis");
  const finalColor = validateTagColor(color);
  // collision nom (par user)
  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", name);
  if (existing && existing.length) throw new Error("Tag existe déjà");
  const { error } = await supabase.from("tags").insert({ user_id: user.id, name, color: finalColor });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { name, color: finalColor };
}

export async function updateTag(id: string, name: string, color: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  name = name.trim();
  if (!name) throw new Error("Nom requis");
  const finalColor = validateTagColor(color);
  const { error } = await supabase
    .from("tags")
    .update({ name, color: finalColor })
    .match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { id, name, color: finalColor };
}

export async function deleteTag(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // supprimer liaisons (table file_tags sans user_id)
  await supabase.from("file_tags").delete().eq("tag_id", id);
  const { error } = await supabase.from("tags").delete().match({ id, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { id };
}

export async function getFileWithTags(fileId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: file, error: fErr } = await supabase
    .from("files")
    .select("id,name,ext,mime,size,folder_id")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!file) return null;
  // Join file_tags -> tags, filtrer tags par user
  const { data: tagLinks } = await supabase
    .from("file_tags")
    .select("tag_id, tags(id,name,color,user_id)")
    .eq("file_id", fileId)
    .eq("tags.user_id", user.id);
  const tags = (tagLinks || []).map((t: any) => t.tags).filter((t: any) => t && t.user_id === user.id).map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
  return { ...file, tags };
}

export async function getFileMeta(fileId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: file, error } = await supabase
    .from("files")
    .select("id,name,ext,mime,size,storage_path")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!file) throw new Error("Fichier introuvable");
  return file;
}

// Download URL (signed if private bucket, fallback public if bucket is public)
export async function getDownloadUrl(fileId: string, expiresIn: number = 600) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: file, error } = await supabase
    .from("files")
    .select("id,name,storage_path,user_id")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!file) throw new Error("Fichier introuvable");
  const { data, error: signErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, expiresIn, { download: file.name });
  if (data?.signedUrl) return { url: data.signedUrl };
  // Fallback to public URL (works only if bucket is public)
  const pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(file.storage_path, { download: file.name });
  if (pub?.data?.publicUrl) return { url: pub.data.publicUrl };
  throw new Error(signErr?.message || "Impossible de générer l'URL de téléchargement");
}

// Generate signed URL (server-side) with clearer errors

export async function assignTag(fileId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // Vérifier que fichier et tag appartiennent bien à user
  const { data: file, error: fErr } = await supabase.from("files").select("id").eq("id", fileId).eq("user_id", user.id).eq("is_trashed", false).maybeSingle();
  if (fErr) throw new Error(fErr.message);
  if (!file) throw new Error("Fichier introuvable");
  const { data: tag, error: tErr } = await supabase.from("tags").select("id").eq("id", tagId).eq("user_id", user.id).maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!tag) throw new Error("Tag introuvable");
  // Vérifier existence relation
  const { data: existing } = await supabase
    .from("file_tags")
    .select("file_id")
    .eq("file_id", fileId)
    .eq("tag_id", tagId)
    .limit(1);
  if (existing && existing.length) return { fileId, tagId, status: "already" };
  const { error } = await supabase.from("file_tags").insert({ file_id: fileId, tag_id: tagId });
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { fileId, tagId };
}

export async function removeTag(fileId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  // Vérifier que fichier appartient à user (sécurité)
  const { data: file } = await supabase.from("files").select("id").eq("id", fileId).eq("user_id", user.id).maybeSingle();
  if (!file) throw new Error("Fichier introuvable ou accès interdit");
  const { error } = await supabase
    .from("file_tags")
    .delete()
    .eq("file_id", fileId)
    .eq("tag_id", tagId);
  if (error) throw new Error(error.message);
  revalidatePath("/cloud");
  return { fileId, tagId };
}

// --- Search Files ---
interface SearchOptions { q?: string; tagIds?: string[]; mimePrefix?: string | null; limit?: number; }
export async function searchFiles(opts: SearchOptions) {
  const { q = "", tagIds = [], mimePrefix = null, limit = 50 } = opts;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Base query (name like) & mime prefix
  let filesQuery = supabase
    .from("files")
    .select("id,name,ext,mime,size,folder_id")
    .eq("user_id", user.id)
    .eq("is_trashed", false)
    .order("name")
    .limit(limit);
  if (q.trim()) filesQuery = filesQuery.ilike("name", `%${q.trim()}%`);
  if (mimePrefix) filesQuery = filesQuery.ilike("mime", `${mimePrefix}%`);
  const { data: baseFiles, error: baseErr } = await filesQuery;
  if (baseErr) throw new Error(baseErr.message);
  let filtered = baseFiles || [];

  // Tag filtering (intersection: file must have all tagIds)
  if (tagIds.length) {
    const { data: tagLinks } = await supabase
      .from("file_tags")
      .select("file_id, tag_id")
      .in("tag_id", tagIds);
    const counts = new Map<string, number>();
    (tagLinks || []).forEach(l => counts.set(l.file_id, (counts.get(l.file_id) || 0) + 1));
    const validIds = Array.from(counts.entries()).filter(([_, c]) => c === tagIds.length).map(([id]) => id);
    filtered = filtered.filter(f => validIds.includes(f.id));
  }

  // Retrieve tags for filtered files
  const fileIds = filtered.map(f => f.id);
  let tagsByFile: Record<string, { id: string; name: string; color: string }[]> = {};
  if (fileIds.length) {
    const { data: links } = await supabase
      .from("file_tags")
      .select("file_id, tags(id,name,color,user_id)")
      .in("file_id", fileIds)
      .eq("tags.user_id", user.id);
    (links || []).forEach((l: any) => {
      if (!l.tags) return;
      if (!tagsByFile[l.file_id]) tagsByFile[l.file_id] = [];
      tagsByFile[l.file_id].push({ id: l.tags.id, name: l.tags.name, color: l.tags.color });
    });
  }

  return filtered.map(f => ({ ...f, tags: tagsByFile[f.id] || [] }));
}
