/**
 * Firebase Storage layout. Every uploaded file MUST live under one of these
 * top-level folders, nested by the owner's uid:
 *
 *   <folder>/<uid>/<fileName>
 *
 * Keeping uploads foldered (never at the bucket root) and grouped per-user
 * makes media easy to find and to clean up later — deleting a user's media is
 * just deleting their subfolder under each folder. Always build paths with
 * `storagePath()` instead of hand-writing them.
 */
export const STORAGE_FOLDERS = {
  profileAvatars: "profile-avatars",
  coverBackgrounds: "cover-backgrounds",
  characterAvatars: "character-avatars",
} as const;

/** Foldered, per-user storage path: `<folder>/<uid>/<fileName>`. */
export function storagePath(folder: string, uid: string, fileName: string): string {
  return `${folder}/${uid}/${fileName}`;
}
