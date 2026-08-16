import {
  fetchProduct,
  ProductNotFoundError,
  toProduct,
} from "@/api/open-food-facts";

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("toProduct", () => {
  it("keeps the first brand from a comma-separated list", () => {
    // Real response for Nutella: "Nutella, Ferrero, Yum yum".
    const product = toProduct({ brands: "Nutella, Ferrero, Yum yum" }, "123");
    expect(product.brand).toBe("Nutella");
  });

  it("treats empty and whitespace-only fields as absent", () => {
    // Nutella really does come back with quantity: "".
    const product = toProduct({ quantity: "", brands: "   " }, "123");
    expect(product.quantity).toBeUndefined();
    expect(product.brand).toBeUndefined();
  });

  it("falls back to a placeholder name when the product is unnamed", () => {
    expect(toProduct({}, "123").name).toBe("Unnamed product");
  });

  it("falls back to the requested barcode when the payload omits the code", () => {
    expect(toProduct({}, "5000112637922").code).toBe("5000112637922");
  });

  it("drops the sentinel nutriscore grades the API reports", () => {
    expect(toProduct({ nutriscore_grade: "unknown" }, "1").nutriscoreGrade)
      .toBeUndefined();
    expect(
      toProduct({ nutriscore_grade: "not-applicable" }, "1").nutriscoreGrade,
    ).toBeUndefined();
    expect(toProduct({ nutriscore_grade: "B" }, "1").nutriscoreGrade).toBe("b");
  });
});

describe("fetchProduct", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("parses a found product", async () => {
    jest.spyOn(globalThis, "fetch").mockReturnValue(
      mockJsonResponse({
        status: 1,
        product: {
          code: "5000112637922",
          product_name: "Coca Cola",
          brands: "Coca-Cola",
          quantity: "330 ml",
          nova_group: 4,
        },
      }),
    );

    await expect(fetchProduct("5000112637922")).resolves.toMatchObject({
      code: "5000112637922",
      name: "Coca Cola",
      brand: "Coca-Cola",
      quantity: "330 ml",
      novaGroup: 4,
    });
  });

  it("throws ProductNotFoundError when a 200 carries status 0", async () => {
    // The API answers HTTP 200 with status: 0 for unknown barcodes.
    jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ status: 0, code: "00000000" }));

    await expect(fetchProduct("0000000000000")).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it("throws a transport error for a non-ok response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({}, false, 503));

    await expect(fetchProduct("5000112637922")).rejects.toThrow(
      "Open Food Facts responded 503",
    );
  });

  it("identifies the app to Open Food Facts", async () => {
    const fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockReturnValue(mockJsonResponse({ status: 1, product: {} }));

    await fetchProduct("5000112637922");

    const [, init] = fetchSpy.mock.calls[0];
    expect(
      (init?.headers as Record<string, string>)["User-Agent"],
    ).toContain("PantryScan");
  });
});
