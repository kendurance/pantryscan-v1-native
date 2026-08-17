import type { SQLiteDatabase } from "expo-sqlite";

/** A row as stored in SQLite. Column names are snake_case, as in the schema. */
type PantryItemRow = {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  image_url: string | null;
  expires_on: string | null;
  added_at: string;
  notification_id: string | null;
};

/** A pantry item in the shape the app uses. */
export type PantryItem = {
  id: number;
  barcode: string;
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  /** ISO date (YYYY-MM-DD), or undefined when no expiry was recorded. */
  expiresOn?: string;
  addedAt: string;
  /** Scheduled expiry reminder, so it can be cancelled if the item is removed. */
  notificationId?: string;
};

/**
 * Fields needed to add an item. The id and timestamp are assigned by SQLite,
 * and the notification is scheduled by the mutation rather than the caller.
 */
export type NewPantryItem = Omit<
  PantryItem,
  "id" | "addedAt" | "notificationId"
>;

function toPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? undefined,
    quantity: row.quantity ?? undefined,
    imageUrl: row.image_url ?? undefined,
    expiresOn: row.expires_on ?? undefined,
    addedAt: row.added_at,
    notificationId: row.notification_id ?? undefined,
  };
}

/**
 * Lists pantry items, soonest expiry first. `expires_on IS NULL` sorts last so
 * items without a date don't crowd out the ones actually going bad.
 */
export async function listPantryItems(
  db: SQLiteDatabase,
): Promise<PantryItem[]> {
  const rows = await db.getAllAsync<PantryItemRow>(
    `SELECT id, barcode, name, brand, quantity, image_url, expires_on, added_at,
            notification_id
       FROM pantry_items
      ORDER BY expires_on IS NULL, expires_on ASC, added_at DESC`,
  );
  return rows.map(toPantryItem);
}

export async function insertPantryItem(
  db: SQLiteDatabase,
  item: NewPantryItem,
  notificationId?: string | null,
): Promise<PantryItem> {
  const result = await db.runAsync(
    `INSERT INTO pantry_items
       (barcode, name, brand, quantity, image_url, expires_on, notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    item.barcode,
    item.name,
    item.brand ?? null,
    item.quantity ?? null,
    item.imageUrl ?? null,
    item.expiresOn ?? null,
    notificationId ?? null,
  );

  // Read the row back so `addedAt` reflects the value SQLite assigned.
  const row = await db.getFirstAsync<PantryItemRow>(
    `SELECT id, barcode, name, brand, quantity, image_url, expires_on, added_at,
            notification_id
       FROM pantry_items WHERE id = ?`,
    result.lastInsertRowId,
  );

  if (!row) {
    throw new Error("Inserted pantry item could not be read back");
  }
  return toPantryItem(row);
}

export async function getPantryItem(
  db: SQLiteDatabase,
  id: number,
): Promise<PantryItem | null> {
  const row = await db.getFirstAsync<PantryItemRow>(
    `SELECT id, barcode, name, brand, quantity, image_url, expires_on, added_at,
            notification_id
       FROM pantry_items WHERE id = ?`,
    id,
  );
  return row ? toPantryItem(row) : null;
}

export async function deletePantryItem(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM pantry_items WHERE id = ?", id);
}
