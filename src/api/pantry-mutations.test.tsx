import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  pantryKeys,
  useAddToPantry,
  useRemoveFromPantry,
} from "@/api/queries";
import type { PantryItem } from "@/db/pantry";
import { createQueryWrapper, createTestQueryClient } from "@/test/query-wrapper";

// The mutations reach for a database through context and schedule reminders.
// Both are replaced here so the tests exercise the optimistic-update logic
// itself rather than SQLite or the notification scheduler.
const mockDb = {};
jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => mockDb,
}));

jest.mock("@/lib/notifications", () => ({
  scheduleExpiryReminder: jest.fn().mockResolvedValue(null),
  cancelExpiryReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/db/pantry", () => ({
  insertPantryItem: jest.fn(),
  deletePantryItem: jest.fn(),
  getPantryItem: jest.fn(),
  listPantryItems: jest.fn(),
  updatePantryItemExpiry: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pantryDb = require("@/db/pantry") as {
  insertPantryItem: jest.Mock;
  deletePantryItem: jest.Mock;
  getPantryItem: jest.Mock;
};

const existingItem: PantryItem = {
  id: 1,
  barcode: "5000112637922",
  name: "Coca Cola",
  addedAt: "2026-08-01T00:00:00.000Z",
};

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData<PantryItem[]>(pantryKeys.list, [existingItem]);
  return { queryClient, wrapper: createQueryWrapper(queryClient) };
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("useAddToPantry", () => {
  it("shows the new item optimistically before the insert resolves", async () => {
    const { queryClient, wrapper } = setup();
    let resolveInsert: (value: PantryItem) => void = () => {};
    pantryDb.insertPantryItem.mockReturnValue(
      new Promise<PantryItem>((resolve) => {
        resolveInsert = resolve;
      }),
    );

    const { result } = await renderHook(() => useAddToPantry(), { wrapper });

    await act(async () => {
      result.current.mutate({ barcode: "1", name: "Milk" });
    });

    await waitFor(() => {
      const list = queryClient.getQueryData<PantryItem[]>(pantryKeys.list);
      expect(list?.map((item) => item.name)).toEqual(["Milk", "Coca Cola"]);
    });

    // The optimistic row carries a negative sentinel id until the insert lands.
    const optimistic = queryClient.getQueryData<PantryItem[]>(pantryKeys.list);
    expect(optimistic?.[0].id).toBeLessThan(0);

    await act(async () => {
      resolveInsert({ ...existingItem, id: 2, name: "Milk" });
    });
  });

  it("rolls the list back to its previous state when the insert fails", async () => {
    const { queryClient, wrapper } = setup();
    pantryDb.insertPantryItem.mockRejectedValue(new Error("disk full"));

    const { result } = await renderHook(() => useAddToPantry(), { wrapper });

    await act(async () => {
      result.current.mutate({ barcode: "1", name: "Milk" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<PantryItem[]>(pantryKeys.list)).toEqual([
      existingItem,
    ]);
  });
});

describe("useRemoveFromPantry", () => {
  it("removes the row optimistically", async () => {
    const { queryClient, wrapper } = setup();
    pantryDb.getPantryItem.mockResolvedValue(existingItem);
    pantryDb.deletePantryItem.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useRemoveFromPantry(), { wrapper });

    await act(async () => {
      result.current.mutate(existingItem.id);
    });

    await waitFor(() =>
      expect(queryClient.getQueryData<PantryItem[]>(pantryKeys.list)).toEqual(
        [],
      ),
    );
  });

  it("restores the row when the delete fails", async () => {
    const { queryClient, wrapper } = setup();
    pantryDb.getPantryItem.mockResolvedValue(existingItem);
    pantryDb.deletePantryItem.mockRejectedValue(new Error("locked"));

    const { result } = await renderHook(() => useRemoveFromPantry(), { wrapper });

    await act(async () => {
      result.current.mutate(existingItem.id);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<PantryItem[]>(pantryKeys.list)).toEqual([
      existingItem,
    ]);
  });
});
