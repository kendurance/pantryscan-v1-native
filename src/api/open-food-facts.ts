const Base = "https://world.openfoodfacts.org/api/v2";

const Fields = [
  "code",
  "product_name",
  "brands",
  "quantity",
  "image_front_small_url",
  "nova_group",
  "nutriscore_grade",
].join(",");

/**
 * Open Food Facts asks apps to identify themselves so it can contact the
 * maintainer about misbehaving clients.
 */
const UserAgent = "PantryScan/1.0 (github.com/kendurance/pantryscan-v1-native)";

/** Thrown when the barcode is not in the database, as opposed to a transport failure. */
export class ProductNotFoundError extends Error {
  constructor(readonly barcode: string) {
    super(`No product found for barcode ${barcode}`);
    this.name = "ProductNotFoundError";
  }
}

export type Product = {
  code: string;
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  /** NOVA food-processing classification, 1 (unprocessed) to 4 (ultra-processed). */
  novaGroup?: number;
  /** Nutri-Score grade a–e. The API reports "unknown" or "not-applicable" too. */
  nutriscoreGrade?: string;
};

/** Raw product shape as returned by the API. Every field is optional in practice. */
type RawProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  nova_group?: number;
  nutriscore_grade?: string;
};

type ProductResponse = {
  status?: number;
  product?: RawProduct;
};

/** Collapses absent, empty, and whitespace-only values to `undefined`. */
function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * `brands` is a comma-separated list ("Nutella, Ferrero, Yum yum"). Only the
 * first entry is the primary brand.
 */
function primaryBrand(brands: string | undefined): string | undefined {
  return optionalText(brands?.split(",")[0]);
}

/** The API uses these sentinels rather than omitting the grade. */
const UngradedNutriscores = new Set(["unknown", "not-applicable"]);

function normalizeNutriscore(grade: string | undefined): string | undefined {
  const normalized = optionalText(grade)?.toLowerCase();
  if (!normalized || UngradedNutriscores.has(normalized)) return undefined;
  return normalized;
}

export function toProduct(raw: RawProduct, barcode: string): Product {
  return {
    code: optionalText(raw.code) ?? barcode,
    // Crowdsourced data: plenty of real products have no name.
    name: optionalText(raw.product_name) ?? "Unnamed product",
    brand: primaryBrand(raw.brands),
    quantity: optionalText(raw.quantity),
    imageUrl: optionalText(raw.image_front_small_url),
    novaGroup: raw.nova_group,
    nutriscoreGrade: normalizeNutriscore(raw.nutriscore_grade),
  };
}

export async function fetchProduct(
  barcode: string,
  signal?: AbortSignal,
): Promise<Product> {
  const response = await fetch(
    `${Base}/product/${encodeURIComponent(barcode)}.json?fields=${Fields}`,
    { headers: { "User-Agent": UserAgent }, signal },
  );

  if (!response.ok) {
    throw new Error(`Open Food Facts responded ${response.status}`);
  }

  const json: ProductResponse = await response.json();

  // The API answers 200 with `status: 0` for unknown barcodes, so a successful
  // transport does not mean a successful lookup.
  if (json.status !== 1 || !json.product) {
    throw new ProductNotFoundError(barcode);
  }

  return toProduct(json.product, barcode);
}
