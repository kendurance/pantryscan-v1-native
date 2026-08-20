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

/** Fields the pantry list can be ordered by. */
export type PantrySortField = "expiry" | "name" | "brand" | "added";

export type PantrySortDirection = "asc" | "desc";

export type PantrySort = {
  field: PantrySortField;
  direction: PantrySortDirection;
};

export const DefaultPantrySort: PantrySort = {
  field: "expiry",
  direction: "asc",
};

/**
 * Maps a sort field to its ORDER BY clause, with `$dir` standing in for the
 * direction. Written as a lookup rather than string-built from user input, so
 * no caller can inject SQL through the sort controls.
 *
 * Rows missing the sorted value always sort last, in both directions: an item
 * with no expiry date is unknown rather than infinitely far away, so it should
 * not lead the list when sorting descending.
 */
const OrderByClause: Record<PantrySortField, string> = {
  expiry: "expires_on IS NULL, expires_on $dir, added_at DESC, id DESC",
  // NOCASE so "apple" and "Apple" sort together rather than in ASCII order.
  name: "name COLLATE NOCASE $dir, id DESC",
  brand:
    "brand IS NULL, brand COLLATE NOCASE $dir, name COLLATE NOCASE ASC, id DESC",
  // `added_at` has second precision, so items scanned in the same second tie.
  // The row id is monotonic, which keeps rapid scans in a stable order.
  added: "added_at $dir, id $dir",
};

function buildOrderBy(sort: PantrySort): string {
  const direction = sort.direction === "desc" ? "DESC" : "ASC";
  return OrderByClause[sort.field].replaceAll("$dir", direction);
}

/**
 * Lists pantry items in the requested order. Sorting happens in SQLite rather
 * than in JavaScript so collation and NULL placement stay consistent.
 */
export async function listPantryItems(
  db: SQLiteDatabase,
  sort: PantrySort = DefaultPantrySort,
): Promise<PantryItem[]> {
  const rows = await db.getAllAsync<PantryItemRow>(
    `SELECT id, barcode, name, brand, quantity, image_url, expires_on, added_at,
            notification_id
       FROM pantry_items
      ORDER BY ${buildOrderBy(sort)}`,
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

/**
 * Updates an item's expiry date and the reminder scheduled against it. Both
 * change together: a new date means the old reminder is wrong.
 */
export async function updatePantryItemExpiry(
  db: SQLiteDatabase,
  id: number,
  expiresOn: string | undefined,
  notificationId: string | null,
): Promise<PantryItem> {
  await db.runAsync(
    "UPDATE pantry_items SET expires_on = ?, notification_id = ? WHERE id = ?",
    expiresOn ?? null,
    notificationId,
    id,
  );

  const updated = await getPantryItem(db, id);
  if (!updated) {
    throw new Error(`Pantry item ${id} could not be read back after update`);
  }
  return updated;
}

export async function deletePantryItem(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM pantry_items WHERE id = ?", id);
}
