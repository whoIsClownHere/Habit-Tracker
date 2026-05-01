import { USER_BACKUP_PREFIX } from "../config/constants.js";
import { normalizeData } from "../data/normalizers.js";

export function saveUserBackup(uid, data, savedAt = Date.now()) {
  if (!uid) return;

  try {
    localStorage.setItem(getBackupKey(uid), JSON.stringify({
      data,
      savedAt
    }));
  } catch {
    // A backup is protective, not part of the critical save path.
  }
}

export function loadUserBackup(uid) {
  if (!uid) return null;

  try {
    const raw = localStorage.getItem(getBackupKey(uid));
    if (!raw) return null;

    const backup = JSON.parse(raw);
    return {
      data: normalizeData(backup.data || {}),
      savedAt: Number(backup.savedAt || 0)
    };
  } catch {
    return null;
  }
}

function getBackupKey(uid) {
  return `${USER_BACKUP_PREFIX}${uid}`;
}
