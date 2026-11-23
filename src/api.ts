export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error?.message || `Request failed (${status}).`);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error?.code;
    this.fields = body.error?.fields ?? {};
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Backend URL is not configured. Set VITE_API_BASE_URL to your service URL ending in /api/v1.");
  }
  return API_BASE_URL;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body ?? {});
  }
  return body as T;
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;
  if (csrfRequest && !forceRefresh) return csrfRequest;

  csrfRequest = fetch(`${getApiBaseUrl()}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then((response) => readResponse<{ csrfToken: string }>(response))
    .then(({ csrfToken: token }) => {
      if (!token) throw new Error("The backend did not return a CSRF token.");
      csrfToken = token;
      return token;
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

export function initializeApi() {
  return getCsrfToken();
}

export function refreshApiCsrf() {
  return getCsrfToken(true);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  csrf?: boolean;
  idempotencyKey?: string;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  const needsCsrf = options.csrf ?? (method === "POST" || method === "PATCH");
  if (needsCsrf) headers.set("X-CSRFToken", await getCsrfToken());

  const send = () =>
    fetch(`${getApiBaseUrl()}${path}`, {
      method,
      credentials: "include",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let response = await send();
  if (needsCsrf && response.status === 403) {
    headers.set("X-CSRFToken", await getCsrfToken(true));
    response = await send();
  }
  return readResponse<T>(response);
}

export type ApiProductVariant = {
  id: number;
  label?: string;
  name?: string;
  price: number | string;
};

export type ApiPresentation = {
  id: string;
  label?: string;
  name?: string;
  value?: string;
};

export type ApiProduct = {
  id?: string;
  slug?: string;
  name: string;
  description?: string;
  ingredients?: string;
  palette?: string;
  category: string;
  image?: string | null;
  imageAlt?: string;
  occasions?: string[];
  seasonal?: boolean;
  stock?: number | null;
  available?: boolean;
  variants?: ApiProductVariant[];
  price_tiers?: ApiProductVariant[];
  presentations?: Array<string | ApiPresentation>;
  presentation_options?: Array<string | ApiPresentation>;
};

export type ApiDeliverySlot = { id: number; label?: string; name?: string };
export type ApiDeliveryOption = {
  id: string | number;
  name: string;
  fee?: number | string;
  delivery_fee?: number | string;
  timeSlots?: ApiDeliverySlot[];
  time_slots?: ApiDeliverySlot[];
  slots?: ApiDeliverySlot[];
  leadTimeDays?: number;
  lead_time_days?: number;
  maxDaysAhead?: number;
  max_days_ahead?: number;
};

export type ApiUser = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  email_verified?: boolean;
  default_delivery_area?: string | null;
  default_address?: string | null;
  socialProviders?: string[];
  social_providers?: string[];
};

export type ApiOrderItem = {
  name?: string;
  product_name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  variant_label?: string;
  presentation_label?: string;
};

export type ApiOrder = {
  id: string | number;
  reference?: string;
  order_number?: string;
  status: string;
  payment_status?: string;
  created_at?: string;
  total?: number;
  total_amount?: number;
  delivery_date?: string;
  delivery_slot?: string | number;
  delivery_slot_label?: string;
  items?: ApiOrderItem[];
};

export type ApiCreateOrderRequest = {
  items: Array<{
    productId: string;
    variantId: number;
    presentationId: string;
    quantity: number;
  }>;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryArea: string;
  deliverySlot: number;
  deliveryDate: string;
  cardMessage: string;
  mpesaPhone: string;
};

export function normalizeList<T>(value: T[] | { results?: T[]; items?: T[] }): T[] {
  if (Array.isArray(value)) return value;
  return value.results ?? value.items ?? (value as { products?: T[]; orders?: T[] }).products ?? (value as { orders?: T[] }).orders ?? [];
}

export function normalizeProduct(raw: ApiProduct, index: number) {
  if (!raw.id && !raw.slug) throw new Error("The products response contains an item without an id or slug.");
  const rawVariants = raw.variants ?? raw.price_tiers ?? [];
  const rawPresentations = raw.presentations ?? raw.presentation_options ?? [];
  if (!rawVariants.length || !rawPresentations.length) {
    throw new Error(`Product "${raw.name || raw.id}" is missing variants or presentations.`);
  }
  const variants = rawVariants.map((variant) => {
    const price = Number(variant.price);
    if (!Number.isInteger(variant.id) || !Number.isFinite(price)) {
      throw new Error(`Product "${raw.name}" contains an invalid variant.`);
    }
    return { ...variant, price, label: variant.label ?? variant.name ?? `Size ${variant.id}` };
  });
  const presentations = rawPresentations.map((presentation) =>
    typeof presentation === "string"
      ? { id: presentation, label: presentation }
      : {
          id: String(presentation.id ?? presentation.value ?? ""),
          label: presentation.label ?? presentation.name ?? String(presentation.id ?? presentation.value ?? ""),
        },
  );
  if (presentations.some((presentation) => !presentation.id || !presentation.label)) {
    throw new Error(`Product "${raw.name}" contains an invalid presentation option.`);
  }
  const fallbackImages = [
    "photo-1523693916903-027d144a2b7d",
    "photo-1644248423203-80e317d78aee",
    "photo-1567418938902-aa650a3eb346",
    "photo-1674758445398-c2989470fa8a",
  ];
  const image = raw.image || `https://images.unsplash.com/${fallbackImages[index % fallbackImages.length]}?auto=format&fit=crop&w=900&q=85`;
  const prices = variants.map((variant) => variant.price);
  const categoryName = String(raw.category ?? "").toLowerCase();
  const category = categoryName === "fruit & gifts" || categoryName === "fruit_gifts" || categoryName === "fruit-and-gifts"
    ? "Fruit & gifts"
    : "Flowers";

  return {
    id: raw.slug || raw.id!,
    name: raw.name,
    note: raw.ingredients ?? "",
    ingredients: raw.ingredients ?? "",
    palette: raw.palette ?? "",
    description: raw.description ?? "",
    price: Math.min(...prices),
    prices,
    variants,
    presentations,
    category,
    image,
    imageAlt: raw.imageAlt ?? raw.name,
    occasions: raw.occasions ?? [],
    seasonal: raw.seasonal ?? false,
    photoBrief: "",
    tag: raw.seasonal ? "Seasonal" : undefined,
    stock: raw.stock ?? (raw.available === false ? 0 : null),
  } as const;
}

export function normalizeDeliveryOptions(value: ApiDeliveryOption[] | { results?: ApiDeliveryOption[]; areas?: ApiDeliveryOption[] }) {
  const options = Array.isArray(value) ? value : value.results ?? value.areas ?? [];
  return options.map((option) => ({
    id: String(option.id),
    name: option.name,
    fee: Number(option.fee ?? option.delivery_fee ?? 0),
    leadTimeDays: Number(option.leadTimeDays ?? option.lead_time_days ?? 0),
    maxDaysAhead: Number(option.maxDaysAhead ?? option.max_days_ahead ?? 30),
    timeSlots: (option.timeSlots ?? option.time_slots ?? option.slots ?? []).map((slot) => ({
      id: Number(slot.id),
      label: slot.label ?? (slot as ApiDeliverySlot & { name?: string }).name ?? `Slot ${slot.id}`,
    })),
  }));
}

export function normalizeUser(user: ApiUser) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? "",
    email: user.email ?? "",
    emailVerified: user.email_verified ?? false,
    area: user.default_delivery_area ?? "",
    address: user.default_address ?? "",
    socialProviders: user.socialProviders ?? user.social_providers ?? [],
  };
}
