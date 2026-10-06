import { useState, type ReactNode } from "react";

const images = {
  hero: "https://images.unsplash.com/photo-1612526031467-2b6bf1f49961?auto=format&fit=crop&w=1600&q=85",
  blush: "https://images.unsplash.com/photo-1523693916903-027d144a2b7d?auto=format&fit=crop&w=900&q=85",
  rose: "https://images.unsplash.com/photo-1644248423203-80e317d78aee?auto=format&fit=crop&w=900&q=85",
  garden: "https://images.unsplash.com/photo-1567418938902-aa650a3eb346?auto=format&fit=crop&w=900&q=85",
  white: "https://images.unsplash.com/photo-1674758445398-c2989470fa8a?auto=format&fit=crop&w=900&q=85",
  event: "https://images.unsplash.com/photo-1525441273400-056e9c7517b3?auto=format&fit=crop&w=1200&q=85",
  eventDetail: "https://images.unsplash.com/photo-1710587384835-0f3de33d8042?auto=format&fit=crop&w=1000&q=85",
  florist: "https://images.unsplash.com/photo-1642751652611-bb9a7cad58a3?auto=format&fit=crop&w=1000&q=85",
  arch: "https://images.unsplash.com/photo-1639986098217-17112e22f1ed?auto=format&fit=crop&w=1000&q=85",
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

const products = [
  { name: "Blush Romance", note: "Roses · Baby's breath · Seasonal greens", price: "KSh 4,500", image: images.blush, tag: "Bestseller" },
  { name: "Paradise Rose", note: "Premium pink roses · Gift wrapped", price: "KSh 5,800", image: images.rose, tag: "Signature" },
  { name: "Garden Poetry", note: "Mixed seasonal blooms · Soft pastels", price: "KSh 4,200", image: images.garden, tag: "Seasonal" },
  { name: "Ivory Grace", note: "White blooms · Eucalyptus · Keepsake vase", price: "KSh 5,200", image: images.white, tag: "New" },
  { name: "Rose Reverie", note: "Pink roses · Custom message card", price: "KSh 3,900", image: images.hero, tag: "Classic" },
  { name: "Forever Yours", note: "Deluxe rose bouquet · Satin wrap", price: "KSh 6,500", image: images.rose, tag: "Deluxe" },
];

function ProductCard({ product }: { product: typeof products[number] }) {
  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-none bg-blush/30">
        <img src={product.image} alt={`${product.name} flower arrangement`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-forest backdrop-blur">{product.tag}</span>
        <button aria-label={`Save ${product.name}`} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-ivory/90 text-forest transition hover:bg-white"><Icon name="heart" className="size-4" /></button>
      </div>
      <div className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="font-serif text-2xl text-forest">{product.name}</h3><p className="mt-1 text-sm text-charcoal/55">{product.note}</p></div>
          <p className="shrink-0 font-semibold text-forest">{product.price}</p>
        </div>
        <a href={`https://wa.me/254728829124?text=${encodeURIComponent(`Hello Petals Paradise, I'd like to order ${product.name}.`)}`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-forest transition hover:text-rose"><Icon name="whatsapp" className="size-4" /> Order on WhatsApp</a>
      </div>
    </article>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("All");

  const nav = ["Shop", "Services", "Our Work", "About", "Contact"];
  const gallery = [
    { image: images.event, category: "Events", title: "Intimate garden celebration" },
    { image: images.blush, category: "Bouquets", title: "Blush rose collection" },
    { image: images.arch, category: "Weddings", title: "Romantic floral arch" },
    { image: images.eventDetail, category: "Events", title: "Modern table florals" },
  ];
  const visibleGallery = galleryFilter === "All" ? gallery : gallery.filter((item) => item.category === galleryFilter);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-charcoal">
      <div className="sticky top-0 z-50 bg-forest px-5 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ivory/90">Same-day Nairobi delivery!</div>
      <header className="relative z-40 border-b border-forest/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between bg-white px-5 lg:px-8">
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="text-forest lg:hidden"><Icon name="menu" /></button>
          <a href="#" className="flex items-center gap-3 text-forest">
            <LogoMark />
            <span><strong className="block font-serif text-xl font-semibold leading-none tracking-wide">PETALS PARADISE</strong><small className="mt-1 block border border-black bg-white text-[0.52rem] font-bold uppercase tracking-[0.35em] text-charcoal/55 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">Nairobi Florist</small></span>
          </a>
          <nav className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="text-sm font-medium text-charcoal/70 transition hover:text-forest">{item}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <a href="tel:+254728829124" aria-label="Call Petals Paradise" className="hidden size-10 place-items-center rounded-full text-forest transition hover:bg-sage/20 sm:grid"><Icon name="call" className="size-4" /></a>
            <ButtonLink href="https://wa.me/254728829124" className="hidden sm:inline-flex"><Icon name="whatsapp" className="size-4" /> Order flowers</ButtonLink>
            <a href="#shop" aria-label="View flowers" className="grid size-10 place-items-center rounded-full text-forest sm:hidden"><Icon name="bag" /></a>
          </div>
        </div>
      </header>

      {menuOpen && <div className="fixed inset-0 z-50 bg-forest p-6 text-ivory lg:hidden">
        <div className="flex items-center justify-between"><span className="flex items-center gap-3 font-serif text-2xl"><LogoMark /> PETALS PARADISE</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button></div>
        <nav className="mt-20 flex flex-col gap-7">{nav.map((item) => <a onClick={() => setMenuOpen(false)} key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="font-serif text-4xl text-ivory/90">{item}</a>)}</nav>
        <ButtonLink href="https://wa.me/254728829124" variant="light" className="mt-12 w-full"><Icon name="whatsapp" /> Order on WhatsApp</ButtonLink>
      </div>}

      <main>
        <section className="relative isolate flex min-h-[calc(100svh-7rem)] items-center overflow-hidden bg-forest">
          <img src={images.hero} alt="Pink and white floral bouquet by Petals Paradise" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-forest/60" />
          <div className="mx-auto w-full max-w-7xl px-5 py-16 text-center text-ivory sm:py-20 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-6xl">
              <p className="mb-6 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-gold-light"><span className="h-px w-10 bg-gold" /> Flowers for every feeling <span className="h-px w-10 bg-gold" /></p>
              <h1 className="font-serif text-6xl leading-[0.95] sm:text-7xl lg:text-[7rem]">Beautiful flowers, <em className="font-light text-gold-light">thoughtfully</em> designed.</h1>
              <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-ivory/90 sm:text-lg">From everyday bouquets to weddings and special events, we create artful floral arrangements tailored to your moment.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3"><ButtonLink href="#shop" variant="light">Shop flowers <Icon name="arrow" className="size-4" /></ButtonLink><ButtonLink href="#services" className="border border-ivory/70 text-ivory hover:bg-ivory/10">Explore services</ButtonLink></div>
              <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-3 border-t border-ivory/35 pt-7 text-sm text-ivory/85"><span className="flex items-center gap-2"><Icon name="pin" className="size-4 text-gold-light" /> Westlands, Nairobi</span><span className="flex items-center gap-2"><Icon name="sparkle" className="size-4 text-gold-light" /> Made to order</span></div>
            </div>
          </div>
        </section>

        <section id="shop" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="eyebrow">Our flower shop</p><h2 className="section-title">Fresh from our studio</h2><p className="mt-3 max-w-xl text-charcoal/60">Signature bouquets handcrafted in Westlands. Personalise yours with chocolates, a note, or a special gift.</p></div>
              <a href="#shop" onClick={(event) => { event.preventDefault(); setShowAll(!showAll); }} className="inline-flex items-center gap-2 text-sm font-bold text-forest">View {showAll ? "less" : "all flowers"} <Icon name="arrow" className="size-4" /></a>
            </div>
            <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{products.slice(0, showAll ? 6 : 3).map((product) => <ProductCard key={product.name} product={product} />)}</div>
            <div className="mt-14 rounded-2xl bg-blush/20 px-6 py-5 text-center text-sm text-charcoal/70 sm:flex sm:items-center sm:justify-center sm:gap-3"><Icon name="sparkle" className="mx-auto mb-2 size-5 text-gold sm:m-0" /><span><strong className="text-forest">Make it truly theirs.</strong> Add chocolates, a handwritten card, or a custom gift to any arrangement.</span></div>
          </div>
        </section>

        <section id="services" className="scroll-mt-20 bg-forest py-24 text-ivory">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
              <div><p className="eyebrow !text-gold">Beyond the bouquet</p><h2 className="font-serif text-5xl leading-none sm:text-6xl">Floral care for spaces and celebrations.</h2><p className="mt-6 leading-7 text-ivory/60">Thoughtful, full-service floral design for homes, offices, intimate gatherings and once-in-a-lifetime occasions.</p><ButtonLink href="#contact" variant="light" className="mt-8">Request a quote <Icon name="arrow" className="size-4" /></ButtonLink></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <article className="group overflow-hidden rounded-2xl bg-ivory/5">
                  <div className="h-64 overflow-hidden"><img src={images.florist} alt="Florist maintaining a flower arrangement" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                  <div className="p-7"><span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">01 · Ongoing care</span><h3 className="mt-3 font-serif text-3xl">Flower maintenance</h3><p className="mt-3 text-sm leading-6 text-ivory/55">Regular styling, refreshing and care for flowers in your home, office, hotel or restaurant.</p><a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Book this service <Icon name="arrow" className="size-4" /></a></div>
                </article>
                <article className="group overflow-hidden rounded-2xl bg-ivory/5 sm:translate-y-8">
                  <div className="h-64 overflow-hidden"><img src={images.event} alt="Elegant event table decorated with flowers" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                  <div className="p-7"><span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">02 · Bespoke design</span><h3 className="mt-3 font-serif text-3xl">Events & décor</h3><p className="mt-3 text-sm leading-6 text-ivory/55">From bridal bouquets to floral arches and tablescapes, we design every detail around your story.</p><a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Plan your event <Icon name="arrow" className="size-4" /></a></div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="our-work" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="text-center"><p className="eyebrow justify-center">Selected work</p><h2 className="section-title">A little floral inspiration</h2></div>
            <div className="mt-8 flex flex-wrap justify-center gap-2">{["All", "Bouquets", "Weddings", "Events"].map((filter) => <button key={filter} onClick={() => setGalleryFilter(filter)} className={`rounded-full px-5 py-2 text-sm transition ${galleryFilter === filter ? "bg-forest text-ivory" : "bg-sage/20 text-charcoal/60 hover:bg-sage/40"}`}>{filter}</button>)}</div>
            <div className="mt-10 grid auto-rows-[18rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleGallery.map((item, index) => <article key={item.title} className={`${galleryFilter === "All" && (index === 0 || index === 3) ? "lg:row-span-2" : ""} group relative overflow-hidden rounded-2xl`}><img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/80 to-transparent p-5 pt-16 text-ivory"><span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-light">{item.category}</span><h3 className="mt-1 font-serif text-xl">{item.title}</h3></div></article>)}
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
            <form className="grid gap-5 rounded-3xl bg-ivory p-6 shadow-sm sm:grid-cols-2 sm:p-9" onSubmit={(event) => event.preventDefault()}>
              <label className="field"><span>Your name</span><input required placeholder="Jane Wanjiku" /></label>
              <label className="field"><span>Phone number</span><input required type="tel" placeholder="+254 7..." /></label>
              <label className="field"><span>What are you planning?</span><select defaultValue=""><option value="" disabled>Select an occasion</option><option>Flower delivery</option><option>Wedding</option><option>Event décor</option><option>Flower maintenance</option></select></label>
              <label className="field"><span>Preferred contact</span><select><option>WhatsApp</option><option>Call</option><option>Email</option></select></label>
              <label className="field sm:col-span-2"><span>Tell us more</span><textarea rows={4} placeholder="Date, colours, style, budget or any special requests..." /></label>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-4 text-sm font-semibold text-ivory transition hover:bg-forest-light sm:col-span-2">Send an inquiry <Icon name="arrow" className="size-4" /></button>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-forest px-5 pb-10 pt-16 text-ivory lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-ivory/15 pb-12 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div><a href="#" className="flex items-center gap-3 font-serif text-2xl"><LogoMark /> PETALS PARADISE</a><p className="mt-4 max-w-xs text-sm leading-6 text-ivory/50">Thoughtful flowers for everyday moments, meaningful celebrations and unforgettable events.</p><a href="#" aria-label="Instagram" className="mt-5 grid size-10 place-items-center rounded-full border border-ivory/20"><Icon name="instagram" className="size-4" /></a></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Explore</h3><div className="mt-5 flex flex-col gap-3 text-sm text-ivory/60"><a href="#shop">Shop flowers</a><a href="#services">Services</a><a href="#our-work">Our work</a><a href="#about">Our story</a></div></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Order</h3><div className="mt-5 flex flex-col gap-3 text-sm text-ivory/60"><a href="#contact">Request a quote</a><a href="https://wa.me/254728829124">WhatsApp us</a><a href="tel:+254728829124">Call us</a><a href="#shop">Delivery info</a></div></div>
          <div><h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Visit our studio</h3><p className="mt-5 text-sm leading-6 text-ivory/60">359Jalaram Road, Westlands, Nairobi<br />Monday – Sunday<br />8:00am – 6:00pm</p></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-7 text-xs text-ivory/35 sm:flex-row sm:justify-between"><span>© 2025 Petals Paradise. All rights reserved.</span><span>Flowers made with intention in Nairobi.</span></div>
      </footer>

      <a href="https://wa.me/254728829124" aria-label="Chat with Petals Paradise on WhatsApp" className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-forest text-ivory shadow-xl transition hover:scale-105"><Icon name="whatsapp" className="size-6" /></a>
    </div>
  );
}

export default App;
