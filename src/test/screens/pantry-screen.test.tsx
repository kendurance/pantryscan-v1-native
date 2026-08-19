import { render, screen, waitFor } from "@testing-library/react-native";

import PantryScreen from "@/app/(tabs)/index";
import type { PantryItem } from "@/db/pantry";
import { createQueryWrapper, createTestQueryClient } from "@/test/query-wrapper";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const mockDb = {};
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => mockDb }));

jest.mock("@/lib/notifications", () => ({
  scheduleExpiryReminder: jest.fn().mockResolvedValue(null),
  cancelExpiryReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/db/pantry", () => ({
  listPantryItems: jest.fn(),
  insertPantryItem: jest.fn(),
  deletePantryItem: jest.fn(),
  getPantryItem: jest.fn(),
  updatePantryItemExpiry: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listPantryItems } = require("@/db/pantry") as {
  listPantryItems: jest.Mock;
};

function renderScreen() {
  const Wrapper = createQueryWrapper(createTestQueryClient());
  return render(
    <Wrapper>
      <PantryScreen />
    </Wrapper>,
  );
}

/** Days from today as YYYY-MM-DD, so expiry labels are stable over time. */
function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const baseItem: PantryItem = {
  id: 1,
  barcode: "5000112637922",
  name: "Coca Cola",
  brand: "Coca-Cola",
  addedAt: "2026-08-01T00:00:00.000Z",
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("PantryScreen", () => {
  it("renders an empty state when nothing has been added", async () => {
    listPantryItems.mockResolvedValue([]);

    await renderScreen();

    await waitFor(() =>
      expect(
        screen.getByText(
          "Nothing here yet. Scan a barcode to add your first item.",
        ),
      ).toBeTruthy(),
    );
  });

  it("renders stored items", async () => {
    listPantryItems.mockResolvedValue([baseItem]);

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Coca Cola")).toBeTruthy());
    expect(screen.getByText("Coca-Cola")).toBeTruthy();
  });

  it("labels an item with no expiry date", async () => {
    listPantryItems.mockResolvedValue([baseItem]);

    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("No expiry set")).toBeTruthy(),
    );
  });

  it("offers Edit and Remove as separate actions on a row", async () => {
    listPantryItems.mockResolvedValue([baseItem]);

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Edit")).toBeTruthy());
    expect(screen.getByText("Remove")).toBeTruthy();
  });

  it("counts down the days until expiry", async () => {
    listPantryItems.mockResolvedValue([
      { ...baseItem, expiresOn: isoDaysFromNow(5) },
    ]);

    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Expires in 5 days")).toBeTruthy(),
    );
  });

  it("flags an item that has already expired", async () => {
    listPantryItems.mockResolvedValue([
      { ...baseItem, expiresOn: isoDaysFromNow(-1) },
    ]);

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Expired")).toBeTruthy());
  });
});
