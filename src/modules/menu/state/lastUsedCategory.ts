// src/modules/menu/state/lastUsedCategory.ts
// Remembers which category the vendor last added an item to, so re-opening
// Add Item (even after leaving and returning to the Menu tab) doesn't force
// them to re-pick a category they just used. Deliberately module-level, in-
// memory only (resets on app restart) — this is a same-session convenience,
// not a durable preference worth a backend field or persisted storage.

let lastUsedCategoryId: number | null = null;

export function getLastUsedCategoryId(): number | null {
  return lastUsedCategoryId;
}

export function setLastUsedCategoryId(id: number | null): void {
  lastUsedCategoryId = id;
}
