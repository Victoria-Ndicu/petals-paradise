import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CATALOGUE } from "./catalogue-data";

/* ------------------------------------------------------------------ */
/*  Data (swap for your API / database later)                          */
/* ------------------------------------------------------------------ */

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export type Category = "Flowers" | "Fruit & gifts";

export type Product = {
  id: string;
  name: string;
  note: string;
  ingredients: string;
  palette: string;
  description: string;
  price: number;
  prices: number[];
  presentations: string[];
  category: Category;
  image: string;
  imageAlt: string;
  occasions: string[];
  seasonal: boolean;
  photoBrief: string;
  tag?: string;
  stock: number;
};

const flowerImages = ["photo-1523693916903-027d144a2b7d", "photo-1644248423203-80e317d78aee", "photo-1567418938902-aa650a3eb346", "photo-1674758445398-c2989470fa8a"];

export const PRODUCTS: Product[] = CATALOGUE.map((product, index) => ({
  ...product,
  note: product.ingredients,
  price: product.prices[0],
  image: img(product.category === "Flowers" ? flowerImages[index % flowerImages.length] : "photo-1610832958506-aa56368176cf"),
  tag: product.seasonal ? "Seasonal" : undefined,
  stock: 99,
}));

const CATEGORIES: ("All" | Category)[] = ["All", "Flowers", "Fruit & gifts"];

/** Placeholder delivery fees: edit to match your real zones. */
export const DELIVERY_AREAS = [
  { name: "Westlands", fee: 200 },
  { name: "Kilimani / Lavington", fee: 300 },
  { name: "Nairobi CBD", fee: 300 },
  { name: "Thika Road / Roysambu", fee: 450 },
  { name: "Karen / Langata", fee: 500 },
  { name: "Other Nairobi areas", fee: 600 },
];

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
  route.startsWith("/shop") || route.startsWith("/checkout") || route.startsWith("/account");

/* ------------------------------------------------------------------ */
/*  Auth (frontend placeholder, replace authApi with your backend)     */
/* ------------------------------------------------------------------ */

export type User = { id: string; name: string; phone: string; email: string; area: string; address: string };
type StoredUser = User & { hash: string };

const USERS_KEY = "pp-users";
const SESSION_KEY = "pp-session";
const ORDERS_KEY = "pp-orders";

export type Order = {
  ref: string;
  receipt: string;
  userId: string;
  date: string;
  total: number;
  delivery: string;
  items: { name: string; qty: number; price: number }[];
};

const publicUser = (u: StoredUser): User => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, area: u.area, address: u.address });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * DEV-ONLY: users live in this browser's localStorage so you can build and test the UI.
 * Replace each method with a call to your backend (POST /api/auth/signup, /login, PATCH /api/me)
 * and use secure, httpOnly session cookies. Never ship real authentication in the browser.
 */
const authApi = {
  async signUp(i: { name: string; phone: string; email: string; password: string }): Promise<User> {
    const phone = normalizeKenyanPhone(i.phone);
    if (!i.name.trim()) throw new Error("Please enter your name.");
    if (!phone) throw new Error("Enter a valid phone number, e.g. 0712 345 678.");
    if (i.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const email = i.email.trim().toLowerCase();
    const users = read<StoredUser[]>(USERS_KEY, []);
    if (users.some((u) => u.phone === phone)) throw new Error("An account with this number already exists. Try signing in.");
    if (email && users.some((u) => u.email === email)) throw new Error("An account with this email already exists. Try signing in.");
    const user: StoredUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: i.name.trim(), phone, email, area: "", address: "",
      hash: await sha256(i.password),
    };
    write(USERS_KEY, [...users, user]);
    return publicUser(user);
  },
  async logIn(identifier: string, password: string): Promise<User> {
    const id = identifier.trim();
    const users = read<StoredUser[]>(USERS_KEY, []);
    const phone = id.includes("@") ? null : normalizeKenyanPhone(id);
    const found = users.find((u) => (phone ? u.phone === phone : u.email === id.toLowerCase()));
    if (!found || found.hash !== (await sha256(password))) throw new Error("Wrong phone/email or password.");
    return publicUser(found);
  },
  async update(userId: string, patch: Partial<Omit<User, "id">>): Promise<User> {
    const users = read<StoredUser[]>(USERS_KEY, []);
    const me = users.find((u) => u.id === userId);
    if (!me) throw new Error("Please sign in again.");
    const next = { ...me, ...patch };
    if (patch.phone !== undefined) {
      const phone = normalizeKenyanPhone(patch.phone);
      if (!phone) throw new Error("Enter a valid phone number, e.g. 0712 345 678.");
      if (users.some((u) => u.id !== userId && u.phone === phone)) throw new Error("That number is used by another account.");
      next.phone = phone;
    }
    if (!next.name.trim()) throw new Error("Please enter your name.");
    write(USERS_KEY, users.map((u) => (u.id === userId ? next : u)));
    return publicUser(next);
  },
};

type AuthCtx = {
  user: User | null;
  logIn: (identifier: string, password: string) => Promise<void>;
  signUp: (i: { name: string; phone: string; email: string; password: string }) => Promise<void>;
  logOut: () => void;
  updateProfile: (patch: Partial<Omit<User, "id">>) => Promise<void>;
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

type CartLine = { key: string; id: string; qty: number; price: number; sizeIndex: number; presentation: string };
type CartVariant = { price: number; sizeIndex: number; presentation: string };

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
const CART_KEY = "petals-paradise-cart";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <ShopProvider>");
  return ctx;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  /* cart */
  const [raw, setRaw] = useState<CartLine[]>(() => {
    const saved = read<Array<Partial<CartLine> & Pick<CartLine, "id" | "qty">>>(CART_KEY, []);
    return saved.flatMap((line) => {
      const product = PRODUCTS.find((item) => item.id === line.id);
      if (!product) return [];
      const sizeIndex = line.sizeIndex ?? 0;
      const presentation = line.presentation ?? product.presentations[0];
      return [{
        key: line.key ?? `${line.id}:${sizeIndex}:${presentation}`,
        id: line.id,
        qty: line.qty,
        price: line.price ?? product.prices[sizeIndex] ?? product.price,
        sizeIndex,
        presentation,
      }];
    });
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => write(CART_KEY, raw), [raw]);

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
    const product = PRODUCTS.find((p) => p.id === id);
    const stock = product?.stock ?? 99;
    const selected = variant ?? { price: product?.prices[0] ?? 0, sizeIndex: 0, presentation: product?.presentations[0] ?? "" };
    const key = `${id}:${selected.sizeIndex}:${selected.presentation}`;
    setRaw((cur) => {
      const found = cur.find((line) => line.key === key);
      if (found) return cur.map((line) => (line.key === key ? { ...line, qty: Math.min(stock, line.qty + qty) } : line));
      return [...cur, { key, id, qty: Math.min(stock, qty), ...selected }];
    });
    setToast(`${product?.name ?? "Item"} added to cart`);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setRaw((cur) =>
      qty <= 0 ? cur.filter((line) => line.key !== key) : cur.map((line) => (line.key === key ? { ...line, qty: Math.min(PRODUCTS.find((product) => product.id === line.id)?.stock ?? 99, qty) } : line)),
    );
  }, []);
  const remove = useCallback((key: string) => setRaw((cur) => cur.filter((line) => line.key !== key)), []);
  const clear = useCallback(() => setRaw([]), []);

  const cart = useMemo<CartCtx>(() => {
    const lines = raw.flatMap((line) => {
      const product = PRODUCTS.find((item) => item.id === line.id);
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
  }, [raw, add, setQty, remove, clear, drawerOpen, toast]);

  /* auth */
  const [user, setUser] = useState<User | null>(() => {
    const id = read<string | null>(SESSION_KEY, null);
    const found = read<StoredUser[]>(USERS_KEY, []).find((u) => u.id === id);
    return found ? publicUser(found) : null;
  });

  const auth = useMemo<AuthCtx>(
    () => ({
      user,
      logIn: async (identifier, password) => {
        const u = await authApi.logIn(identifier, password);
        write(SESSION_KEY, u.id);
        setUser(u);
      },
      signUp: async (input) => {
        const u = await authApi.signUp(input);
        write(SESSION_KEY, u.id);
        setUser(u);
      },
      logOut: () => {
        write(SESSION_KEY, null);
        setUser(null);
      },
      updateProfile: async (patch) => {
        if (!user) return;
        setUser(await authApi.update(user.id, patch));
      },
    }),
    [user],
  );

  return (
    <AuthContext.Provider value={auth}>
      <CartContext.Provider value={cart}>{children}</CartContext.Provider>
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
                  {lines.map(({ product, qty, key, sizeIndex, presentation }) => (
                    <li key={key} className="flex gap-4 py-5">
                      <img src={product.image} alt={product.imageAlt} className="size-20 shrink-0 object-cover sm:size-24" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-xl leading-tight text-forest">{product.name}</h3>
                          <button aria-label={`Remove ${product.name}`} onClick={() => remove(key)} className="grid size-8 shrink-0 place-items-center text-charcoal/40 transition hover:text-rose"><Ico name="trash" className="size-4" /></button>
                        </div>
                        <p className="mt-0.5 text-xs text-charcoal/50">Size {sizeIndex + 1} · {presentation === "giftbasket" ? "Gift basket" : presentation} · {money(product.price)} each</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <QtyStepper qty={qty} max={product.stock} onChange={(q) => setQty(key, q)} />
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
    <article className="group">
      <button onClick={onOpen} className="relative block aspect-[4/5] w-full overflow-hidden bg-blush/30 text-left" aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.imageAlt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        {product.tag && <span className="absolute left-3 top-3 rounded-full bg-ivory/90 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-forest backdrop-blur sm:left-4 sm:top-4">{product.tag}</span>}
        {product.stock > 0 && product.stock <= 5 && <span className="absolute bottom-3 left-3 rounded-full bg-rose px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ivory sm:bottom-4 sm:left-4">Only {product.stock} left</span>}
      </button>
      <div className="pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-2xl text-forest">{product.name}</h3>
            <p className="mt-1 text-sm text-charcoal/55">{product.note}</p>
          </div>
          <p className="shrink-0 font-semibold text-forest">From {money(product.price)}</p>
        </div>
        <Btn disabled={soldOut} onClick={onOpen} className="mt-4 w-full !py-3">
          {soldOut ? "Sold out" : <>Choose options <Ico name="bag" className="size-4" /></>}
        </Btn>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [presentation, setPresentation] = useState(product.presentations[0]);
  const price = product.prices[sizeIndex];

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
        <img src={product.image} alt={product.imageAlt} className="h-64 w-full object-cover md:h-full md:min-h-[32rem]" />
        <div className="flex flex-col p-6 sm:p-10">
          <p className="eyebrow">{product.category}</p>
          <h2 className="mt-3 font-serif text-4xl leading-none text-forest sm:text-5xl">{product.name}</h2>
          <p className="mt-4 text-2xl font-semibold text-forest">{money(price)}</p>
          <p className="mt-4 leading-7 text-charcoal/65">{product.description}</p>
          <p className="mt-3 text-sm text-charcoal/50">{product.ingredients} · {product.palette}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="field"><span>Size</span>
              <select value={sizeIndex} onChange={(event) => setSizeIndex(Number(event.target.value))}>
                {product.prices.map((tierPrice, index) => <option key={index} value={index}>Size {index + 1} · {money(tierPrice)}</option>)}
              </select>
            </label>
            <label className="field"><span>Presentation</span>
              <select value={presentation} onChange={(event) => setPresentation(event.target.value)}>
                {product.presentations.map((option) => <option key={option} value={option}>{option === "giftbasket" ? "Gift basket" : option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-charcoal/50">Occasions: {product.occasions.join(", ")}</p>
          <ul className="mt-5 space-y-2 text-sm text-charcoal/65">
            <li className="flex items-center gap-2"><Ico name="truck" className="size-4 shrink-0 text-gold" /> Same-day Nairobi delivery</li>
            <li className="flex items-center gap-2"><Ico name="lock" className="size-4 shrink-0 text-gold" /> Secure payment with M-Pesa</li>
          </ul>
          <div className="mt-auto flex items-center gap-3 pt-7">
            <QtyStepper qty={qty} max={product.stock} onChange={(q) => setQty(Math.max(1, q))} />
            <Btn disabled={product.stock === 0} onClick={() => { add(product.id, qty, { price, sizeIndex, presentation }); onClose(); }} className="flex-1 !px-4">
              Add · {money(price * qty)}
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

  const visible = useMemo(() => {
    let list = PRODUCTS.filter(
      (p) => (category === "All" || p.category === category) && `${p.name} ${p.note} ${p.occasions.join(" ")}`.toLowerCase().includes(query.toLowerCase()),
    );
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [category, query, sort]);

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

          {visible.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif text-3xl text-forest">No flowers found</p>
              <p className="mt-2 text-sm text-charcoal/55">Try another search, or <a className="font-semibold text-forest underline" href={`https://wa.me/${WHATSAPP}`}>ask us on WhatsApp</a> for a custom order.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-x-7 gap-y-12 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => <ShopCard key={p.id} product={p} onOpen={() => setSelected(p)} />)}
            </div>
          )}

          <div className="mt-14 rounded-2xl bg-blush/20 px-6 py-5 text-center text-sm text-charcoal/70">
            <strong className="text-forest">Same-day Nairobi delivery</strong> · Pay securely with M-Pesa
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

function AuthForm({ heading, sub }: { heading: string; sub: string }) {
  const { logIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ name: "", phone: "", email: "", identifier: "", password: "" });
  const [err, setErr] = useState("");
  const [socialNotice, setSocialNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") await logIn(f.identifier, f.password);
      else await signUp({ name: f.name, phone: f.phone, email: f.email, password: f.password });
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setSocialNotice("Google sign-in will be available once the authentication backend is connected.")} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-forest/15 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:bg-sage/10">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.91 3.27-4.73 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.15a11 11 0 0 0 0 9.9l3.69-2.84Z" />
              <path fill="#EA4335" d="M12 5.36c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.03 14.97 1 12 1a11 11 0 0 0-9.85 6.05l3.69 2.84C6.71 7.29 9.14 5.36 12 5.36Z" />
            </svg>
            Continue with Google
          </button>
          <button type="button" onClick={() => setSocialNotice("Apple sign-in will be available once the authentication backend is connected.")} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-forest/15 bg-white px-4 py-3 text-sm font-semibold text-charcoal transition hover:bg-sage/10">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
              <path d="M17.05 12.54c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-.98 2.06-.59.88-1.2 1.75-2.16 1.77-.94.02-1.25-.57-2.33-.57-1.08 0-1.42.55-2.31.59-.92.04-1.62-.95-2.22-1.83-1.23-1.79-2.17-5.06-.91-7.27a3.44 3.44 0 0 1 2.9-1.76c.91-.02 1.77.62 2.33.62.56 0 1.61-.77 2.72-.66.47.02 1.8.19 2.66 1.44-.07.04-1.59.93-1.6 2.75ZM15.26 6.5a3.35 3.35 0 0 0 .76-2.4 3.4 3.4 0 0 0-2.2 1.13 3.17 3.17 0 0 0-.79 2.32 2.82 2.82 0 0 0 2.23-1.05Z" />
            </svg>
            Continue with Apple
          </button>
        </div>
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
              <label className="field"><span>Phone number</span><input required type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="0712 345 678" /></label>
              <label className="field"><span>Email (optional)</span><input type="email" autoComplete="email" value={f.email} onChange={set("email")} placeholder="jane@email.com" /></label>
            </>
          )}
          <label className="field"><span>Password</span><input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} /></label>
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
  const { user, logOut, updateProfile } = useAuth();
  const [tab, setTab] = useState<"details" | "orders">("details");
  const [form, setForm] = useState({ name: "", phone: "", email: "", area: "", address: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone ? `0${user.phone.slice(3)}` : "", email: user.email, area: user.area, address: user.address });
  }, [user]);

  if (!user) return <AuthForm heading="Your account" sub="Sign in to save your details and track your orders." />;

  const orders = read<Order[]>(ORDERS_KEY, []).filter((o) => o.userId === user.id);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: e.target.value }));

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

  return (
    <section className="py-8 sm:py-14">
      <div className="mx-auto max-w-3xl px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="mt-2 font-serif text-4xl leading-none text-forest sm:text-5xl">Hello, {user.name.split(" ")[0]}</h1>
          </div>
          <button onClick={logOut} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-forest/25 px-4 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage/20"><Ico name="logout" className="size-4" /> Sign out</button>
        </div>

        <div className="mt-8 flex gap-2">
          {(["details", "orders"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2.5 text-sm transition ${tab === t ? "bg-forest text-ivory" : "bg-sage/20 text-charcoal/60 hover:bg-sage/40"}`}>
              {t === "details" ? "My details" : `Orders (${orders.length})`}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <form onSubmit={save} className="mt-6 grid gap-5 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            <label className="field"><span>Name</span><input required value={form.name} onChange={set("name")} /></label>
            <label className="field"><span>Phone number</span><input required type="tel" value={form.phone} onChange={set("phone")} /></label>
            <label className="field sm:col-span-2"><span>Email</span><input type="email" value={form.email} onChange={set("email")} /></label>
            <h2 className="font-serif text-2xl text-forest sm:col-span-2">Default delivery address</h2>
            <label className="field"><span>Area</span>
              <select value={form.area} onChange={set("area")}>
                <option value="">Select an area</option>
                {DELIVERY_AREAS.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Street / building / landmark</span><input value={form.address} onChange={set("address")} placeholder="e.g. 359 Jalaram Road" /></label>
            {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm sm:col-span-2 ${msg.ok ? "bg-sage/30 text-forest" : "bg-rose/10 text-rose-dark"}`}>{msg.text}</p>}
            <Btn type="submit" disabled={saving} className="sm:col-span-2">{saving ? "Saving..." : "Save details"}</Btn>
          </form>
        ) : orders.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-serif text-2xl text-forest">No orders yet</p>
            <p className="mt-2 text-sm text-charcoal/55">Your orders will show up here after checkout.</p>
            <Btn href="#/shop" className="mt-6">Browse flowers</Btn>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((o) => (
              <li key={o.ref} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-serif text-xl text-forest">{o.ref}</p>
                  <span className="rounded-full bg-sage/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-forest">Paid</span>
                </div>
                <p className="mt-1 text-xs text-charcoal/50">{new Date(o.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · M-Pesa {o.receipt}</p>
                <ul className="mt-4 space-y-1 text-sm text-charcoal/70">
                  {o.items.map((i) => <li key={i.name} className="flex justify-between gap-4"><span>{i.qty} × {i.name}</span><span>{money(i.qty * i.price)}</span></li>)}
                </ul>
                <div className="mt-4 flex justify-between border-t border-forest/10 pt-3 text-sm"><span className="text-charcoal/55">Delivery: {o.delivery}</span><strong className="text-forest">{money(o.total)}</strong></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  M-Pesa (STK push)                                                  */
/* ------------------------------------------------------------------ */

/** Accepts 07XXXXXXXX, 01XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX → 2547XXXXXXXX */
export function normalizeKenyanPhone(input: string): string | null {
  const d = input.replace(/[\s\-()+]/g, "");
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
}

type PayResult = { ok: true; receipt: string } | { ok: false; message: string };

/**
 * FRONTEND PLACEHOLDER. Replace the body with real calls once the backend exists:
 *   1. POST /api/orders           → creates the order, returns { orderId }
 *   2. POST /api/mpesa/stkpush    → backend calls Daraja STK Push, returns { checkoutRequestId }
 *   3. Poll GET /api/mpesa/status/:checkoutRequestId (or use websockets)
 *      until the Daraja callback marks it PAID / FAILED / CANCELLED.
 * Never put Daraja keys in the frontend.
 */
async function payWithMpesa(_payload: { phone: string; amount: number; reference: string }): Promise<PayResult> {
  await new Promise((r) => setTimeout(r, 3500)); // simulates the customer entering their PIN
  return { ok: true, receipt: `SIM${Math.random().toString(36).slice(2, 9).toUpperCase()}` };
}

/* ------------------------------------------------------------------ */
/*  Checkout (login required)                                          */
/* ------------------------------------------------------------------ */

type Stage = "form" | "waiting" | "success" | "failed";

function CheckoutForm({ user }: { user: User }) {
  const { lines, subtotal, clear, setQty, remove } = useCart();
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [paid, setPaid] = useState(0);
  const [form, setForm] = useState({
    name: user.name,
    mpesaPhone: user.phone ? `0${user.phone.slice(3)}` : "",
    email: user.email,
    recipient: "", recipientPhone: "",
    area: user.area, address: user.address,
    date: "", slot: "Morning (8am–12pm)", message: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const area = DELIVERY_AREAS.find((a) => a.name === form.area);
  const delivery = area?.fee ?? 0;
  const total = subtotal + delivery;
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const phone = normalizeKenyanPhone(form.mpesaPhone);
    if (!phone) {
      setError("Enter a valid phone number, e.g. 0712 345 678.");
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }
    const ref = `PP-${Date.now().toString().slice(-6)}`;
    setOrderRef(ref);
    setStage("waiting");
    try {
      const res = await payWithMpesa({ phone, amount: total, reference: ref });
      if (res.ok) {
        const order: Order = {
          ref, receipt: res.receipt, userId: user.id, date: new Date().toISOString(), total,
          delivery: `${form.date} · ${form.slot}`,
          items: lines.map((line) => ({ name: `${line.product.name} · Size ${line.sizeIndex + 1} · ${line.presentation}`, qty: line.qty, price: line.product.price })),
        };
        write(ORDERS_KEY, [order, ...read<Order[]>(ORDERS_KEY, [])]);
        setReceipt(res.receipt);
        setPaid(total);
        clear();
        setStage("success");
        window.scrollTo({ top: 0 });
      } else {
        setError(res.message);
        setStage("failed");
      }
    } catch {
      setError("We couldn't reach M-Pesa. Please try again.");
      setStage("failed");
    }
  }

  if (stage === "success") {
    return (
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-forest text-ivory"><Ico name="check" className="size-9" /></span>
          <p className="eyebrow mt-8 justify-center">Payment received</p>
          <h1 className="section-title">Thank you, {form.name.split(" ")[0] || "friend"}!</h1>
          <p className="mx-auto mt-4 max-w-md text-charcoal/60">Our florists are preparing your order. We'll confirm delivery on WhatsApp and SMS.</p>
          <dl className="mx-auto mt-10 grid max-w-md gap-3 rounded-2xl bg-white p-6 text-left text-sm shadow-sm">
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Order number</dt><dd className="font-semibold text-forest">{orderRef}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">M-Pesa receipt</dt><dd className="font-semibold text-forest">{receipt}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Amount paid</dt><dd className="font-semibold text-forest">{money(paid)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-charcoal/55">Delivery</dt><dd className="text-right font-semibold text-forest">{form.date} · {form.slot}</dd></div>
          </dl>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Btn href="#/shop">Continue shopping</Btn>
            <Btn href="#/account" variant="outline">View my orders</Btn>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello Petals Paradise, I have completed order ${orderRef}. Please help me with any questions.`)}`}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1fb957]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
              <path d="M20.52 3.48A11.85 11.85 0 0 0 12.08 0C5.5 0 .14 5.36.14 11.94c0 2.1.55 4.15 1.6 5.96L.05 24l6.25-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.58 0 11.94-5.36 11.94-11.94 0-3.19-1.24-6.19-3.5-8.41ZM12.08 21.8a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.71.97.99-3.62-.23-.37a9.86 9.86 0 0 1-1.52-5.24c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.82 9.82 0 0 1 2.9 7c-.02 5.44-4.46 9.85-9.92 9.85Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35Z" />
            </svg>
            Message us on WhatsApp
          </a>
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
              <label className="field"><span>Your name</span><input required value={form.name} onChange={set("name")} placeholder="Jane Wanjiku" /></label>
              <label className="field"><span>Email (for receipt)</span><input type="email" value={form.email} onChange={set("email")} placeholder="jane@email.com" /></label>
            </fieldset>

            <fieldset className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-8">
              <legend className="sr-only">Delivery</legend>
              <h2 className="font-serif text-3xl text-forest sm:col-span-2">2 · Delivery</h2>
              <label className="field"><span>Recipient name</span><input required value={form.recipient} onChange={set("recipient")} placeholder="Who is receiving?" /></label>
              <label className="field"><span>Recipient phone</span><input required type="tel" value={form.recipientPhone} onChange={set("recipientPhone")} placeholder="0712 345 678" /></label>
              <label className="field"><span>Delivery area</span>
                <select required value={form.area} onChange={set("area")}>
                  <option value="" disabled>Select an area</option>
                  {DELIVERY_AREAS.map((a) => <option key={a.name} value={a.name}>{a.name} · {money(a.fee)}</option>)}
                </select>
              </label>
              <label className="field"><span>Street / building / landmark</span><input required value={form.address} onChange={set("address")} placeholder="e.g. 359 Jalaram Road, 3rd floor" /></label>
              <label className="field"><span>Delivery date</span><input required type="date" min={today} value={form.date} onChange={set("date")} /></label>
              <label className="field"><span>Time slot</span>
                <select value={form.slot} onChange={set("slot")}>
                  <option>Morning (8am–12pm)</option>
                  <option>Afternoon (12pm–4pm)</option>
                  <option>Evening (4pm–6pm)</option>
                </select>
              </label>
              <label className="field sm:col-span-2"><span>Card message (optional)</span><textarea rows={3} value={form.message} onChange={set("message")} placeholder="Write something heartfelt, we'll handwrite it..." /></label>
            </fieldset>

            <fieldset className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
              <legend className="sr-only">Payment</legend>
              <h2 className="font-serif text-3xl text-forest">3 · Pay with M-Pesa</h2>
              <p className="mt-3 flex items-start gap-3 text-sm text-charcoal/65"><Ico name="phone" className="mt-0.5 size-5 shrink-0 text-forest" /> You'll get an M-Pesa prompt on your phone. Enter your PIN to complete payment.</p>
              <label className="field mt-5 max-w-sm"><span>Phone number</span><input required type="tel" inputMode="tel" autoComplete="tel" value={form.mpesaPhone} onChange={set("mpesaPhone")} placeholder="0712 345 678" /></label>
              {error && stage === "form" && <p role="alert" className="mt-4 rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose-dark">{error}</p>}
            </fieldset>
          </div>

          <aside className="h-fit rounded-3xl bg-ivory p-5 shadow-sm ring-1 ring-forest/10 sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-serif text-3xl text-forest">Order summary</h2>
            <ul className="mt-4 divide-y divide-forest/10">
              {lines.map(({ product, qty, key, sizeIndex, presentation }) => (
                <li key={key} className="flex gap-4 py-4">
                  <img src={product.image} alt={product.imageAlt} className="size-16 shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg leading-tight text-forest">{product.name}</p>
                    <p className="mt-1 text-xs text-charcoal/50">Size {sizeIndex + 1} · {presentation === "giftbasket" ? "Gift basket" : presentation}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-charcoal/55">
                      <QtyStepper qty={qty} max={product.stock} onChange={(q) => setQty(key, q)} />
                      <button type="button" onClick={() => remove(key)} className="py-2 underline transition hover:text-rose">Remove</button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-forest">{money(qty * product.price)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-forest/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-charcoal/60">Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-charcoal/60">Delivery</dt><dd>{area ? money(delivery) : "Select area"}</dd></div>
              <div className="flex justify-between border-t border-forest/10 pt-3 text-base"><dt className="font-semibold text-forest">Total</dt><dd className="font-semibold text-forest">{money(total)}</dd></div>
            </dl>
            <div className="hidden lg:block">
              <Btn type="submit" disabled={stage === "waiting"} className="mt-6 w-full !py-4"><Ico name="lock" className="size-4" /> Pay {money(total)} with M-Pesa</Btn>
            </div>
          </aside>
        </form>
      </div>

      {/* Mobile sticky pay bar */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-4 border-t border-forest/10 bg-ivory px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(36,74,58,0.08)] lg:hidden">
          <div><p className="text-xs text-charcoal/55">Total</p><p className="text-lg font-semibold text-forest">{money(total)}</p></div>
          <button type="submit" form="checkout-form" disabled={stage === "waiting"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-ivory transition hover:bg-forest-light disabled:opacity-50"><Ico name="lock" className="size-4" /> Pay with M-Pesa</button>
        </div>,
        document.body,
      )}

      {(stage === "waiting" || stage === "failed") && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-forest/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="polite">
          <div className="w-full max-w-md rounded-3xl bg-ivory p-7 text-center shadow-2xl sm:p-8">
            {stage === "waiting" ? (
              <>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage/30 text-forest"><Ico name="phone" className="size-7 animate-pulse" /></span>
                <h2 className="mt-6 font-serif text-3xl text-forest">Check your phone</h2>
                <p className="mt-3 text-sm leading-6 text-charcoal/65">We've sent an M-Pesa prompt for <strong>{money(total)}</strong> to <strong>{form.mpesaPhone}</strong>. Enter your PIN to complete the payment.</p>
                <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-forest/10"><div className="h-full w-1/2 animate-pulse rounded-full bg-gold" /></div>
                <p className="mt-4 text-xs text-charcoal/45">Please don't close this page.</p>
              </>
            ) : (
              <>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-rose/15 text-rose"><Ico name="close" className="size-7" /></span>
                <h2 className="mt-6 font-serif text-3xl text-forest">Payment not completed</h2>
                <p className="mt-3 text-sm leading-6 text-charcoal/65">{error || "The payment was cancelled or timed out."} You haven't been charged.</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Btn onClick={() => setStage("form")}>Try again</Btn>
                  <Btn variant="outline" href={`https://wa.me/${WHATSAPP}`}>Get help</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CheckoutPage() {
  const { user } = useAuth();
  const { count } = useCart();
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
  return <ShopPage />;
}
