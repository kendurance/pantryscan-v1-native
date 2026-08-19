import { render, screen, waitFor } from "@testing-library/react-native";

import ProductScreen from "@/app/product/[barcode]";
import { ProductNotFoundError } from "@/api/open-food-facts";
import { createQueryWrapper, createTestQueryClient } from "@/test/query-wrapper";

const barcode = "5000112637922";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ barcode: "5000112637922" }),
  Stack: { Screen: () => null },
}));

// The add-to-pantry action needs a database and the notification scheduler;
// neither is under test here, so the whole subtree is stubbed out.
jest.mock("@/components/add-to-pantry", () => ({
  AddToPantry: () => null,
}));

jest.mock("@/api/open-food-facts", () => {
  const actual = jest.requireActual("@/api/open-food-facts");
  return { ...actual, fetchProduct: jest.fn() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchProduct } = require("@/api/open-food-facts") as {
  fetchProduct: jest.Mock;
};

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = createQueryWrapper(queryClient);
  return render(
    <Wrapper>
      <ProductScreen />
    </Wrapper>,
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("ProductScreen", () => {
  it("renders a loading state while the lookup is in flight", async () => {
    fetchProduct.mockReturnValue(new Promise(() => {}));

    await renderScreen();

    expect(await screen.findByText(`Looking up ${barcode}…`)).toBeTruthy();
  });

  it("renders the product once the lookup succeeds", async () => {
    fetchProduct.mockResolvedValue({
      code: barcode,
      name: "Coca Cola",
      brand: "Coca-Cola",
      quantity: "330 ml",
    });

    await renderScreen();

    await waitFor(() => expect(screen.getByText("Coca Cola")).toBeTruthy());
    expect(screen.getByText("Coca-Cola")).toBeTruthy();
    expect(screen.getByText("330 ml")).toBeTruthy();
  });

  it("renders a not-found state rather than a generic error", async () => {
    fetchProduct.mockRejectedValue(new ProductNotFoundError(barcode));

    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Not in the database")).toBeTruthy(),
    );
    // A missing barcode is a dead end, so no retry is offered.
    expect(screen.queryByText("Try again")).toBeNull();
  });

  it("renders a retryable error state for a transport failure", async () => {
    fetchProduct.mockRejectedValue(new Error("Open Food Facts responded 503"));

    await renderScreen();

    // `useProduct` retries transport failures twice with backoff before giving
    // up, so this settles later than the not-found case above.
    await waitFor(
      () => expect(screen.getByText("Couldn't load this product")).toBeTruthy(),
      { timeout: 10_000 },
    );
    expect(screen.getByText("Try again")).toBeTruthy();
    // Three attempts total: the initial call plus two retries.
    expect(fetchProduct).toHaveBeenCalledTimes(3);
  });
});
