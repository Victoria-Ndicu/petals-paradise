import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  apiRequest,
  ApiError,
  getProducts,
  initializeApi,
  refreshApiCsrf,
  normalizeDeliveryOptions,
  normalizeList,
  normalizeProduct,
  normalizeUser,
  type ApiCreateOrderRequest,
  type ApiDeliveryOption,
  type ApiOrder,
  type ApiUser,
} from "./api";

/* ------------------------------------------------------------------ */
/*  Data (swap for your API / database later)                          */
/* ------------------------------------------------------------------ */

export type Category = "Flowers" | "Fruit & gifts";

export type Product = ReturnType<typeof normalizeProduct>;

const CATEGORIES: ("All" | Category)[] = ["All", "Flowers", "Fruit & gifts"];

const WHATSAPP = "254728829124";

export const money = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/*  Hash routing (no extra dependency)                                 */
/* ------------------------------------------------------------------ */

export function useHashRoute() {
  const get = () => window.location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const onChange = () => {
      setRoute(get());
      if (get().startsWith("/")) window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const isShopRoute = (route: string) =>
  route.startsWith("/shop") || route.startsWith("/checkout") || route.startsWith("/account") || route.startsWith("/verify-email");

/* ------------------------------------------------------------------ */
/*  Server-backed customer authentication                             */
/* ------------------------------------------------------------------ */

export type User = { id: string; name: string; phone: string; email: string; emailVerified: boolean; area: string; address: string; socialProviders: string[] };
export type DeliveryOption = ReturnType<typeof normalizeDeliveryOptions>[number];

type CartLine = { key: string; id: string; qty: number; price: number; variantId: number; variantLabel: string; presentation: string; presentationLabel: string };
type CartVariant = { price: number; variantId: number; variantLabel: string; presentation: string; presentationLabel: string };

type AuthCtx = {
  user: User | null;
  authReady: boolean;
  authError: string;
  logIn: (identifier: string, password: string) => Promise<void>;
  signUp: (i: { name: string; email: string; password: string }) => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<User, "id">>) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  socialLogin: (provider: "google" | "apple", input: { idToken: string; phone?: string; name?: string; nonce?: string }) => Promise<void>;
  linkSocial: (provider: "google" | "apple", idToken: string) => Promise<void>;
};
const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <ShopProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Cart + provider                                                    */
/* ------------------------------------------------------------------ */

type CartCtx = {
  lines: (CartLine & { product: Product })[];
  count: number;
  subtotal: number;
  add: (id: string, qty?: number, variant?: CartVariant) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toast: string | null;
  dismissToast: () => void;
};

const CartContext = createContext<CartCtx | null>(null);
type CatalogueCtx = {
  products: Product[];
  productsLoading: boolean;
  productsError: string;
  deliveryOptions: DeliveryOption[];
  deliveryLoading: boolean;
  deliveryError: string;
};
const CatalogueContext = createContext<CatalogueCtx | null>(null);
const CART_KEY = "petals-paradise-cart";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <ShopProvider>");
  return ctx;
}

export function useCatalogue() {
  const ctx = useContext(CatalogueContext);
  if (!ctx) throw new Error("useCatalogue must be used inside <ShopProvider>");
  return ctx;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliveryError, setDeliveryError] = useState("");
  const [raw, setRaw] = useState<CartLine[]>([]);
  const cartHydrated = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    getProducts()
      .then((response) => {
        if (active) {
          setProducts(response.map(normalizeProduct));
          setProductsError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setProductsError(error instanceof Error ? error.message : "Could not load products.");
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });

    void (async () => {
      try {
        await initializeApi();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not initialize the backend session.";
        if (active) {
          setDeliveryError(message);
          setAuthError(message);
        }
      }
      if (!active) return;

      apiRequest<ApiDeliveryOption[] | { results?: ApiDeliveryOption[]; areas?: ApiDeliveryOption[] }>("/delivery-options")
        .then((response) => {
          if (active) {
            setDeliveryOptions(normalizeDeliveryOptions(response));
            setDeliveryError("");
          }
        })
        .catch((error: unknown) => {
          if (active) setDeliveryError(error instanceof Error ? error.message : "Could not load delivery options.");
        })
        .finally(() => {
          if (active) setDeliveryLoading(false);
        });
      apiRequest<ApiUser>("/me")
        .then((response) => {
          if (active) {
            setUser(normalizeUser(response));
            setAuthError("");
          }
        })
        .catch((error: unknown) => {
          if (!active) return;
          if (error instanceof ApiError && error.status === 401) {
            setUser(null);
            setAuthError("");
          } else {
            setAuthError(error instanceof Error ? error.message : "Could not load your account.");
          }
        })
        .finally(() => {
          if (active) setAuthReady(true);
        });
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (productsLoading || productsError || cartHydrated.current) return;
    const saved = read<Array<Partial<CartLine> & { id: string; qty: number; sizeIndex?: number }>>(CART_KEY, []);
    const restored = saved.flatMap((line) => {
      const product = products.find((item) => item.id === line.id);
      if (!product || product.stock === 0 || !product.variants.length || !product.presentations.length) return [];
      const variant = product.variants.find((option) => option.id === line.variantId) ?? product.variants[line.sizeIndex ?? 0] ?? product.variants[0];
      const presentation = product.presentations.find((option) => option.id === line.presentation) ?? product.presentations[0];
      const qty = Math.max(1, Math.min(product.stock ?? Number.MAX_SAFE_INTEGER, line.qty));
      return [{
        key: `${product.id}:${variant.id}:${presentation.id}`,
        id: product.id,
        qty,
        price: variant.price,
        variantId: variant.id,
        variantLabel: variant.label,
        presentation: presentation.id,
        presentationLabel: presentation.label,
      }];
    });
    cartHydrated.current = true;
    setRaw(restored);
  }, [products, productsError, productsLoading]);

  useEffect(() => {
    if (cartHydrated.current) write(CART_KEY, raw);
  }, [raw]);

  // Cart always starts closed and closes itself whenever the page changes.
  useEffect(() => {
    const close = () => setDrawerOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((id: string, qty = 1, variant?: CartVariant) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error("This product is no longer available. Refresh the catalogue and try again.");
    const selected = variant ?? {
      price: product.price,
      variantId: product.variants[0].id,
      variantLabel: product.variants[0].label,
      presentation: product.presentations[0].id,
      presentationLabel: product.presentations[0].label,
    };
    const key = `${id}:${selected.variantId}:${selected.presentation}`;
    const stock = product.stock ?? Number.MAX_SAFE_INTEGER;
    setRaw((cur) => {
      const found = cur.find((line) => line.key === key);
      if (found) return cur.map((line) => (line.key === key ? { ...line, qty: Math.min(stock, line.qty + qty) } : line));
      return [...cur, { key, id, qty: Math.min(stock, qty), ...selected }];
    });
    setToast(`${product.name} added to cart`);
  }, [products]);

  const setQty = useCallback((key: string, qty: number) => {
    setRaw((cur) =>
      qty <= 0 ? cur.filter((line) => line.key !== key) : cur.map((line) => {
        if (line.key !== key) return line;
        const stock = products.find((product) => product.id === line.id)?.stock ?? Number.MAX_SAFE_INTEGER;
        return { ...line, qty: Math.min(stock, qty) };
      }),
    );
  }, [products]);
  const remove = useCallback((key: string) => setRaw((cur) => cur.filter((line) => line.key !== key)), []);
  const clear = useCallback(() => setRaw([]), []);

  const cart = useMemo<CartCtx>(() => {
    const lines = raw.flatMap((line) => {
      const product = products.find((item) => item.id === line.id);
      return product ? [{ ...line, product: { ...product, price: line.price } }] : [];
    });
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.product.price, 0),
      add, setQty, remove, clear,
      drawerOpen, setDrawerOpen,
      toast, dismissToast: () => setToast(null),
    };
  }, [raw, products, add, setQty, remove, clear, drawerOpen, toast]);

  const auth = useMemo<AuthCtx>(
    () => ({
      user,
      authReady,
      authError,
      logIn: async (identifier, password) => {
        await apiRequest("/auth/login", {
          method: "POST",
          body: { identifier, password },
        });
        await refreshApiCsrf();
        setUser(normalizeUser(await apiRequest<ApiUser>("/me")));
        setAuthError("");
      },
      signUp: async (input) => {
        await apiRequest("/auth/signup", {
          method: "POST",
          body: { name: input.name, email: input.email, password: input.password },
        });
        await refreshApiCsrf();
        setUser(normalizeUser(await apiRequest<ApiUser>("/me")));
        setAuthError("");
      },
      logOut: async () => {
        await apiRequest<void>("/auth/logout", { method: "POST" });
        setUser(null);
      },
      updateProfile: async (patch) => {
        if (!user) return;
        const body = {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.area !== undefined ? { default_delivery_area: patch.area } : {}),
          ...(patch.address !== undefined ? { default_address: patch.address } : {}),
        };
        await apiRequest("/me", { method: "PATCH", body });
        setUser(normalizeUser(await apiRequest<ApiUser>("/me")));
      },
      resendEmailVerification: async () => {
        if (!user?.email) throw new Error("Add an email address to your account first.");
        await apiRequest("/auth/verify-email/resend", {
          method: "POST",
          body: { email: user.email },
        });
      },
      socialLogin: async (provider, input) => {
        await apiRequest(`/auth/social/${provider}`, {
          method: "POST",
          body: provider === "google"
            ? { idToken: input.idToken, ...(input.phone ? { phone: input.phone } : {}), ...(input.nonce ? { nonce: input.nonce } : {}) }
            : { idToken: input.idToken, name: input.name ?? "", ...(input.phone ? { phone: input.phone } : {}) },
        });
        await refreshApiCsrf();
        setUser(normalizeUser(await apiRequest<ApiUser>("/me")));
      },
      linkSocial: async (provider, idToken) => {
        await apiRequest(`/auth/social/${provider}/link`, {
          method: "POST",
          body: { idToken },
        });
        setUser(normalizeUser(await apiRequest<ApiUser>("/me")));
      },
    }),
    [user, authReady, authError],
  );

  const catalogue = useMemo<CatalogueCtx>(() => ({
    products, productsLoading, productsError,
    deliveryOptions, deliveryLoading, deliveryError,
  }), [products, productsLoading, productsError, deliveryOptions, deliveryLoading, deliveryError]);

  return (
    <AuthContext.Provider value={auth}>
      <CatalogueContext.Provider value={catalogue}>
        <CartContext.Provider value={cart}>{children}</CartContext.Provider>
      </CatalogueContext.Provider>
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Small UI helpers                                                   */
/* ------------------------------------------------------------------ */

type IconName = "bag" | "close" | "plus" | "minus" | "trash" | "arrow" | "search" | "check" | "phone" | "lock" | "truck" | "back" | "user" | "logout";

function Ico({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    bag: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    check: <path d="m5 12 5 5 9-10" />,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    truck: <><path d="M2 6h11v10H2z" /><path d="M13 9h4l3 3v4h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  };
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Btn({
  children, onClick, href, variant = "primary", className = "", disabled, type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "light" | "outline";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-forest text-ivory hover:bg-forest-light",
    light: "bg-ivory text-forest hover:bg-white",
    outline: "border border-forest/25 text-forest hover:border-forest hover:bg-sage/20",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`;
  if (href) return <a href={href} onClick={onClick} className={cls}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

function QtyStepper({ qty, onChange, max }: { qty: number; onChange: (q: number) => void; max: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-forest/20 text-forest">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(qty - 1)} className="grid size-10 place-items-center rounded-full transition hover:bg-sage/20"><Ico name="minus" className="size-3.5" /></button>
      <span className="w-7 text-center text-sm font-semibold">{qty}</span>
      <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={() => onChange(qty + 1)} className="grid size-10 place-items-center rounded-full transition hover:bg-sage/20 disabled:opacity-30"><Ico name="plus" className="size-3.5" /></button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header buttons                                                     */
/* ------------------------------------------------------------------ */

/** Put next to CartButton in the header. */
export function AccountButton({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  return (
    <a href="#/account" aria-label={user ? "My account" : "Sign in"} className={`relative size-10 place-items-center rounded-full text-forest transition hover:bg-sage/20 ${className || "grid"}`}>
      <Ico name="user" className="size-[1.15rem]" />
      {user && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" />}
    </a>
  );
}

export function CartButton({ className = "" }: { className?: string }) {
  const { count, setDrawerOpen } = useCart();
  return (
    <button
      aria-label={`Open cart, ${count} items`}
      onClick={() => setDrawerOpen(true)}
      className={`relative grid size-10 place-items-center rounded-full text-forest transition hover:bg-sage/20 ${className}`}
    >
      <Ico name="bag" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[0.65rem] font-bold leading-5 text-ivory">{count}</span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Cart drawer + "added to cart" toast                                */
/* ------------------------------------------------------------------ */

export function CartDrawer() {
  const { lines, subtotal, drawerOpen, setDrawerOpen, setQty, remove, toast, dismissToast } = useCart();
  const close = () => setDrawerOpen(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <>
      {toast && !drawerOpen && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[65] flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-full bg-forest py-2.5 pl-5 pr-2.5 text-sm text-ivory shadow-xl">
          <span className="flex items-center gap-2"><Ico name="check" className="size-4 text-gold-light" /> {toast}</span>
          <button onClick={() => { dismissToast(); setDrawerOpen(true); }} className="rounded-full bg-ivory px-4 py-2 text-xs font-bold text-forest">View cart</button>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <div className="absolute inset-0 bg-forest/60 backdrop-blur-sm" onClick={close} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl">
            <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4 sm:px-6 sm:py-5">
              <h2 className="font-serif text-3xl text-forest">Your cart</h2>
              <button aria-label="Close cart" onClick={close} className="grid size-10 place-items-center text-forest"><Ico name="close" /></button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-blush/30 text-forest"><Ico name="bag" className="size-7" /></span>
                <p className="font-serif text-2xl text-forest">Your cart is empty</p>
                <p className="text-sm text-charcoal/60">Let's find something beautiful for your someone.</p>
                <Btn href="#/shop" onClick={close}>Browse flowers</Btn>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-forest/10 overflow-y-auto px-5 sm:px-6">
                  {lines.map(({ product, qty, key, variantLabel, presentationLabel }) => (
                    <li key={key} className="flex gap-4 py-5">
                      <img src={product.image} alt={product.imageAlt} className="size-20 shrink-0 object-cover sm:size-24" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-xl leading-tight text-forest">{product.name}</h3>
                          <button aria-label={`Remove ${product.name}`} onClick={() => remove(key)} className="grid size-8 shrink-0 place-items-center text-charcoal/40 transition hover:text-rose"><Ico name="trash" className="size-4" /></button>
                        </div>
                        <p className="mt-0.5 text-xs text-charcoal/50">{variantLabel} · {presentationLabel} · {money(product.price)} each</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <QtyStepper qty={qty} max={product.stock ?? Number.MAX_SAFE_INTEGER} onChange={(q) => setQty(key, q)} />
                          <p className="font-semibold text-forest">{money(qty * product.price)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-forest/10 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
                  <div className="flex items-center justify-between text-sm"><span className="text-charcoal/60">Subtotal</span><strong className="text-lg text-forest">{money(subtotal)}</strong></div>
                  <p className="mt-1 text-xs text-charcoal/45">Delivery calculated at checkout.</p>
                  <Btn href="#/checkout" onClick={close} className="mt-4 w-full">Checkout <Ico name="arrow" className="size-4" /></Btn>
                  <button onClick={close} className="mt-2 w-full py-3 text-center text-sm font-medium text-forest/70 transition hover:text-forest">Continue shopping</button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shop page                                                          */
/* ------------------------------------------------------------------ */

function ShopCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const soldOut = product.stock === 0;
  return (
    <article className="group flex min-w-0 gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-forest/10 transition hover:shadow-md sm:gap-5 sm:p-4">
      <button onClick={onOpen} className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-blush/30 text-left sm:w-32 md:w-40" aria-label={`View ${product.name}`}>
        {product.image && <img src={product.image} alt={product.imageAlt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        {product.tag && <span className="absolute left-1.5 top-1.5 rounded-full bg-ivory/90 px-2 py-1 text-[0.55rem] font-bold uppercase tracking-wider text-forest backdrop-blur sm:left-2 sm:top-2 sm:text-[0.65rem]">{product.tag}</span>}
        {product.stock !== null && product.stock > 0 && product.stock <= 5 && <span className="absolute inset-x-1 bottom-1 rounded-full bg-rose px-1.5 py-1 text-[0.5rem] font-bold uppercase leading-tight text-ivory sm:inset-x-2 sm:bottom-2 sm:px-2 sm:text-[0.65rem]">Only {product.stock} left</span>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-rose-dark sm:text-xs">{product.category}</p>
            <h3 className="mt-1 font-serif text-lg leading-tight text-forest sm:text-2xl">{product.name}</h3>
          </div>
          <p className="shrink-0 text-sm font-semibold text-forest sm:text-base">From {money(product.price)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-charcoal/55 sm:mt-2 sm:text-sm">{product.note || product.description}</p>
        <Btn disabled={soldOut} onClick={onOpen} className="mt-2 self-start !px-4 !py-2 text-xs sm:mt-3 sm:!px-5 sm:!py-2.5 sm:text-sm">
          {soldOut ? "Sold out" : <>Choose options <Ico name="bag" className="size-3.5 sm:size-4" /></>}
        </Btn>
      </div>
    </article>
  );
}

function ShopCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-forest/10 sm:gap-5 sm:p-4">
      <div className="aspect-square w-24 shrink-0 animate-pulse rounded-xl bg-sage/25 sm:w-32 md:w-40" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-sage/25" />
        <div className="h-6 w-3/4 animate-pulse rounded bg-sage/25" />
        <div className="h-4 w-full animate-pulse rounded bg-sage/20" />
        <div className="h-9 w-32 animate-pulse rounded-full bg-sage/25" />
      </div>
    </div>
  );
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [presentationId, setPresentationId] = useState(product.presentations[0].id);
  const variant = product.variants.find((option) => option.id === variantId) ?? product.variants[0];
  const presentation = product.presentations.find((option) => option.id === presentationId) ?? product.presentations[0];
  const price = variant.price;
  const variantUnavailable = variant.available === false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="absolute inset-0 bg-forest/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-ivory sm:rounded-3xl md:grid-cols-2">
        <button aria-label="Close" onClick={onClose} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-ivory/90 text-forest"><Ico name="close" className="size-4" /></button>
        {product.image && <img src={product.image} alt={product.imageAlt} className="h-64 w-full object-cover md:h-full md:min-h-[32rem]" />}
        <div className="flex flex-col p-6 sm:p-10">
          <p className="eyebrow">{product.category}</p>
          <h2 className="mt-3 font-serif text-4xl leading-none text-forest sm:text-5xl">{product.name}</h2>
          <p className="mt-4 text-2xl font-semibold text-forest">{money(price)}</p>
          <p className="mt-4 leading-7 text-charcoal/65">{product.description}</p>
          <p className="mt-3 text-sm text-charcoal/50">{product.ingredients} · {product.palette}</p>
          {product.seasonNote && <p className="mt-3 rounded-xl bg-sage/15 px-4 py-3 text-sm text-forest">{product.seasonNote}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="field"><span>Size</span>
              <select value={variantId} onChange={(event) => setVariantId(Number(event.target.value))}>
                {product.variants.map((option) => <option key={option.id} value={option.id} disabled={option.available === false}>{option.label} · {money(option.price)}{option.available === false ? " · Unavailable" : ""}</option>)}
              </select>
            </label>
            <label className="field"><span>Presentation</span>
              <select value={presentationId} onChange={(event) => setPresentationId(event.target.value)}>
                {product.presentations.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-charcoal/50">Occasions: {product.occasions.join(", ")}</p>
          <ul className="mt-5 space-y-2 text-sm text-charcoal/65">
            <li className="flex items-center gap-2"><Ico name="truck" className="size-4 shrink-0 text-gold" /> Delivery options at checkout</li>
            <li className="flex items-center gap-2"><Ico name="lock" className="size-4 shrink-0 text-gold" /> Order and payment status updates</li>
          </ul>
          <div className="mt-auto flex items-center gap-3 pt-7">
            <QtyStepper qty={qty} max={product.stock ?? Number.MAX_SAFE_INTEGER} onChange={(q) => setQty(Math.max(1, q))} />
            <Btn disabled={product.stock === 0 || variantUnavailable} onClick={() => { add(product.id, qty, { price, variantId, variantLabel: variant.label, presentation: presentation.id, presentationLabel: presentation.label }); onClose(); }} className="flex-1 !px-4">
              {variantUnavailable ? "Unavailable" : <>Add · {money(price * qty)}</>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShopPage() {
  const [category, setCategory] = useState<"All" | Category>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [selected, setSelected] = useState<Product | null>(null);
  const { products, productsLoading, productsError } = useCatalogue();

  const visible = useMemo(() => {
    let list = products.filter(
      (p) => (category === "All" || p.category === category) && `${p.name} ${p.note} ${p.occasions.join(" ")}`.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, category, query, sort]);

  return (
    <>
      {/* Compact header so products are visible straight away */}
      <section className="border-b border-forest/10 bg-blush/20 py-7 sm:py-9">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="eyebrow">Petals Paradise shop</p>
          <h1 className="mt-2 font-serif text-4xl leading-none text-forest sm:text-5xl">Shop flowers & gifts</h1>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm transition ${category === c ? "bg-forest text-ivory" : "bg-sage/20 text-charcoal/60 hover:bg-sage/40"}`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 lg:flex">
              <label className="relative">
                <span className="sr-only">Search flowers</span>
                <Ico name="search" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flowers..." className="w-full rounded-full border border-forest/15 bg-transparent py-3 pl-11 pr-4 text-base focus:border-gold sm:text-sm lg:w-64" />
              </label>
              <label>
                <span className="sr-only">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-full rounded-full border border-forest/15 bg-transparent px-4 py-3 text-base focus:border-gold sm:px-5 sm:text-sm">
                  <option value="featured">Featured</option>
                  <option value="low">Price ↑</option>
                  <option value="high">Price ↓</option>
                </select>
              </label>
            </div>
          </div>

          {productsLoading ? (
            <div role="status" aria-label="Loading products" className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-4">
              <span className="sr-only">Loading products…</span>
              {Array.from({ length: 5 }, (_, index) => <ShopCardSkeleton key={index} />)}
            </div>
          ) : productsError ? (
            <p role="alert" className="py-20 text-center text-sm text-rose-dark">{productsError}</p>
          ) : visible.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif text-3xl text-forest">No flowers found</p>
              <p className="mt-2 text-sm text-charcoal/55">Try another search, or <a className="font-semibold text-forest underline" href={`https://wa.me/${WHATSAPP}`}>ask us on WhatsApp</a> for a custom order.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-4">
              {visible.map((p) => <ShopCard key={p.id} product={p} onOpen={() => setSelected(p)} />)}
            </div>
          )}

          <div className="mt-14 rounded-2xl bg-blush/20 px-6 py-5 text-center text-sm text-charcoal/70">
            <strong className="text-forest">Delivery options are calculated at checkout</strong> · Payment confirmation is updated by our team
          </div>
        </div>
      </section>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign in / sign up                                                  */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (options: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
        signIn: () => Promise<{ authorization: { id_token: string }; user?: { name?: { firstName?: string; lastName?: string } } }>;
      };
    };
  }
}

const providerScripts = new Map<string, Promise<void>>();

function loadProviderScript(id: string, src: string) {
  const pending = providerScripts.get(id);
  if (pending) return pending;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the sign-in provider."));
    document.head.appendChild(script);
  });
  providerScripts.set(id, promise);
  return promise;
}

function SocialAuthButtons({
  onLogin,
  onNotice,
  showApple = false,
}: {
  onLogin: (provider: "google" | "apple", input: { idToken: string; name?: string }) => Promise<void>;
  onNotice: (message: string) => void;
  showApple?: boolean;
}) {
  const googleButton = useRef<HTMLDivElement>(null);
  const loginRef = useRef(onLogin);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
  useEffect(() => { loginRef.current = onLogin; }, [onLogin]);

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return;
    let active = true;
    void loadProviderScript("google-identity", "https://accounts.google.com/gsi/client")
      .then(() => {
        if (!active || !googleButton.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void loginRef.current("google", { idToken: response.credential })
              .catch((error: unknown) => onNotice(error instanceof Error ? error.message : "Google sign-in failed."));
          },
        });
        window.google.accounts.id.renderButton(googleButton.current, { theme: "outline", size: "large", shape: "pill", width: 280, text: "continue_with" });
      })
      .catch((error: unknown) => onNotice(error instanceof Error ? error.message : "Could not load Google sign-in."));
    return () => { active = false; };
  }, [googleClientId, onNotice]);

  async function signInWithApple() {
    if (!appleClientId) {
      onNotice("Set VITE_APPLE_CLIENT_ID to enable Apple sign-in.");
      return;
    }
    try {
      await loadProviderScript("apple-signin", "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js");
      if (!window.AppleID) throw new Error("Apple sign-in did not initialize.");
      window.AppleID.auth.init({ clientId: appleClientId, scope: "name email", redirectURI: window.location.origin, usePopup: true });
      const response = await window.AppleID.auth.signIn();
      const name = [response.user?.name?.firstName, response.user?.name?.lastName].filter(Boolean).join(" ");
      await loginRef.current("apple", { idToken: response.authorization.id_token, name });
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Apple sign-in failed.");
    }
  }

  return (
    <div className="mt-5">
      {googleClientId
        ? <div ref={googleButton} className="flex min-h-12 items-center justify-center" />
        : <button type="button" disabled className="min-h-12 rounded-full border border-forest/15 px-4 text-sm text-charcoal/45">Google sign-in not configured</button>}
      {showApple && (
        <button type="button" disabled={!appleClientId} onClick={signInWithApple} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-forest/15 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:bg-sage/10 disabled:cursor-not-allowed disabled:opacity-45">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current"><path d="M17.05 12.54c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-.98 2.06-.59.88-1.2 1.75-2.16 1.77-.94.02-1.25-.57-2.33-.57-1.08 0-1.42.55-2.31.59-.92.04-1.62-.95-2.22-1.83-1.23-1.79-2.17-5.06-.91-7.27a3.44 3.44 0 0 1 2.9-1.76c.91-.02 1.77.62 2.33.62.56 0 1.61-.77 2.72-.66.47.02 1.8.19 2.66 1.44-.07.04-1.59.93-1.6 2.75ZM15.26 6.5a3.35 3.35 0 0 0 .76-2.4 3.4 3.4 0 0 0-2.2 1.13 3.17 3.17 0 0 0-.79 2.32 2.82 2.82 0 0 0 2.23-1.05Z" /></svg>
          {appleClientId ? "Link Apple account" : "Apple sign-in not configured"}
        </button>
      )}
    </div>
  );
}

function AuthForm({ heading, sub }: { heading: string; sub: string }) {
  const { logIn, signUp, socialLogin } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ name: "", email: "", identifier: "", password: "", confirmPassword: "" });
  const [err, setErr] = useState("");
  const [socialNotice, setSocialNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const passwordRequirements = [
    { label: "At least 8 characters", met: f.password.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(f.password) },
    { label: "At least one lowercase letter", met: /[a-z]/.test(f.password) },
    { label: "At least one number", met: /\d/.test(f.password) },
    { label: "At least one special character", met: /[^A-Za-z0-9\s]/.test(f.password) },
  ];
  const passwordIsValid = passwordRequirements.every((requirement) => requirement.met);
  async function submitSocial(provider: "google" | "apple", input: { idToken: string; name?: string }) {
    setErr("");
    try {
      await socialLogin(provider, input);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Social sign-in failed.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (mode === "signup") {
      if (!passwordIsValid) {
        setErr("Meet all password requirements before creating your account.");
        return;
      }
      if (f.password !== f.confirmPassword) {
        setErr("The passwords do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "login") await logIn(f.identifier, f.password);
      else await signUp({ name: f.name, email: f.email, password: f.password });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto max-w-md px-5">
        <p className="eyebrow justify-center">{mode === "login" ? "Welcome back" : "Join Petals Paradise"}</p>
        <h1 className="mt-3 text-center font-serif text-4xl leading-none text-forest sm:text-5xl">{heading}</h1>
        <p className="mt-3 text-center text-sm text-charcoal/60">{sub}</p>

        <div className="mt-8 grid grid-cols-2 rounded-full bg-sage/20 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setErr(""); setSocialNotice(""); }} className={`rounded-full py-2.5 text-sm font-semibold transition ${mode === m ? "bg-forest text-ivory" : "text-charcoal/60"}`}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <SocialAuthButtons onLogin={submitSocial} onNotice={setSocialNotice} />
        {socialNotice && <p role="status" className="mt-3 rounded-xl bg-sage/15 px-4 py-3 text-center text-sm text-forest">{socialNotice}</p>}
        <div className="my-5 flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-charcoal/40">
          <span className="h-px flex-1 bg-forest/10" />
          or continue with email
          <span className="h-px flex-1 bg-forest/10" />
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-5 rounded-3xl bg-white p-6 shadow-sm">
          {mode === "login" ? (
            <label className="field"><span>Phone or email</span><input required autoComplete="username" value={f.identifier} onChange={set("identifier")} placeholder="0712 345 678" /></label>
          ) : (
            <>
              <label className="field"><span>Your name</span><input required autoComplete="name" value={f.name} onChange={set("name")} placeholder="Jane Wanjiku" /></label>
              <label className="field"><span>Email</span><input required type="email" autoComplete="email" value={f.email} onChange={set("email")} placeholder="jane@email.com" /></label>
            </>
          )}
          <label className="field">
            <span>Password</span>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} placeholder={mode === "signup" ? "Create a password" : "Your password"} className="pr-16" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-normal text-forest underline">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {mode === "signup" && (
            <>
              <ul aria-label="Password requirements" className="grid gap-1 text-xs">
                {passwordRequirements.map((requirement) => (
                  <li key={requirement.label} className={requirement.met ? "text-green-700" : "text-charcoal/55"}>
                    <span aria-hidden="true">{requirement.met ? "✓" : "○"}</span>{" "}{requirement.label}
                  </li>
                ))}
              </ul>
              <label className="field">
                <span>Re-enter password</span>
                <div className="relative">
                  <input required type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={f.confirmPassword} onChange={set("confirmPassword")} placeholder="Enter your password again" className="pr-16" />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-normal text-forest underline">
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {f.confirmPassword && f.password !== f.confirmPassword && <span className="text-xs font-medium normal-case tracking-normal text-rose-dark">Passwords do not match.</span>}
                {f.confirmPassword && f.password === f.confirmPassword && <span className="text-xs font-medium normal-case tracking-normal text-green-700">Passwords match.</span>}
              </label>
            </>
          )}
          {err && <p role="alert" className="rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">{err}</p>}
          <Btn type="submit" disabled={busy} className="w-full !py-4">{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</Btn>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile / account                                                  */
/* ------------------------------------------------------------------ */

export function AccountPage() {
  const { user, authReady, authError, logOut, updateProfile, linkSocial, resendEmailVerification } = useAuth();
  const { deliveryOptions, deliveryLoading, deliveryError } = useCatalogue();
  const [tab, setTab] = useState<"details" | "orders">("details");
  const [form, setForm] = useState({ name: "", phone: "", email: "", area: "", address: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [socialError, setSocialError] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone ? `0${user.phone.slice(3)}` : "", email: user.email, area: user.area, address: user.address });
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "orders") return;
    let active = true;
    setOrdersLoading(true);
    apiRequest<ApiOrder[] | { results?: ApiOrder[] }>("/me/orders")
      .then((response) => {
        if (active) {
          setOrders(normalizeList(response));
          setOrdersError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setOrdersError(error instanceof Error ? error.message : "Could not load your orders.");
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => { active = false; };
  }, [user, tab]);

  if (!authReady) return <section className="py-20 text-center text-sm text-charcoal/60">Checking your account…</section>;
  if (authError) return <section className="mx-auto max-w-xl px-5 py-20 text-center"><p role="alert" className="text-sm text-rose-dark">{authError}</p><button onClick={() => window.location.reload()} className="mt-5 font-semibold text-forest underline">Try again</button></section>;
  if (!user) return <AuthForm heading="Your account" sub="Sign in to save your details and track your orders." />;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: e.target.value }));

  async function cancelOrder(orderId: string | number) {
    try {
      await apiRequest(`/orders/${encodeURIComponent(String(orderId))}/cancel`, { method: "POST" });
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: "cancelled" } : order));
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Could not cancel this order.");
    }
  }

  async function signOut() {
    try {
      await logOut();
    } catch (error) {
      setMsg({ ok: false, text: error instanceof Error ? error.message : "Could not sign out." });
    }
  }

  async function linkProvider(provider: "google" | "apple", input: { idToken: string }) {
    try {
      await linkSocial(provider, input.idToken);
      setSocialError("");
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : "Could not link this account.");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile(form);
      setMsg({ ok: true, text: "Your details have been saved." });
    } catch (x) {
      setMsg({ ok: false, text: x instanceof Error ? x.message : "Couldn't save. Please try again." });
    }
    setSaving(false);
  }

  async function resendVerification() {
    setVerificationBusy(true);
    setVerificationMessage("");
    try {
      await resendEmailVerification();
      setVerificationMessage("If this address needs verification, an email has been sent.");
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : "Could not send verification email.");
    } finally {
      setVerificationBusy(false);
    }
  }

  return (
    <section className="py-8 sm:py-14">
      <div className="mx-auto max-w-3xl px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="mt-2 font-serif text-4xl leading-none text-forest sm:text-5xl">Hello, {user.name.split(" ")[0]}</h1>
          </div>
          <button onClick={signOut} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-forest/25 px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage/20"><Ico name="logout" className="size-4" /> Sign out</button>
        </div>

        <div className="mt-8 flex gap-2">
          {(["details", "orders"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2.5 text-sm transition ${tab === t ? "bg-forest text-ivory" : "bg-sage/20 text-charcoal/60 hover:bg-sage/40"}`}>
              {t === "details" ? "My details" : `Orders (${orders.length})`}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <>
          <form onSubmit={save} className="mt-6 grid gap-5 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            <label className="field"><span>Name</span><input required value={form.name} onChange={set("name")} /></label>
            <label className="field"><span>Phone number (optional)</span><input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
            <label className="field sm:col-span-2"><span>Email</span><input type="email" value={form.email} onChange={set("email")} /></label>
            <h2 className="font-serif text-2xl text-forest sm:col-span-2">Default delivery address</h2>
            <label className="field"><span>Area</span>
              <select value={form.area} onChange={set("area")}>
                <option value="">Select an area</option>
                {deliveryOptions.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Street / building / landmark</span><input value={form.address} onChange={set("address")} placeholder="e.g. 359 Jalaram Road" /></label>
            {deliveryError && <p role="alert" className="text-sm text-rose-dark sm:col-span-2">{deliveryError}</p>}
            {deliveryLoading && <p className="text-sm text-charcoal/50 sm:col-span-2">Loading delivery areas…</p>}
            {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm sm:col-span-2 ${msg.ok ? "bg-sage/30 text-forest" : "bg-rose/10 text-rose-dark"}`}>{msg.text}</p>}
            <Btn type="submit" disabled={saving} className="sm:col-span-2">{saving ? "Saving..." : "Save details"}</Btn>
          </form>
          {user.email && !user.emailVerified && (
            <div className="mt-4 rounded-2xl bg-sage/20 p-5 text-sm text-charcoal">
              <p>Your email address is not verified yet.</p>
              <button type="button" onClick={resendVerification} disabled={verificationBusy} className="mt-2 font-semibold text-forest underline disabled:opacity-50">
                {verificationBusy ? "Sending..." : "Resend verification email"}
              </button>
              {verificationMessage && <p role="status" className="mt-2">{verificationMessage}</p>}
            </div>
          )}
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-serif text-2xl text-forest">Connected sign-in methods</h2>
            <p className="mt-2 text-sm text-charcoal/60">{user.socialProviders.length ? user.socialProviders.join(", ") : "No social accounts linked."}</p>
            {socialError && <p role="alert" className="mt-4 text-sm text-rose-dark">{socialError}</p>}
            <SocialAuthButtons onLogin={linkProvider} onNotice={setSocialError} showApple />
          </div>
          </>
        ) : ordersLoading ? (
          <p className="py-16 text-center text-sm text-charcoal/60">Loading your orders…</p>
        ) : ordersError ? (
          <p role="alert" className="mt-6 rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">{ordersError}</p>
        ) : orders.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-serif text-2xl text-forest">No orders yet</p>
            <p className="mt-2 text-sm text-charcoal/55">Your orders will show up here after checkout.</p>
            <Btn href="#/shop" className="mt-6">Browse flowers</Btn>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-serif text-xl text-forest">{o.reference ?? o.order_number ?? `Order ${o.id}`}</p>
                  <span className="rounded-full bg-sage/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-forest">{(o.payment_status ?? o.status).replace(/_/g, " ")}</span>
                </div>
                {o.created_at && <p className="mt-1 text-xs text-charcoal/50">{new Date(o.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>}
                <ul className="mt-4 space-y-1 text-sm text-charcoal/70">
                  {(o.items ?? []).map((item, index) => <li key={`${o.id}-${index}`} className="flex justify-between gap-4"><span>{item.quantity} × {item.name ?? item.product_name ?? "Product"}</span><span>{money(item.line_total ?? item.quantity * (item.unit_price ?? item.price ?? 0))}</span></li>)}
                </ul>
                <div className="mt-4 flex justify-between border-t border-forest/10 pt-3 text-sm"><span className="text-charcoal/55">{o.delivery_date ? `Delivery: ${o.delivery_date}${o.delivery_slot_label ? ` · ${o.delivery_slot_label}` : ""}` : "Order total"}</span><strong className="text-forest">{money(o.total ?? o.total_amount ?? 0)}</strong></div>
                {o.status === "pending_payment" && <button onClick={() => cancelOrder(o.id)} className="mt-4 text-sm font-semibold text-rose-dark underline">Cancel order</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout (login required)                                          */
/* ------------------------------------------------------------------ */

type CheckoutOrder = ApiOrder & { total?: number; total_amount?: number; reference?: string; order_number?: string };

function CheckoutForm({ user }: { user: User }) {
  const { lines, subtotal, clear, setQty, remove } = useCart();
  const { deliveryOptions, deliveryLoading, deliveryError } = useCatalogue();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [form, setForm] = useState({
    mpesaPhone: user.phone ? `0${user.phone.slice(3)}` : "",
    recipientName: user.name,
    recipientPhone: user.phone ? `0${user.phone.slice(3)}` : "",
    deliveryArea: user.area,
    deliveryAddress: user.address,
    deliveryDate: "",
    deliverySlot: "",
    cardMessage: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    idempotencyKey.current = null;
    setForm((current) => ({ ...current, [k]: e.target.value }));
  };

  const area = deliveryOptions.find((option) => option.id === form.deliveryArea);
  const selectedSlot = area?.timeSlots.find((slot) => String(slot.id) === form.deliverySlot);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dateAfterDays = (days: number) => {
    const date = new Date(`${today}T12:00:00+03:00`);
    date.setDate(date.getDate() + days);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };
  const minDate = dateAfterDays(area?.leadTimeDays ?? 0);
  const maxDate = dateAfterDays(area?.maxDaysAhead ?? 30);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!area || !selectedSlot) {
      setError("Select an available delivery area and time slot.");
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setSubmitting(true);
    try {
      const orderRequest: ApiCreateOrderRequest = {
        items: lines.map((line) => ({
          productId: line.id,
          variantId: line.variantId,
          presentationId: line.presentation,
          quantity: line.qty,
        })),
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        deliveryAddress: form.deliveryAddress,
        deliveryArea: area.id,
        deliverySlot: selectedSlot.id,
        deliveryDate: form.deliveryDate,
        cardMessage: form.cardMessage,
        mpesaPhone: form.mpesaPhone,
      };
      const response = await apiRequest<CheckoutOrder | { order: CheckoutOrder }>("/orders", {
        method: "POST",
        idempotencyKey: idempotencyKey.current,
        body: orderRequest,
      });
      const createdOrder = "order" in response ? response.order : response;
      if (createdOrder.id === undefined || !createdOrder.status) {
        throw new Error("The backend response did not include the created order details.");
      }
      setOrder(createdOrder);
      clear();
      window.scrollTo({ top: 0 });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We couldn't place your order. Please try again.");
      if (requestError instanceof ApiError && requestError.status < 500 && requestError.status !== 409) {
        idempotencyKey.current = null;
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    const ref = order.reference ?? order.order_number ?? `Order ${order.id}`;
    const orderTotal = order.total ?? order.total_amount;
    return (
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-forest text-ivory"><Ico name="check" className="size-9" /></span>
          <p className="eyebrow mt-8 justify-center">Order received</p>
          <h1 className="section-title">Thank you, {form.recipientName.split(" ")[0] || "friend"}!</h1>
          <p className="mx-auto mt-4 max-w-md text-charcoal/60">Your order is <strong>{order.status.replace(/_/g, " ")}</strong>. Payment has not been confirmed yet; our team will update the status once it is received.</p>
          <dl className="mx-auto mt-10 grid max-w-md gap-3 rounded-2xl bg-white p-6 text-left text-sm shadow-sm">
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Order number</dt><dd className="font-semibold text-forest">{ref}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Status</dt><dd className="font-semibold capitalize text-forest">{order.status.replace(/_/g, " ")}</dd></div>
            {orderTotal !== undefined && <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Order total</dt><dd className="font-semibold text-forest">{money(orderTotal)}</dd></div>}
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Delivery</dt><dd className="text-right font-semibold text-forest">{area?.name} · {form.deliveryDate} · {selectedSlot?.label}</dd></div>
          </dl>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Btn href="#/shop">Continue shopping</Btn>
            <Btn href="#/account" variant="outline">View my orders</Btn>
          </div>
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello Petals Paradise, I placed ${ref} and would like help with payment.`)}`} target="_blank" rel="noreferrer" className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1fb957]">Ask about payment on WhatsApp</a>
        </div>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="py-20 text-center">
        <div className="px-5">
          <p className="eyebrow justify-center">Checkout</p>
          <h1 className="section-title">Your cart is empty</h1>
          <Btn href="#/shop" className="mt-8">Browse flowers</Btn>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-32 pt-8 sm:py-16 lg:pb-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <a href="#/shop" className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-forest"><Ico name="back" className="size-4" /> Back to shop</a>
        <p className="eyebrow mt-4">Secure checkout</p>
        <h1 className="mt-2 font-serif text-4xl leading-none text-forest sm:text-5xl">Almost there</h1>

        <form id="checkout-form" onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
          <div className="space-y-6 sm:space-y-8">
            <fieldset className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-8">
              <legend className="sr-only">Your details</legend>
              <h2 className="font-serif text-3xl text-forest sm:col-span-2">1 · Your details</h2>
              <label className="field"><span>Your name</span><input readOnly value={user.name} /></label>
              <label className="field"><span>Email (for receipt)</span><input readOnly value={user.email} placeholder="No email on your account" /></label>
            </fieldset>

            <fieldset className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-8">
              <legend className="sr-only">Delivery</legend>
              <h2 className="font-serif text-3xl text-forest sm:col-span-2">2 · Delivery</h2>
              <label className="field"><span>Recipient name</span><input required value={form.recipientName} onChange={set("recipientName")} placeholder="Who is receiving?" /></label>
              <label className="field"><span>Recipient phone</span><input required type="tel" autoComplete="tel" value={form.recipientPhone} onChange={set("recipientPhone")} placeholder="0712 345 678" /></label>
              <label className="field"><span>Delivery area</span>
                <select required value={form.deliveryArea} onChange={(event) => {
                  set("deliveryArea")(event);
                  setForm((current) => ({ ...current, deliverySlot: "" }));
                }}>
                  <option value="" disabled>
                    {deliveryLoading ? "Loading areas…" : deliveryOptions.length ? "Select an area" : "No delivery areas available"}
                  </option>
                  {deliveryOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {money(option.fee)}</option>)}
                </select>
              </label>
              <label className="field"><span>Street / building / landmark</span><input required value={form.deliveryAddress} onChange={set("deliveryAddress")} placeholder="e.g. 359 Jalaram Road, 3rd floor" /></label>
              <label className="field"><span>Delivery date</span><input required type="date" disabled={!area} min={minDate} max={maxDate} value={form.deliveryDate} onChange={set("deliveryDate")} /></label>
              <label className="field"><span>Time slot</span>
                <select required value={form.deliverySlot} onChange={set("deliverySlot")} disabled={!area}>
                  <option value="" disabled>
                    {!area ? "Select a delivery area first" : area.timeSlots.length ? "Select a time slot" : "No time slots available"}
                  </option>
                  {area?.timeSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}
                </select>
              </label>
              {!deliveryLoading && !deliveryError && !deliveryOptions.length && (
                <p role="status" className="text-sm text-rose-dark sm:col-span-2">
                  Delivery areas are not available right now. Please contact us to arrange delivery.
                </p>
              )}
              {area && !area.timeSlots.length && (
                <p role="status" className="text-sm text-rose-dark sm:col-span-2">
                  No time slots are configured for this area yet. Please contact us to arrange delivery.
                </p>
              )}
              <label className="field sm:col-span-2"><span>Card message (optional)</span><textarea rows={3} value={form.cardMessage} onChange={set("cardMessage")} placeholder="Write something heartfelt, we'll handwrite it..." /></label>
            </fieldset>

            <fieldset className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
              <legend className="sr-only">Payment</legend>
              <h2 className="font-serif text-3xl text-forest">3 · Pay with M-Pesa</h2>
              <p className="mt-3 flex items-start gap-3 text-sm text-charcoal/65"><Ico name="phone" className="mt-0.5 size-5 shrink-0 text-forest" /> Enter the number you use for M-Pesa. The current API records your order but does not yet send an M-Pesa prompt; payment remains pending until confirmed.</p>
              <label className="field mt-5 max-w-sm"><span>M-Pesa phone number</span><input required type="tel" inputMode="tel" autoComplete="tel" value={form.mpesaPhone} onChange={set("mpesaPhone")} placeholder="0712 345 678" /></label>
              {deliveryLoading && <p className="mt-4 text-sm text-charcoal/55">Loading delivery options…</p>}
              {deliveryError && <p role="alert" className="mt-4 text-sm text-rose-dark">{deliveryError}</p>}
              {error && <p role="alert" className="mt-4 rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">{error}</p>}
            </fieldset>
          </div>

          <aside className="h-fit rounded-3xl bg-ivory p-5 shadow-sm ring-1 ring-forest/10 sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-serif text-3xl text-forest">Order summary</h2>
            <ul className="mt-4 divide-y divide-forest/10">
              {lines.map(({ product, qty, key, variantLabel, presentationLabel }) => (
                <li key={key} className="flex gap-4 py-4">
                  <img src={product.image} alt={product.imageAlt} className="size-16 shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg leading-tight text-forest">{product.name}</p>
                    <p className="mt-1 text-xs text-charcoal/50">{variantLabel} · {presentationLabel}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-charcoal/55">
                      <QtyStepper qty={qty} max={product.stock ?? Number.MAX_SAFE_INTEGER} onChange={(q) => setQty(key, q)} />
                      <button type="button" onClick={() => remove(key)} className="py-2 underline transition hover:text-rose">Remove</button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-forest">{money(qty * product.price)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-forest/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-charcoal/60">Delivery</dt><dd>{area ? money(area.fee) : "Select area"}</dd></div>
              <div className="flex justify-between border-t border-forest/10 pt-3 text-base"><dt className="font-semibold text-forest">Estimated total</dt><dd className="font-semibold text-forest">{money(subtotal + (area?.fee ?? 0))}</dd></div>
              <p className="mt-2 text-xs text-charcoal/50">Final total is calculated by the server when you place the order.</p>
            </dl>
            <div className="hidden lg:block">
              <Btn type="submit" disabled={submitting || deliveryLoading || !deliveryOptions.length} className="mt-6 w-full !py-4"><Ico name="lock" className="size-4" /> {submitting ? "Placing order…" : `Place order · ${money(subtotal + (area?.fee ?? 0))}`}</Btn>
            </div>
          </aside>
        </form>
      </div>

      {/* Mobile sticky pay bar */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-4 border-t border-forest/10 bg-ivory px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(36,74,58,0.08)] lg:hidden">
          <div><p className="text-xs text-charcoal/55">Estimated total</p><p className="text-lg font-semibold text-forest">{money(subtotal + (area?.fee ?? 0))}</p></div>
          <button type="submit" form="checkout-form" disabled={submitting || deliveryLoading || !deliveryOptions.length} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-ivory transition hover:bg-forest-light disabled:opacity-50"><Ico name="lock" className="size-4" /> {submitting ? "Placing order…" : "Place order"}</button>
        </div>,
        document.body,
      )}
    </section>
  );
}

function CheckoutPage() {
  const { user, authReady, authError } = useAuth();
  const { count } = useCart();
  if (!authReady) return <section className="py-20 text-center text-sm text-charcoal/60">Checking your account…</section>;
  if (authError) return <section className="mx-auto max-w-xl px-5 py-20 text-center"><p role="alert" className="text-sm text-rose-dark">{authError}</p><button onClick={() => window.location.reload()} className="mt-5 font-semibold text-forest underline">Try again</button></section>;
  // Not signed in → sign in right here, then the checkout form appears (cart is kept).
  if (!user) {
    return <AuthForm heading="Sign in to checkout" sub={count > 0 ? "Your cart is saved. Sign in or create an account to place your order." : "Sign in or create an account to place your order."} />;
  }
  return <CheckoutForm key={user.id} user={user} />;
}

/* ------------------------------------------------------------------ */
/*  Router entry                                                       */
/* ------------------------------------------------------------------ */

export function ShopRouter({ route }: { route: string }) {
  if (route.startsWith("/checkout")) return <CheckoutPage />;
  if (route.startsWith("/account")) return <AccountPage />;
  if (route.startsWith("/verify-email")) return <EmailVerificationPage route={route} />;
  return <ShopPage />;
}

function EmailVerificationPage({ route }: { route: string }) {
  const [result, setResult] = useState<{ state: "loading" | "success" | "error"; message: string }>({
    state: "loading",
    message: "Verifying your email...",
  });

  useEffect(() => {
    const query = route.split("?", 2)[1] ?? "";
    const token = new URLSearchParams(query).get("token");
    if (!token) {
      setResult({ state: "error", message: "This verification link is missing its token." });
      return;
    }
    let active = true;
    apiRequest<{ email_verified: boolean }>("/auth/verify-email", {
      method: "POST",
      body: { token },
    }).then(() => {
      if (active) setResult({ state: "success", message: "Your email has been verified. You can return to Petals Paradise." });
    }).catch((error: unknown) => {
      if (active) setResult({
        state: "error",
        message: error instanceof Error ? error.message : "Could not verify this email.",
      });
    });
    return () => { active = false; };
  }, [route]);

  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-serif text-4xl text-forest">Email verification</h1>
      <p role={result.state === "error" ? "alert" : "status"} className="mt-4 text-sm text-charcoal/70">{result.message}</p>
      {result.state === "error" && <a href="#/account" className="mt-5 inline-block font-semibold text-forest underline">Go to your account</a>}
    </section>
  );
}
