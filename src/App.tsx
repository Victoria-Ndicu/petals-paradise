import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiRequest } from "./api";
import { AccountButton, CartButton, CartDrawer, ShopRouter, useCatalogue, useHashRoute, isShopRoute, money, type Product } from "./shop";

const images = {
  hero: "https://images.unsplash.com/photo-1612526031467-2b6bf1f49961?auto=format&fit=crop&w=1600&q=85",
  blush: "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=900&q=85",
  rose: "https://images.unsplash.com/photo-1644248423203-80e317d78aee?auto=format&fit=crop&w=900&q=85",
  garden: "https://images.unsplash.com/photo-1567418938902-aa650a3eb346?auto=format&fit=crop&w=900&q=85",
  white: "https://images.unsplash.com/photo-1674758445398-c2989470fa8a?auto=format&fit=crop&w=900&q=85",
  event: "https://images.unsplash.com/photo-1525441273400-056e9c7517b3?auto=format&fit=crop&w=1200&q=85",
  eventDetail: "https://images.unsplash.com/photo-1710587384835-0f3de33d8042?auto=format&fit=crop&w=1000&q=85",
  babyShower: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzNn9juTGn3W4a8GecbwYw0x0KeRGhRVMMW9wB_Uq4ow&s=10",
  birthday: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=85",
  florist: "https://images.unsplash.com/photo-1642751652611-bb9a7cad58a3?auto=format&fit=crop&w=1000&q=85",
  arch: "https://images.unsplash.com/photo-1639986098217-17112e22f1ed?auto=format&fit=crop&w=1000&q=85",
  funeralHeart: "https://images.openai.com/static-rsc-4/M99-2HruL0F7k_uz67sfAH09su4rsIJmqKQFpGhMmU5GR9NIPDdU6MfzfsySOxljqM2o_JVnIm1FCc0QMBlbef9e5Qd6eqam126sOwX1ehgNDC3sKLxuwyfsP6Cw1j8QaIdwiGItb-nmug0T65TwlWw3X8Yj_JQPDwiSt_6xHDY?purpose=inline",
};

const serviceDetails = {
  "flower-maintenance": {
    eyebrow: "Ongoing care",
    title: "Flower maintenance",
    intro: "Keep your spaces feeling fresh with regular floral styling and attentive care, tailored to your home or business.",
    flowers: [
      { title: "Seasonal arrangements", image: images.garden, description: "Fresh, changing blooms styled to complement your space." },
      { title: "Vase refreshes", image: images.white, description: "A considered refresh for reception areas, homes and tables." },
      { title: "Floral styling", image: images.florist, description: "Practical care and thoughtful placement for lasting beauty." },
    ],
  },
  "events-decor": {
    eyebrow: "Bespoke design",
    title: "Events & décor",
    intro: "Personal floral styling for weddings, baby showers, birthday parties, intimate celebrations and gatherings, designed around your setting and story.",
    flowers: [
      { title: "Wedding flowers", image: images.arch, description: "Bouquets and floral details made to feel like you." },
      { title: "Baby shower décor", image: images.babyShower, description: "Soft, joyful florals and decorative touches for a beautiful baby celebration." },
      { title: "Birthday party décor", image: images.birthday, description: "Playful, personalised styling for milestone birthdays and family celebrations." },
      { title: "Table flowers", image: images.eventDetail, description: "Considered centrepieces for dinners and celebrations." },
      { title: "Venue styling", image: images.event, description: "Floral touches that bring your event space together." },
    ],
  },
  "funeral-sympathy": {
    eyebrow: "With care",
    title: "Funeral & sympathy flowers",
    intro: "Thoughtful floral tributes to honour a life and offer comfort, prepared with care for the service or family home.",
    flowers: [
      { title: "Heart-shaped tribute", image: images.funeralHeart, description: "A gentle floral expression of love and remembrance." },
      { title: "Sympathy bouquet", image: images.white, description: "Soft, seasonal flowers to share with the family." },
      { title: "Service flowers", image: images.garden, description: "Considered arrangements for a place of gathering or remembrance." },
    ],
  },
};

type IconName =
  | "arrow"
  | "bag"
  | "call"
  | "chevron"
  | "close"
  | "heart"
  | "instagram"
  | "menu"
  | "pin"
  | "quote"
  | "sparkle"
  | "whatsapp";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bag: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    call: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    instagram: <><rect width="18" height="18" x="3" y="3" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="currentColor" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    quote: <path d="M7 17h4V9H5v4h2v4Zm10 0h4V9h-6v4h2v4Z" />,
    sparkle: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />,
    whatsapp: <><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-5.4A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.2 7.8c.4 4 3.1 6.7 7.1 7.1l1-1.8-2.3-1-1 1c-1.7-.7-2.8-1.8-3.5-3.5l1-1-1-2.3-1.3 1.5Z" /></>,
  };
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function LogoMark({ className = "size-11" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Petals Paradise floral monogram"
    >
      <circle cx="32" cy="32" r="30.5" fill="#FAF7F0" stroke="#C9A96E" />
      <path
        d="M31.6 27.9c-6.8-1.4-10.9-5-11.4-10.8 6.1-.5 10.1 2.5 11.9 9.2"
        fill="#D9A6A6"
        stroke="#244A3A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32.4 27.9c6.8-1.4 10.9-5 11.4-10.8-6.1-.5-10.1 2.5-11.9 9.2"
        fill="#A8BFA8"
        stroke="#244A3A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 27.5c-4.1-5.5-4.2-10.9 0-15.2 4.2 4.3 4.1 9.7 0 15.2Z"
        fill="#C9A96E"
        stroke="#244A3A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 26.5v24.2M32 35.5c5.7-5.5 12-4.2 13.9.3-5.4 2.8-10.1 1.7-13.9 5.4M32 43.1c-4.7-4.1-9.6-3.3-11.9.3 4 2.6 8.2 2.2 11.9 5"
        stroke="#244A3A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="28.2" r="3.2" fill="#244A3A" />
    </svg>
  );
}

function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "light" | "outline"; className?: string }) {
  const variants = {
    primary: "bg-forest text-ivory hover:bg-forest-light",
    light: "bg-ivory text-forest hover:bg-white",
    outline: "border border-forest/25 text-forest hover:border-forest hover:bg-sage/20",
  };
  return <a href={href} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition ${variants[variant]} ${className}`}>{children}</a>;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex min-w-0 items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-forest/10 sm:block sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-blush/30 sm:aspect-[4/5] sm:size-auto sm:rounded-none">
        <img src={product.image} alt={product.imageAlt} loading="lazy" className="h-full w-full object-cover transition duration-700 sm:group-hover:scale-105" />
        {product.tag && <span className="absolute left-1 top-1 rounded-full bg-ivory/90 px-1.5 py-1 text-[0.5rem] font-bold uppercase tracking-wider text-forest backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[0.65rem] sm:tracking-[0.18em]">{product.tag}</span>}
        <button aria-label={`Save ${product.name}`} className="absolute right-2 top-2 hidden size-10 place-items-center rounded-full bg-ivory/90 text-forest transition hover:bg-white sm:grid"><Icon name="heart" className="size-4" /></button>
      </div>
      <div className="min-w-0 flex-1 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><h3 className="line-clamp-2 font-serif text-lg leading-tight text-forest sm:text-2xl">{product.name}</h3><p className="mt-1 line-clamp-2 text-xs text-charcoal/55 sm:text-sm">{product.note}</p></div>
          <p className="shrink-0 text-sm font-semibold text-forest sm:text-base">{money(product.price)}</p>
        </div>
        <a href="#/shop" className="mt-2 inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-forest transition hover:text-rose sm:mt-4 sm:gap-2 sm:text-xs sm:tracking-[0.16em]"><Icon name="bag" className="size-3.5 sm:size-4" /> Shop this bouquet</a>
      </div>
    </article>
  );
}

function GiftAddOnCard({ product, decorative = false }: { product: Product; decorative?: boolean }) {
  return (
    <a href="#/shop" tabIndex={decorative ? -1 : undefined} className="flex w-64 shrink-0 items-center gap-3 rounded-xl border border-forest/10 bg-white p-3 transition hover:border-gold/60 hover:shadow-sm sm:w-auto">
      {product.image
        ? <img src={product.image} alt={product.imageAlt} loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />
        : <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-blush/20 font-serif text-xl text-forest" aria-hidden="true">P</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.6rem] font-bold uppercase tracking-[0.14em] text-rose-dark">Gift or card</span>
        <span className="mt-1 block line-clamp-1 font-serif text-lg leading-tight text-forest">{product.name}</span>
        <span className="mt-1 block text-xs font-semibold text-charcoal/65">{money(product.price)}</span>
      </span>
      <Icon name="arrow" className="size-4 shrink-0 text-forest" />
    </a>
  );
}

function ServiceDetail({ slug }: { slug: string }) {
  const service = serviceDetails[slug as keyof typeof serviceDetails];
  if (!service) {
    return (
      <section className="px-5 py-24 text-center">
        <p className="eyebrow justify-center">Our services</p>
        <h1 className="section-title">Service not found</h1>
        <a href="#services" className="mt-8 inline-flex items-center gap-2 font-semibold text-forest">Back to services <Icon name="arrow" className="size-4" /></a>
      </section>
    );
  }

  return (
    <>
      <section className="bg-forest px-5 py-16 text-center text-ivory sm:py-24">
        <div className="mx-auto max-w-3xl">
          <a href="#services" className="inline-flex items-center gap-2 text-sm text-ivory/70 transition hover:text-ivory"><Icon name="arrow" className="size-4 rotate-180" /> All services</a>
          <p className="eyebrow mt-8 justify-center !text-gold">{service.eyebrow}</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight sm:text-7xl">{service.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-ivory/70">{service.intro}</p>
          <a href="#contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ivory px-6 py-3.5 text-sm font-semibold text-forest transition hover:bg-white">Ask us about this service <Icon name="arrow" className="size-4" /></a>
        </div>
      </section>
      <section className="px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="eyebrow justify-center">Made with intention</p>
            <h2 className="section-title">Floral ideas for {service.title.toLowerCase()}</h2>
          </div>
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {service.flowers.map((flower) => (
              <article key={flower.title} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <img src={flower.image} alt={flower.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-6">
                  <h3 className="font-serif text-2xl text-forest">{flower.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal/60">{flower.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-12 rounded-2xl bg-blush/20 px-6 py-8 text-center">
            <p className="font-serif text-2xl text-forest">Looking for something personal?</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-charcoal/60">Tell us about your needs and our florists will help you choose the right flowers and arrangements.</p>
            <a href="#contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-ivory transition hover:bg-forest-light">Request a quote <Icon name="arrow" className="size-4" /></a>
          </div>
        </div>
      </section>
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { products, productsLoading, productsError } = useCatalogue();
  const [inquiry, setInquiry] = useState({ name: "", phone: "", email: "", occasion: "", preferredContact: "whatsapp", details: "" });
  const [inquiryState, setInquiryState] = useState<{ kind: "success" | "error"; message: string; fields?: Record<string, string> } | null>(null);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const route = useHashRoute();
  const inShop = isShopRoute(route);

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInquirySubmitting(true);
    setInquiryState(null);
    try {
      await apiRequest("/inquiries", {
        method: "POST",
        csrf: false,
        body: inquiry,
      });
      setInquiry({ name: "", phone: "", email: "", occasion: "", preferredContact: "whatsapp", details: "" });
      setInquiryState({ kind: "success", message: "Thanks — we’ve received your inquiry and sent a confirmation email. We’ll be in touch soon." });
    } catch (error) {
      setInquiryState({
        kind: "error",
        message: error instanceof Error ? error.message : "We couldn't send your inquiry. Please try again.",
        ...(error instanceof ApiError ? { fields: error.fields } : {}),
      });
    } finally {
      setInquirySubmitting(false);
    }
  }

  const nav = ["Shop", "Services", "About", "Contact"];
  const navHref = (item: string) => (item === "Shop" ? "#/shop" : `#${item.toLowerCase().replace(" ", "-")}`);

  const partners = [
    { name: "ENZA HOTEL", href: undefined, style: "font-sans font-bold tracking-[0.24em]" },
    { name: "GLEE HOTEL", href: "https://www.gleehotelnairobi.com/", style: "font-serif font-bold tracking-[0.12em]" },
    { name: "GEM FOREST HOTEL · MGallery", href: "https://mgallery.accor.com/en/hotels/B5W9.html", style: "font-serif tracking-[0.08em]" },
    { name: "CAPITAL CLUB", href: "https://capitalclubea.com/", style: "font-sans font-bold tracking-[0.2em]" },
    { name: "WESTWOOD HOTEL", href: undefined, style: "font-serif font-bold tracking-[0.1em]" },
    { name: "HADASSAH HOTEL", href: "https://superiorhotelskenya.com/hotels-in-nairobi/hadassah-hotel/", style: "font-sans font-semibold tracking-[0.14em]" },
    { name: "FAIRMONT MOUNT KENYA SAFARI CLUB", href: "https://www.fairmont.com/en/hotels/nanyuki/fairmont-mount-kenya-safari-club.html", style: "font-serif tracking-[0.06em]" },
  ];
  const giftAddOns = products.filter((product) => product.giftAddOn);

  // When leaving the shop for a landing section (e.g. #services), scroll to it once the page has rendered.
  useEffect(() => {
    if (route.startsWith("/services/")) {
      window.scrollTo({ top: 0 });
      return;
    }
    if (inShop || !route || route === "/") return;
    const t = setTimeout(() => document.getElementById(route)?.scrollIntoView(), 50);
    return () => clearTimeout(t);
  }, [route, inShop]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-charcoal">
      <div className="sticky top-0 z-50 bg-forest px-5 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ivory/90">Thoughtful flowers, delivered across Nairobi</div>
      <header className="relative z-40 border-b border-forest/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between bg-white px-5 lg:px-8">
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="text-forest lg:hidden"><Icon name="menu" /></button>
          <a href="#" className="flex items-center gap-3 text-forest">
            <LogoMark />
            <span><strong className="block font-serif text-xl font-semibold leading-none tracking-wide">PETALS PARADISE</strong><small className="mt-1 block border border-black bg-white text-[0.52rem] font-bold uppercase tracking-[0.35em] text-charcoal/55 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">Nairobi Florist</small></span>
          </a>
          <nav className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => <a key={item} href={navHref(item)} className="text-sm font-medium text-charcoal/70 transition hover:text-forest">{item}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <a href="tel:+254728829124" aria-label="Call Petals Paradise" className="hidden size-10 place-items-center rounded-full text-forest transition hover:bg-sage/20 sm:grid"><Icon name="call" className="size-4" /></a>
            <AccountButton className="hidden sm:grid" />
            <CartButton />
            <ButtonLink href="https://wa.me/254728829124" className="hidden sm:inline-flex"><Icon name="whatsapp" className="size-4" /> Order flowers</ButtonLink>
          </div>
        </div>
      </header>

      {menuOpen && <div className="fixed inset-0 z-50 bg-forest p-6 text-ivory lg:hidden">
        <div className="flex items-center justify-between"><span className="flex items-center gap-3 font-serif text-2xl"><LogoMark /> PETALS PARADISE</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button></div>
        <nav className="mt-20 flex flex-col gap-7">{nav.map((item) => <a onClick={() => setMenuOpen(false)} key={item} href={navHref(item)} className="font-serif text-4xl text-ivory/90">{item}</a>)}<a onClick={() => setMenuOpen(false)} href="#/account" className="font-serif text-4xl text-ivory/90">My account</a></nav>
        <ButtonLink href="https://wa.me/254728829124" variant="light" className="mt-12 w-full"><Icon name="whatsapp" /> Order on WhatsApp</ButtonLink>
      </div>}

      <main>
        {route.startsWith("/services/") ? (
          <ServiceDetail slug={route.slice("/services/".length)} />
        ) : inShop ? (
          <ShopRouter route={route} />
        ) : (
          <>
            <section className="relative isolate flex min-h-[calc(100svh-7rem)] items-center overflow-hidden bg-forest">
              <img src={images.hero} alt="Pink and white floral bouquet by Petals Paradise" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover" />
              <div className="absolute inset-0 -z-10 bg-forest/60" />
              <div className="mx-auto w-full max-w-7xl px-5 py-16 text-center text-ivory sm:py-20 lg:px-8 lg:py-24">
                <div className="mx-auto max-w-6xl">
                  <p className="mb-6 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-gold-light"><span className="h-px w-10 bg-gold" /> Flowers for every feeling <span className="h-px w-10 bg-gold" /></p>
                  <h1 className="font-serif text-6xl leading-[0.95] sm:text-7xl lg:text-[7rem]">Beautiful flowers, <em className="font-light text-gold-light">thoughtfully</em> designed.</h1>
                  <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-ivory/90 sm:text-lg">From everyday bouquets to weddings and special events, we create artful floral arrangements tailored to your moment.</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3"><ButtonLink href="#/shop" variant="light">Shop flowers <Icon name="arrow" className="size-4" /></ButtonLink><ButtonLink href="#services" className="border border-ivory/70 text-ivory hover:bg-ivory/10">Explore services</ButtonLink></div>
                  <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-ivory/35 pt-7 text-sm text-ivory/85"><span className="flex items-center gap-2"><Icon name="pin" className="size-4 text-gold-light" /> Westlands, Nairobi</span><span className="flex items-center gap-2"><Icon name="sparkle" className="size-4 text-gold-light" /> Made to order</span></div>
                </div>
              </div>
            </section>

            <section id="shop-preview" className="scroll-mt-20 bg-white py-10 sm:py-24">
              <div className="mx-auto max-w-7xl px-5 lg:px-8">
                <div className="flex items-end justify-between gap-3 sm:gap-5">
                  <div className="min-w-0"><p className="eyebrow">Our flower shop</p><h2 className="mt-2 font-serif text-3xl leading-tight text-forest sm:mt-3 sm:text-5xl">Fresh from our studio</h2><p className="mt-2 max-w-xl text-sm text-charcoal/60 sm:mt-3 sm:text-base">Signature bouquets handcrafted in Westlands. Personalise yours with chocolates, a note, or a special gift.</p></div>
                  <a href="#/shop" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-forest/20 px-3 py-2 text-xs font-bold text-forest sm:gap-2 sm:border-0 sm:px-0 sm:py-0 sm:text-sm">Shop all <Icon name="arrow" className="size-3.5 sm:size-4" /></a>
                </div>
                {productsLoading ? <div role="status" aria-label="Loading flowers" className="mt-5 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"><span className="sr-only">Loading flowers…</span>{Array.from({ length: 3 }, (_, index) => <div key={index} aria-hidden="true" className="flex animate-pulse items-center gap-3 rounded-xl bg-ivory p-3 sm:block sm:rounded-none sm:bg-transparent sm:p-0"><div className="size-24 shrink-0 rounded-lg bg-sage/20 sm:aspect-[4/5] sm:size-auto sm:rounded-none" /><div className="flex-1 space-y-3 sm:mt-5"><div className="h-5 w-2/3 rounded bg-sage/25" /><div className="h-4 w-full rounded bg-sage/20" /><div className="h-4 w-1/2 rounded bg-sage/20" /></div></div>)}</div> : productsError ? <p role="alert" className="py-8 text-center text-sm text-rose-dark sm:py-12">{productsError}</p> : <div className="mt-5 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-3">{products.filter((product) => product.category === "Flowers").slice(0, 3).map((product) => <ProductCard key={product.id} product={product} />)}</div>}
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-blush/15 px-4 py-3 text-left text-xs leading-5 text-charcoal/70 sm:mt-14 sm:justify-center sm:gap-3 sm:rounded-2xl sm:px-6 sm:py-5 sm:text-center sm:text-sm"><Icon name="sparkle" className="size-5 shrink-0 text-gold" /><span><strong className="text-forest">Make it truly theirs.</strong> Add chocolates, a handwritten card, or a custom gift to any arrangement.</span></div>
                {!productsLoading && !productsError && giftAddOns.length > 0 && (
                  <div className="mt-5 sm:mt-8">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-rose-dark">Little extras</p><h3 className="mt-1 font-serif text-2xl text-forest sm:text-3xl">Gifts & cards</h3></div>
                      <a href="#/shop" className="shrink-0 text-xs font-bold text-forest sm:text-sm">Browse all <Icon name="arrow" className="inline size-3.5 sm:size-4" /></a>
                    </div>
                    <div className="partners-marquee" role="region" aria-label="Gifts and cards available to add to your order">
                      <div className="partners-track">
                        {[false, true].map((decorative) => (
                          <div key={String(decorative)} className="partners-group gap-3 pr-3" aria-hidden={decorative}>
                            {giftAddOns.map((product) => <GiftAddOnCard key={`${product.id}-${decorative}`} product={product} decorative={decorative} />)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section id="services" className="scroll-mt-20 bg-forest py-10 text-ivory sm:py-24">
              <div className="mx-auto max-w-7xl px-5 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
                  <div><p className="eyebrow !text-gold">Beyond the bouquet</p><h2 className="mt-2 font-serif text-3xl leading-tight sm:mt-3 sm:text-6xl">Floral care for spaces and celebrations.</h2><p className="mt-3 text-sm leading-6 text-ivory/60 sm:mt-6 sm:text-base sm:leading-7">Thoughtful floral design for homes, offices, gatherings and special occasions.</p><ButtonLink href="#contact" variant="light" className="mt-4 !px-4 !py-2.5 text-xs sm:mt-8 sm:!px-6 sm:!py-3.5 sm:text-sm">Request a quote <Icon name="arrow" className="size-4" /></ButtonLink></div>
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-5">
                    <article className="group flex overflow-hidden rounded-xl bg-ivory/5 sm:block sm:rounded-2xl">
                      <div className="h-24 w-24 shrink-0 overflow-hidden sm:h-48 sm:w-auto"><img src={images.florist} alt="Florist maintaining a flower arrangement" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                      <div className="min-w-0 p-3 sm:p-7"><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-gold sm:text-xs sm:tracking-[0.2em]">01 · Ongoing care</span><h3 className="mt-1 font-serif text-lg leading-tight sm:mt-3 sm:text-3xl">Flower maintenance</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-ivory/55 sm:mt-3 sm:text-sm sm:leading-6">Regular styling, refreshing and care for flowers in your home, office, hotel or restaurant.</p><a href="#/services/flower-maintenance" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold sm:mt-6 sm:gap-2 sm:text-sm">Explore service <Icon name="arrow" className="size-3.5 sm:size-4" /></a></div>
                    </article>
                    <article className="group flex overflow-hidden rounded-xl bg-ivory/5 sm:block sm:translate-y-8 sm:rounded-2xl">
                      <div className="h-24 w-24 shrink-0 overflow-hidden sm:h-48 sm:w-auto"><img src={images.event} alt="Elegant event table decorated with flowers" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                      <div className="min-w-0 p-3 sm:p-7"><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-gold sm:text-xs sm:tracking-[0.2em]">02 · Bespoke design</span><h3 className="mt-1 font-serif text-lg leading-tight sm:mt-3 sm:text-3xl">Events & décor</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-ivory/55 sm:mt-3 sm:text-sm sm:leading-6">From bridal florals to baby showers, birthday parties and tablescapes, we design every detail around your story.</p><a href="#/services/events-decor" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold sm:mt-6 sm:gap-2 sm:text-sm">Explore service <Icon name="arrow" className="size-3.5 sm:size-4" /></a></div>
                    </article>
                    <article className="group flex overflow-hidden rounded-xl bg-ivory/5 sm:block sm:rounded-2xl">
                      <div className="h-24 w-24 shrink-0 overflow-hidden sm:h-48 sm:w-auto"><img src={images.funeralHeart} alt="Heart-shaped white funeral flower tribute" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                      <div className="min-w-0 p-3 sm:p-7"><span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-gold sm:text-xs sm:tracking-[0.2em]">03 · With care</span><h3 className="mt-1 font-serif text-lg leading-tight sm:mt-3 sm:text-3xl">Funeral & sympathy flowers</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-ivory/55 sm:mt-3 sm:text-sm sm:leading-6">Thoughtful floral tributes to honour a life and offer comfort, with delivery to the service or family home.</p><a href="#/services/funeral-sympathy" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold sm:mt-6 sm:gap-2 sm:text-sm">Explore service <Icon name="arrow" className="size-3.5 sm:size-4" /></a></div>
                    </article>
                  </div>
                </div>
              </div>
            </section>

            <section id="about" className="scroll-mt-20 bg-blush/20 py-24">
              <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
                <div className="relative mx-auto max-w-xl pb-10 pr-8"><img src={images.florist} alt="Petals Paradise florist at work" className="aspect-[4/5] w-full rounded-none object-cover" /><div className="absolute bottom-0 right-0 max-w-[15rem] rounded-2xl bg-ivory p-6 shadow-xl"><Icon name="quote" className="size-8 text-gold" /><p className="mt-2 font-serif text-xl leading-6 text-forest">Every occasion deserves something beautiful.</p></div></div>
                <div><p className="eyebrow">Our story</p><h2 className="section-title">Rooted in a love for flowers</h2><p className="mt-6 leading-7 text-charcoal/65">Petals Paradise began with a simple belief: flowers have the power to say what words cannot. Today, our team of Nairobi florists helps people celebrate, connect and create unforgettable moments through thoughtful floral design.</p><p className="mt-4 leading-7 text-charcoal/65">Every arrangement is made with creativity, quality blooms and close attention to the details that make it personal.</p><div className="mt-9 grid grid-cols-3 gap-4 border-y border-forest/15 py-6 text-center"><div><strong className="block font-serif text-3xl text-forest">5+</strong><span className="text-xs text-charcoal/50">Skilled florists</span></div><div><strong className="block font-serif text-3xl text-forest">100%</strong><span className="text-xs text-charcoal/50">Made with care</span></div><div><strong className="block font-serif text-3xl text-forest">NBO</strong><span className="text-xs text-charcoal/50">Local delivery</span></div></div></div>
              </div>
            </section>

            <section className="py-24">
              <div className="mx-auto max-w-5xl px-5 text-center">
                <Icon name="quote" className="mx-auto size-10 text-gold" />
                <blockquote className="mt-6 font-serif text-3xl leading-tight text-forest sm:text-5xl">“The arrangement was even more beautiful than I imagined. Every detail felt personal, and the delivery was seamless.”</blockquote>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-charcoal/50">A happy Petals Paradise customer · Nairobi</p>
              </div>
            </section>

            <section id="contact" className="scroll-mt-20 bg-sage/25 py-24">
              <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
                <div><p className="eyebrow">Let’s create something beautiful</p><h2 className="section-title">Tell us about your occasion</h2><p className="mt-5 max-w-md leading-7 text-charcoal/60">Share a few details and our floral team will get back to you with ideas, availability and a tailored quote.</p><div className="mt-8 space-y-4 text-sm"><a href="https://wa.me/254728829124" className="flex items-center gap-3 text-forest"><span className="grid size-10 place-items-center rounded-full bg-forest text-ivory"><Icon name="whatsapp" className="size-4" /></span> WhatsApp +254 728 829 124</a><a href="tel:+254728829124" className="flex items-center gap-3 text-forest"><span className="grid size-10 place-items-center rounded-full bg-ivory"><Icon name="call" className="size-4" /></span> Call +254 728 829 124</a><span className="flex items-center gap-3 text-forest"><span className="grid size-10 place-items-center rounded-full bg-ivory"><Icon name="pin" className="size-4" /></span> Westlands, Nairobi</span></div></div>
                <form className="grid gap-5 rounded-3xl bg-ivory p-6 shadow-sm sm:grid-cols-2 sm:p-9" onSubmit={submitInquiry}>
                  <label className="field"><span>Your name</span><input required value={inquiry.name} onChange={(event) => setInquiry({ ...inquiry, name: event.target.value })} placeholder="Jane Wanjiku" /></label>
                  <label className="field"><span>Phone number</span><input required type="tel" value={inquiry.phone} onChange={(event) => setInquiry({ ...inquiry, phone: event.target.value })} placeholder="+254 7..." /></label>
                  <label className="field"><span>Email address (for confirmation)</span><input required type="email" autoComplete="email" value={inquiry.email} onChange={(event) => setInquiry({ ...inquiry, email: event.target.value })} placeholder="you@example.com" /></label>
                  <label className="field"><span>What are you planning?</span><select required value={inquiry.occasion} onChange={(event) => setInquiry({ ...inquiry, occasion: event.target.value })}><option value="" disabled>Select an occasion</option><option value="flower_delivery">Flower delivery</option><option value="wedding">Wedding</option><option value="event_decor">Event décor</option><option value="flower_maintenance">Flower maintenance</option><option value="funeral">Funeral & sympathy flowers</option></select></label>
                  <label className="field"><span>Preferred contact</span><select value={inquiry.preferredContact} onChange={(event) => setInquiry({ ...inquiry, preferredContact: event.target.value })}><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="sms">SMS</option><option value="email">Email</option></select></label>
                  <p className="text-sm text-charcoal/60 sm:col-span-2">We’ll send the acknowledgement to your email. Your preferred contact is for our team’s follow-up.</p>
                  <label className="field sm:col-span-2"><span>Tell us more</span><textarea rows={4} value={inquiry.details} onChange={(event) => setInquiry({ ...inquiry, details: event.target.value })} placeholder="Date, colours, style, budget or any special requests..." /></label>
                  {inquiryState && <div role={inquiryState.kind === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm sm:col-span-2 ${inquiryState.kind === "error" ? "bg-rose/10 text-rose-dark" : "bg-sage/30 text-forest"}`}><p>{inquiryState.message}</p>{inquiryState.fields && <ul className="mt-2 list-inside list-disc">{Object.entries(inquiryState.fields).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul>}</div>}
                  <button disabled={inquirySubmitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 text-sm font-semibold text-ivory transition hover:bg-forest-light disabled:opacity-60 sm:col-span-2">{inquirySubmitting ? "Sending…" : "Send an inquiry"} <Icon name="arrow" className="size-4" /></button>
                </form>
              </div>
            </section>

            <section aria-labelledby="partners-title" className="overflow-hidden border-y border-forest/10 bg-white py-16 sm:py-20">
              <div className="mx-auto max-w-7xl px-5 text-center lg:px-8">
                <p className="eyebrow justify-center">In good company</p>
                <h2 id="partners-title" className="section-title">Our partners & clientele</h2>
                <div className="partners-marquee mt-10" aria-label="Our partners and clients">
                  <div className="partners-track">
                    {[0, 1].map((copy) => (
                      <div key={copy} className="partners-group" aria-hidden={copy === 1}>
                        {partners.map((partner) => {
                          const wordmark = <span className={`whitespace-nowrap text-center text-lg text-forest/80 transition-colors group-hover:text-forest sm:text-xl ${partner.style}`}>{partner.name}</span>;
                          return partner.href ? (
                            <a key={partner.name} href={partner.href} target="_blank" rel="noreferrer" className="group flex min-h-16 shrink-0 items-center justify-center px-8" aria-label={partner.name}>
                              {wordmark}
                            </a>
                          ) : (
                            <span key={partner.name} className="flex min-h-16 shrink-0 items-center justify-center px-8">
                              {wordmark}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="bg-forest px-5 pb-10 pt-16 text-ivory lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-ivory/15 pb-12 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div><a href="#" className="flex items-center gap-3 font-serif text-2xl"><LogoMark /> PETALS PARADISE</a><p className="mt-4 max-w-xs text-sm leading-6 text-ivory/50">Thoughtful flowers for everyday moments, meaningful celebrations and unforgettable events.</p><a href="#" aria-label="Instagram" className="mt-5 grid size-10 place-items-center rounded-full border border-ivory/20"><Icon name="instagram" className="size-4" /></a></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Explore</h3><div className="mt-5 flex flex-col gap-3 text-sm text-ivory/60"><a href="#/shop">Shop flowers</a><a href="#services">Services</a><a href="#about">Our story</a></div></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Order</h3><div className="mt-5 flex flex-col gap-3 text-sm text-ivory/60"><a href="#contact">Request a quote</a><a href="https://wa.me/254728829124">WhatsApp us</a><a href="tel:+254728829124">Call us</a><a href="#/shop">Delivery info</a></div></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Visit our studio</h3><p className="mt-5 text-sm leading-6 text-ivory/60">359 Jalaram Road, Westlands, Nairobi<br />Monday – Sunday<br />8:00am – 6:00pm</p></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-7 text-xs text-ivory/35 sm:flex-row sm:justify-between"><span>© 2025 Petals Paradise. All rights reserved.</span><span>Flowers made with intention in Nairobi.</span></div>
      </footer>

      <CartDrawer />

      <a href="https://wa.me/254728829124" aria-label="Chat with Petals Paradise on WhatsApp" className={`fixed bottom-5 right-5 z-30 size-14 place-items-center rounded-full bg-forest text-ivory shadow-xl transition hover:scale-105 ${route.startsWith("/checkout") ? "hidden" : "grid"}`}><Icon name="whatsapp" className="size-6" /></a>
    </div>
  );
}

export default App;
