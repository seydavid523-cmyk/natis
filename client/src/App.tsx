import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Route, Switch, useLocation, useRoute } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  MessageCircle,
  PhoneCall,
  Info,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Truck,
  Upload,
  Pencil,
  X,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";
import {
  brandMeta,
  discountPercent,
  formatPrice,
  getCatalogProducts,
  getCatalogPublicProducts,
  type BrandId,
  type Product,
} from "./lib/catalog";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  createSupabaseOrder,
  deleteSupabaseProduct,
  hasSupabaseAdminSession,
  loadAdminOrders,
  loadSupabaseCatalog,
  publishSupabaseCatalog,
  signInSupabaseAdmin,
  signOutSupabase,
  supabaseConfigured,
  updateSupabaseOrderStatus,
  uploadSupabaseProductImage,
  type OrderRecord,
} from "./lib/supabase";

type CartLine = { slug: string; qty: number; storage: string; color: string };
type CartContextValue = {
  cart: CartLine[];
  cartCount: number;
  addToCart: (slug: string, storage?: string, color?: string) => void;
  updateQty: (slug: string, storage: string, color: string, qty: number) => void;
  removeFromCart: (slug: string, storage: string, color: string) => void;
  compare: string[];
  toggleCompare: (slug: string) => void;
  isCompared: (slug: string) => boolean;
  saved: CartLine[];
  saveForLater: (line: CartLine) => void;
  restoreSaved: (line: CartLine) => void;
};
const CartContext = createContext<CartContextValue | null>(null);

function useStore() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useStore must be used inside CartContext");
  return value;
}

function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => {
    try { const parsed = JSON.parse(localStorage.getItem("natis-cart") || "[]") as CartLine[]; return parsed.filter((line) => getCatalogPublicProducts().some((product) => product.slug === line.slug)); } catch { return []; }
  });
  const [compare, setCompare] = useState<string[]>(() => {
    try { const parsed = JSON.parse(localStorage.getItem("natis-compare") || "[]") as string[]; return parsed.filter((slug) => getCatalogPublicProducts().some((product) => product.slug === slug)); } catch { return []; }
  });
  const [saved, setSaved] = useState<CartLine[]>(() => {
    try { const parsed = JSON.parse(localStorage.getItem("natis-saved") || "[]") as CartLine[]; return parsed.filter((line) => getCatalogPublicProducts().some((product) => product.slug === line.slug)); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("natis-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("natis-compare", JSON.stringify(compare)); }, [compare]);
  useEffect(() => { localStorage.setItem("natis-saved", JSON.stringify(saved)); }, [saved]);
  const addToCart = (slug: string, storage = "256", color = "default") => setCart((current) => {
    const index = current.findIndex((line) => line.slug === slug && line.storage === storage && line.color === color);
    if (index === -1) return [...current, { slug, qty: 1, storage, color }];
    return current.map((line, i) => i === index ? { ...line, qty: Math.min(line.qty + 1, 9) } : line);
  });
  const updateQty = (slug: string, storage: string, color: string, qty: number) => setCart((current) => current.map((line) => line.slug === slug && line.storage === storage && line.color === color ? { ...line, qty: Math.max(1, Math.min(9, qty)) } : line));
  const removeFromCart = (slug: string, storage: string, color: string) => setCart((current) => current.filter((line) => !(line.slug === slug && line.storage === storage && line.color === color)));
  const saveForLater = (line: CartLine) => {
    setCart((current) => current.filter((item) => !(item.slug === line.slug && item.storage === line.storage && item.color === line.color)));
    setSaved((current) => current.some((item) => item.slug === line.slug && item.storage === line.storage && item.color === line.color) ? current : [...current, line]);
  };
  const restoreSaved = (line: CartLine) => {
    setSaved((current) => current.filter((item) => !(item.slug === line.slug && item.storage === line.storage && item.color === line.color)));
    addToCart(line.slug, line.storage, line.color);
  };
  const toggleCompare = (slug: string) => setCompare((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length < 4 ? [...current, slug] : current);
  return <CartContext.Provider value={{ cart, cartCount: cart.reduce((sum, line) => sum + line.qty, 0), addToCart, updateQty, removeFromCart, compare, toggleCompare, isCompared: (slug) => compare.includes(slug), saved, saveForLater, restoreSaved }}>{children}</CartContext.Provider>;
}

function NatisMark() {
  return <span className="natis-mark" aria-hidden="true"><img src="/brand/natis-enterprise-logo.png" alt="" /></span>;
}

function Header() {
  const [location] = useLocation();
  const { cartCount } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [{ href: "/", label: "Home" }, { href: "/shop", label: "Shop" }, { href: "/brands/apple", label: "iPhones" }, { href: "/brands/samsung", label: "Samsung" }, { href: "/phones", label: "Android Phones" }, { href: "/phones", label: "Accessories" }, { href: "/phones", label: "Repairs" }, { href: "/phones", label: "Contact" }];
  return <>
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="wordmark" onClick={() => setMobileOpen(false)}><NatisMark /><span>Natis <b>Phone Ent</b></span></Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <Link key={`${item.label}-${item.href}`} href={item.href} className={location === item.href || (item.href !== "/" && location.startsWith(item.href)) ? "active" : ""}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link href="/cart" className="icon-action" data-cart-target="true" aria-label={`Cart with ${cartCount} items`}><ShoppingBag size={19} /><span className="action-label">Bag</span>{cartCount > 0 && <i>{cartCount}</i>}</Link>
          <button className="mobile-menu-button" aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobileOpen && <div className="mobile-nav"><Link href="/shop" onClick={() => setMobileOpen(false)}>Shop phones <ArrowRight size={15} /></Link><Link href="/brands/apple" onClick={() => setMobileOpen(false)}>iPhones <ArrowRight size={15} /></Link><Link href="/cart" onClick={() => setMobileOpen(false)}>Your bag <ArrowRight size={15} /></Link></div>}
    </header>
    <div className="announcement"><span><ShieldCheck size={14} /> Circle, Accra - Ghana · 055 501 6982 · PAY ON DELIVERY — SUBJECT TO CONFIRMATION</span><Link href="/phones">Call 055 501 6982 <ArrowRight size={14} /></Link></div>
  </>;
}

function PhoneVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  return <div className={`phone-visual ${compact ? "compact" : ""}`} style={{ "--accent": product.visual.accent, "--accent-soft": product.visual.accentSoft } as React.CSSProperties}>
    {product.imageUrl ? <img className="product-photo" src={product.imageUrl} alt={`${product.brandLabel} ${product.name}`} loading="lazy" /> : <><div className="visual-glow" /><div className="device-shadow" /><div className="device"><div className="device-camera"><span /><span /><span /></div><div className="device-copy">{product.visual.initials}</div><div className="device-line" /></div></>}
    <span className="visual-stamp">{product.brandLabel}</span>
  </div>;
}

function StatusBadge({ product }: { product: Product }) {
  const tone = product.price === 0 ? "review" : product.status === "active" ? "good" : product.status === "coming_soon" ? "soon" : "review";
  return <span className={`status-badge ${tone}`}>{product.price === 0 ? "Price on request" : product.status === "active" ? "Available now" : product.status === "coming_soon" ? "Coming soon" : "Availability review"}</span>;
}

const whatsappUrl = (product: Product) => `https://wa.me/233555016982?text=${encodeURIComponent(`Hi Natis Phone Ent, is ${product.name} available in Circle, Accra?` )}`;
function flyProductToCart(button: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const source = button.closest(".product-card")?.querySelector(".phone-visual") as HTMLElement | null;
  const target = document.querySelector("[data-cart-target]") as HTMLElement | null;
  if (!source || !target) return;
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const flyer = source.cloneNode(true) as HTMLElement;
  flyer.classList.add("cart-flyer");
  flyer.style.left = `${sourceRect.left}px`;
  flyer.style.top = `${sourceRect.top}px`;
  flyer.style.width = `${sourceRect.width}px`;
  flyer.style.height = `${sourceRect.height}px`;
  document.body.appendChild(flyer);
  const translateX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const translateY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
  requestAnimationFrame(() => {
    flyer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(.2) rotate(8deg)`;
    flyer.style.opacity = "0.15";
  });
  window.setTimeout(() => flyer.remove(), 620);
}
function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const canBuy = product.status === "active" && (product.stockQty || 0) > 0;
  return <article className="product-card">
    <Link href={`/phones/${product.slug}`} className="product-image-link"><div className="card-topline"><StatusBadge product={product} /></div><PhoneVisual product={product} compact /></Link>
    <div className="product-card-body"><p className="eyebrow">{product.brandLabel}</p><Link href={`/phones/${product.slug}`} className="product-name">{product.name}</Link><p className="product-description">{product.shortDescription}</p><div className="price-row"><strong>{formatPrice(product.price)}</strong>{product.compareAtPrice && <del>{formatPrice(product.compareAtPrice)}</del>}{discountPercent(product) > 0 && <span className="discount">-{discountPercent(product)}%</span>}</div><div className="card-meta"><span>{product.storageOptions[0].label} base</span><span className="dot" /> <span>{product.availabilityLabel.split("·")[0].trim()}</span></div><div className="card-actions"><a className="card-cta whatsapp" href={whatsappUrl(product)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a><Link href={`/phones/${product.slug}`} className="card-cta secondary">View details <ArrowRight size={15} /></Link><button type="button" className="card-cta add-to-cart" onClick={(event) => { flyProductToCart(event.currentTarget); addToCart(product.slug, product.storageOptions[0]?.value || "default", product.colorOptions[0]?.value || "default"); }}><ShoppingBag size={15} /> Add to cart</button></div></div>
  </article>;
}

const dealCategories = [
  { label: "Samsung", slug: "samsung", note: "Galaxy S26 Ultra", href: "/brands/samsung", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra.jpg" },
  { label: "iPhones", slug: "apple", note: "iPhone 18 Pro Max", href: "/brands/apple", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone18-pro-max.jpg" },
  { label: "OnePlus", slug: "oneplus", note: "OnePlus 15", href: "/brands/oneplus", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/oneplus-15.jpg" },
  { label: "Xiaomi", slug: "xiaomi", note: "Xiaomi 17 Ultra", href: "/brands/xiaomi", imageUrl: "https://fdn2.gsmarena.com/vv/pics/xiaomi/xiaomi-17-ultra-global-1.jpg" },
  { label: "POCO", slug: "poco", note: "POCO X8 Pro", href: "https://wa.me/233555016982?text=Hi%20Natis%20Phone%20Ent%2C%20please%20share%20your%20POCO%20stock%20in%20Circle%2C%20Accra.", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x8-pro.jpg" },
  { label: "LG", slug: "lg", note: "LG Wing 5G", href: "https://wa.me/233555016982?text=Hi%20Natis%20Phone%20Ent%2C%20please%20share%20your%20LG%20stock%20in%20Circle%2C%20Accra.", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/lg-wing.jpg" },
  { label: "Motorola", slug: "motorola", note: "Signature 27", href: "/brands/motorola", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/motorola-signature-27.jpg" },
  { label: "Realme", slug: "realme", note: "Realme 14", href: "https://wa.me/233555016982?text=Hi%20Natis%20Phone%20Ent%2C%20please%20share%20your%20Realme%20stock%20in%20Circle%2C%20Accra.", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/realme-14-5g.jpg" },
  { label: "OPPO", slug: "oppo", note: "Find X10 Pro Max", href: "/brands/oppo", imageUrl: "https://fdn2.gsmarena.com/vv/bigpic/oppo-find-x10-pro-max.jpg" },
];
function BrandChips() {
  return <div className="category-grid">{dealCategories.map((category) => {
    const isInternal = category.href.startsWith("/");
    const content = <><span className={`brand-logo-mark ${category.slug}`} aria-hidden="true">{category.slug === "apple" ? "●" : category.label === "Samsung" ? "S" : category.label === "OnePlus" ? "1+" : category.label === "Xiaomi" ? "mi" : category.label === "Motorola" ? "M" : category.label === "OPPO" ? "oppo" : category.label === "Realme" ? "R" : category.label === "POCO" ? "POCO" : "LG"}</span><span className="brand-chip-label"><b>{category.label}</b></span></>;
    return isInternal ? <Link key={category.slug} href={category.href} className="category-card">{content}</Link> : <a key={category.slug} href={category.href} target="_blank" rel="noreferrer" className="category-card">{content}</a>;
  })}</div>;
}

function TrustStrip() {
  return <div className="trust-strip"><div><ShieldCheck size={19} /><span><b>Verified pricing</b><small>Prices confirmed before you pay.</small></span></div><div><Truck size={19} /><span><b>Circle, Accra</b><small>Visit or call our shop.</small></span></div><div><RotateCcw size={19} /><span><b>Repairs too</b><small>Enquire about device repairs.</small></span></div></div>;
}

function Home() {
  const storefrontProducts = getCatalogPublicProducts();
  // Feature real catalog entries rather than hard-coded demo phones.
  const featured = [...storefrontProducts.filter((product) => product.featured), ...storefrontProducts]
    .filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index)
    .slice(0, 6);
  return <><Header /><main>
    <section className="hero-banner" aria-label="Latest phones and accessories"><div className="hero-banner-image" role="img" aria-label="Promotional image of the latest smartphones"><div className="hero-banner-content"><span className="hero-banner-kicker">WELCOME TO NATIS PHONE ENT</span><h1>Latest phones <span>&amp; accessories</span></h1><p>Get the best smartphones, laptops and accessories at competitive prices. Pay on delivery in Accra.</p><Link href="/phones" className="button primary hero-shop-button">Shop Now <ArrowRight size={17} /></Link><div className="hero-benefits"><span><PackageCheck size={16} /> Pay on Delivery</span><span><ShieldCheck size={16} /> Genuine Products</span><span><Truck size={16} /> Fast Service</span></div></div><div className="hero-image-hint">Add your banner image at <code>client/public/images/hero-phones.jpg</code></div></div></section>
    <div className="container"><TrustStrip /></div>
    <section className="section container categories-section"><div className="section-heading"><div><span className="kicker">Our categories</span><h2>Brands we deal in</h2><p className="section-lede">Mostly Samsung, iPhones, OnePlus, Xiaomi, POCO, LG, Motorola, Realme, and OPPO.</p></div><Link href="/phones" className="text-link">View all products <ChevronRightIcon /></Link></div><BrandChips /></section>
    <section className="section container featured-section"><div className="section-heading"><div><span className="kicker">Latest in store</span><h2>Featured Phones</h2></div><Link href="/phones" className="text-link">Browse the full shop <ChevronRightIcon /></Link></div><div className="product-grid">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="confidence-section"><div className="container confidence-inner"><div><span className="kicker light">Talk to us</span><h2>Need a hand choosing?<br /><em>Talk to our team.</em></h2><p>Call or WhatsApp us for current stock, prices, accessories, and repairs in Circle, Accra.</p><a href="https://wa.me/233555016982?text=Hi%20Natis%20Phone%20Ent%2C%20I%20need%20help%20choosing%20a%20phone." target="_blank" rel="noreferrer" className="button light-button"><MessageCircle size={16} /> WhatsApp us <ArrowRight size={16} /></a></div><div className="confidence-list"><div><span>01</span><p><b>Current by default</b><small>We focus on models worth considering now, not yesterday’s stock.</small></p></div><div><span>02</span><p><b>Clear by design</b><small>Prices, variants, availability, and sources are easy to find.</small></p></div><div><span>03</span><p><b>Human when it matters</b><small>Need a second opinion? Our team is close by.</small></p></div></div></div></section>
  </main><Footer /></>;
}

function ChevronRightIcon() { return <ArrowRight size={15} />; }

function FilterPanel({ selectedBrand, setSelectedBrand, availability, setAvailability, onClose }: { selectedBrand: string; setSelectedBrand: (value: string) => void; availability: string; setAvailability: (value: string) => void; onClose?: () => void }) {
  return <aside className={`filter-panel ${onClose ? "drawer" : ""}`}><div className="filter-heading"><div><span className="kicker">Refine your search</span><h3>Filters</h3></div>{onClose && <button className="close-button" onClick={onClose} aria-label="Close filters"><X size={18} /></button>}</div><div className="filter-group"><label>Brand</label><div className="filter-options">{<button className={selectedBrand === "all" ? "checked" : ""} onClick={() => setSelectedBrand("all")}><span className="check-box">{selectedBrand === "all" && <Check size={12} />}</span>All brands <span>{getCatalogPublicProducts().length}</span></button>}{(Object.keys(brandMeta) as BrandId[]).map((brand) => <button key={brand} className={selectedBrand === brand ? "checked" : ""} onClick={() => setSelectedBrand(brand)}><span className="check-box">{selectedBrand === brand && <Check size={12} />}</span>{brandMeta[brand].label} <span>{getCatalogPublicProducts().filter((item) => item.brand === brand).length}</span></button>)}</div></div><div className="filter-group"><label>Availability</label><div className="filter-options">{[["all", "Show all"], ["active", "Available now"], ["review", "Availability review"], ["coming_soon", "Coming soon"]].map(([value, label]) => <button key={value} className={availability === value ? "checked" : ""} onClick={() => setAvailability(value)}><span className="radio-box">{availability === value && <span />}</span>{label}</button>)}</div></div><div className="filter-callout"><ShieldCheck size={17} /><p><b>Every listing carries context.</b><span>Market, stock, source, and rights status are part of our catalog.</span></p></div></aside>;
}

function PhonesPage() {
  const [query, setQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("featured");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filtered = useMemo(() => getCatalogPublicProducts().filter((product) => {
    const matchesQuery = `${product.name} ${product.brandLabel} ${product.shortDescription}`.toLowerCase().includes(query.toLowerCase());
    const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand;
    const matchesAvailability = availability === "all" || product.status === availability;
    return matchesQuery && matchesBrand && matchesAvailability;
  }).sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "availability" ? Number(b.status === "active") - Number(a.status === "active") : Number(b.featured) - Number(a.featured)), [availability, query, selectedBrand, sort]);
  return <><Header /><main className="container catalog-page"><div className="page-intro"><div><span className="kicker">Latest in store · {getCatalogProducts().length} listings</span><h1>Latest phones &amp; accessories <em>— Pay on delivery in Accra.</em></h1><p>Browse our catalogue, confirm availability, and contact us to get the latest prices.</p></div><div className="catalog-note"><ShieldCheck size={18} /><span>Pay on delivery<small>Subject to confirmation</small></span></div></div><div className="catalog-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models or brands" aria-label="Search models or brands" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</div><button className="filter-toggle" onClick={() => setDrawerOpen(true)}><SlidersHorizontal size={16} /> Filters {(selectedBrand !== "all" || availability !== "all") && <i>1+</i>}</button><label className="sort-select"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="availability">Available first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={15} /></label></div><div className="catalog-layout"><FilterPanel selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand} availability={availability} setAvailability={setAvailability} /><section className="results"><div className="results-heading"><span><b>{filtered.length}</b> phones to explore</span>{(selectedBrand !== "all" || availability !== "all" || query) && <button onClick={() => { setSelectedBrand("all"); setAvailability("all"); setQuery(""); }}>Clear filters <X size={13} /></button>}</div>{filtered.length > 0 ? <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty-state"><Search size={28} /><h2>No phones match that search.</h2><p>Try a different model, brand, or clear your filters.</p><button className="button primary" onClick={() => { setSelectedBrand("all"); setAvailability("all"); setQuery(""); }}>Show all phones</button></div>}</section></div></main>{drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}><div onClick={(event) => event.stopPropagation()}><FilterPanel selectedBrand={selectedBrand} setSelectedBrand={(value) => { setSelectedBrand(value); setDrawerOpen(false); }} availability={availability} setAvailability={(value) => { setAvailability(value); setDrawerOpen(false); }} onClose={() => setDrawerOpen(false)} /></div></div>}<Footer /></>;
}

function ProductPage() {
  const [, params] = useRoute<{ slug: string }>("/phones/:slug");
  const product = params?.slug ? getCatalogPublicProducts().find((item) => item.slug === params.slug) : undefined;
  const { addToCart, toggleCompare, isCompared } = useStore();
  const [storage, setStorage] = useState(product?.storageOptions[0].value || "256");
  const [color, setColor] = useState(product?.colorOptions[0].value || "default");
  const [quantity, setQuantity] = useState(1);
  if (!product) return <NotFound />;
  const canBuy = product.status === "active" && (product.stockQty || 0) > 0;
  return <><Header /><main className="container detail-page"><Link href="/phones" className="back-link"><ChevronLeft size={15} /> Back to phones</Link><div className="detail-grid"><div className="detail-gallery"><div className="detail-visual"><PhoneVisual product={product} /></div><div className="detail-gallery-note"><Info size={14} /><span>Image reference from GSMArena; rights clearance is pending before commercial publication.</span></div></div><section className="detail-copy"><div className="detail-top"><StatusBadge product={product} /><span className="detail-region">{product.region}</span></div><p className="eyebrow">{product.brandLabel}</p><h1>{product.name}</h1><p className="detail-description">{product.shortDescription}</p><div className="detail-price"><strong>{formatPrice(product.price)}</strong>{product.compareAtPrice && <><del>{formatPrice(product.compareAtPrice)}</del><span className="discount">Save {discountPercent(product)}%</span></>}</div><p className="detail-stock"><span className={canBuy ? "stock-dot" : "stock-dot muted"} />{product.availabilityLabel}</p><div className="choice-group"><div className="choice-label"><span>Storage</span><b>{storage}</b></div><div className="choice-buttons">{product.storageOptions.map((option) => <button key={option.value} className={storage === option.value ? "selected" : ""} onClick={() => setStorage(option.value)}>{option.label}</button>)}</div></div><div className="choice-group"><div className="choice-label"><span>Colour</span><b>{product.colorOptions.find((option) => option.value === color)?.label}</b></div><div className="color-buttons">{product.colorOptions.map((option) => <button key={option.value} className={color === option.value ? "selected" : ""} onClick={() => setColor(option.value)}><span className={`swatch ${option.value}`} />{option.label}</button>)}</div></div><div className="purchase-row"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(9, quantity + 1))} aria-label="Increase quantity"><Plus size={15} /></button></div><a className="button primary add-button" href={whatsappUrl(product)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp us</a></div><button className={`compare-button ${isCompared(product.slug) ? "selected" : ""}`} onClick={() => toggleCompare(product.slug)}><Sparkles size={16} />{isCompared(product.slug) ? "Added to comparison" : "Add to comparison"}</button><div className="detail-perks"><div><Truck size={18} /><span><b>Delivery</b><small>Free on available models</small></span></div><div><ShieldCheck size={18} /><span><b>Warranty</b><small>Market-specific coverage</small></span></div><div><RotateCcw size={18} /><span><b>Returns</b><small>Clear terms before you buy</small></span></div></div></section></div><section className="spec-section"><div className="section-heading"><div><span className="kicker">The useful details</span><h2>At a glance</h2></div><span className="source-note">Verified {product.sourceCheckedAt} · {product.region}</span></div><div className="spec-grid">{Object.entries(product.specs).map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div><div className="source-disclosure"><Info size={16} /><p>This listing and price come from the uploaded CSV. The product image is a GSMArena reference; our team confirms current stock, condition, delivery method, and image usage before handoff.</p></div></section></main><Footer /></>;
}

function BrandPage() {
  const [, params] = useRoute<{ brand: string }>("/brands/:brand");
  const brand = params?.brand as BrandId;
  const meta = brandMeta[brand];
  const items = getCatalogPublicProducts().filter((product) => product.brand === brand);
  if (!meta) return <NotFound />;
  return <><Header /><main className="container brand-page"><Link href="/phones" className="back-link"><ChevronLeft size={15} /> Shop phones</Link><div className="brand-hero"><span className={`brand-dot large ${brand}`} /><div><span className="kicker">Shop by brand</span><h1>{meta.label}</h1><p>{meta.short}. Explore the models we’re currently verifying for your market.</p></div></div><div className="brand-bar"><span><b>{items.length}</b> model{items.length === 1 ? "" : "s"} in the catalog</span><Link href="/compare" className="text-link">Compare models <ArrowRight size={15} /></Link></div><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div></main><Footer /></>;
}

function ComparePage() {
  const { compare, toggleCompare } = useStore();
  const compared = compare.map((slug) => getCatalogPublicProducts().find((product) => product.slug === slug)).filter(Boolean) as Product[];
  const defaults = getCatalogPublicProducts().slice(0, 3);
  return <><Header /><main className="container compare-page"><div className="page-intro compact-intro"><div><span className="kicker">Decision workspace · up to 4 phones</span><h1>Put your shortlist <em>side by side.</em></h1><p>Comparison should make the answer clearer, not make you open twelve tabs.</p></div><Link href="/phones" className="button secondary-button">Add a phone <Plus size={16} /></Link></div>{compared.length === 0 ? <div className="compare-empty"><div className="compare-empty-icon"><Sparkles size={25} /></div><h2>Your comparison is ready when you are.</h2><p>Pick up to four phones from the catalog and we’ll line up the details that matter.</p><div className="suggestion-row">{defaults.map((product) => <button key={product.slug} onClick={() => toggleCompare(product.slug)}><span>{product.brandLabel}</span>{product.name}<Plus size={15} /></button>)}</div></div> : <div className="compare-table-wrap"><div className="compare-table"><div className="compare-label-column"><div className="table-spacer" /><div className="table-label">Price</div><div className="table-label">Status</div>{Object.keys(compared[0].specs).map((key) => <div className="table-label" key={key}>{key}</div>)}<div className="table-label">Best for</div><div className="table-spacer bottom" /></div>{compared.map((product) => <div className="compare-column" key={product.slug}><div className="compare-product-head"><button className="remove-compare" onClick={() => toggleCompare(product.slug)} aria-label={`Remove ${product.name}`}><X size={14} /></button><PhoneVisual product={product} compact /><span className="eyebrow">{product.brandLabel}</span><Link href={`/phones/${product.slug}`}>{product.name}</Link></div><div className="compare-value price">{formatPrice(product.price)}</div><div className="compare-value"><StatusBadge product={product} /></div>{Object.entries(product.specs).map(([key, value]) => <div className="compare-value" key={key}>{value}</div>)}<div className="compare-value best-for">{product.brand === "apple" ? "Video, ecosystem, longevity" : "Power users, photography"}</div><Link href={`/phones/${product.slug}`} className="compare-cta">See details <ArrowRight size={14} /></Link></div>)}</div></div>}<p className="compare-footnote"><Info size={14} /> Comparison uses the same market and verification context shown on each product.</p></main><Footer /></>;
}

function CartPage() {
  const { cart, saved, updateQty, removeFromCart, saveForLater, restoreSaved } = useStore();
  const lines = cart.map((line) => ({ line, product: getCatalogPublicProducts().find((product) => product.slug === line.slug) })).filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
  const savedLines = saved.map((line) => ({ line, product: getCatalogPublicProducts().find((product) => product.slug === line.slug) })).filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
  const subtotal = lines.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);
  return <><Header /><main className="container cart-page"><div className="page-intro compact-intro"><div><span className="kicker">Your selections</span><h1>Your bag, <em>without the clutter.</em></h1><p>{lines.length === 0 ? "Nothing here yet. Start with a phone worth considering." : `${cart.reduce((sum, line) => sum + line.qty, 0)} item${cart.reduce((sum, line) => sum + line.qty, 0) === 1 ? "" : "s"} ready for review.`}</p></div></div>{lines.length === 0 ? <div className="empty-state cart-empty"><ShoppingBag size={29} /><h2>Your bag is waiting.</h2><p>Browse the catalog and add a phone when you find the right fit.</p><Link href="/phones" className="button primary">Browse phones <ArrowRight size={16} /></Link></div> : <div className="cart-layout"><div className="cart-lines">{lines.map(({ line, product }) => <article className="cart-line" key={`${line.slug}-${line.storage}-${line.color}`}><PhoneVisual product={product} compact /><div className="cart-line-copy"><span className="eyebrow">{product.brandLabel}</span><Link href={`/phones/${product.slug}`} className="product-name">{product.name}</Link><span className="cart-variant">{line.storage} GB · {product.colorOptions.find((option) => option.value === line.color)?.label || product.colorOptions[0].label}</span><div className="cart-line-actions"><div className="quantity-control"><button onClick={() => updateQty(line.slug, line.storage, line.color, line.qty - 1)} aria-label="Decrease quantity"><Minus size={14} /></button><span>{line.qty}</span><button onClick={() => updateQty(line.slug, line.storage, line.color, line.qty + 1)} aria-label="Increase quantity"><Plus size={14} /></button></div><button className="remove-line" onClick={() => removeFromCart(line.slug, line.storage, line.color)}><Trash2 size={14} /> Remove</button><button className="save-line" onClick={() => saveForLater(line)}><Heart size={14} /> Save for later</button></div></div><strong className="cart-line-price">{formatPrice(product.price * line.qty)}</strong></article>)}</div><aside className="summary-card"><div className="summary-header"><span>Order summary</span><PackageCheck size={18} /></div><div className="summary-row"><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div className="summary-row"><span>Delivery estimate</span><b className="green-text">Free</b></div><div className="summary-row muted-row"><span>Discount code</span><button>Have a code?</button></div><div className="summary-total"><span>Total before payment</span><strong>{formatPrice(subtotal)}</strong></div><Link href="/checkout" className="button primary full-width">Continue to checkout <ArrowRight size={16} /></Link><p className="summary-note"><ShieldCheck size={14} /> Payment stays pending until a configured provider confirms it.</p></aside></div>}{savedLines.length > 0 && <section className="saved-section"><div className="section-heading"><div><span className="kicker">Saved for later</span><h2>Keep it in mind.</h2></div></div><div className="saved-lines">{savedLines.map(({ line, product }) => <div className="saved-line-item" key={`${line.slug}-${line.storage}-${line.color}`}><PhoneVisual product={product} compact /><div><span className="eyebrow">{product.brandLabel}</span><b>{product.name}</b><small>{line.storage} GB · {formatPrice(product.price)}</small></div><button className="button secondary-button" onClick={() => restoreSaved(line)}>Move to bag <ArrowRight size={14} /></button></div>)}</div></section>}</main><Footer /></>;
}

function CheckoutPage() {
  const { cart } = useStore();
  const [, navigate] = useLocation();
  const lines = cart.map((line) => ({ line, product: getCatalogPublicProducts().find((product) => product.slug === line.slug) })).filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
  const subtotal = lines.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", country: "", delivery: "standard", payment: "pending" });
  const [error, setError] = useState("");
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.name || !form.email || !form.address || !form.city || !form.country) { setError("Complete the highlighted delivery details before continuing."); return; } const id = `NT-${Math.floor(100000 + Math.random() * 899999)}`; navigate(`/order-confirmation/${id}`); };
  return <><Header /><main className="container checkout-page"><Link href="/cart" className="back-link"><ChevronLeft size={15} /> Back to bag</Link><div className="checkout-heading"><div><span className="kicker">Checkout · secure handoff</span><h1>Let’s get your phone <em>moving.</em></h1><p>This is a checkout-ready handoff. Payment remains pending until Natis connects a confirmed provider.</p></div><div className="checkout-steps"><span className="active">1 <small>Details</small></span><i /><span>2 <small>Review</small></span><i /><span>3 <small>Confirmation</small></span></div></div>{cart.length === 0 ? <div className="empty-state cart-empty"><ShoppingBag size={28} /><h2>Your bag is empty.</h2><Link href="/phones" className="button primary">Browse phones <ArrowRight size={16} /></Link></div> : <form className="checkout-layout" onSubmit={submit}><div className="checkout-form"><section className="form-section"><div className="form-heading"><span>01</span><div><h2>Contact details</h2><p>We’ll use these for order updates only.</p></div></div><div className="field-grid"><label className="field wide"><span>Full name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" /></label><label className="field"><span>Email address</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" /></label><label className="field"><span>Phone number</span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 555 000 0000" /></label></div></section><section className="form-section"><div className="form-heading"><span>02</span><div><h2>Delivery address</h2><p>We’ll confirm local availability and final delivery timing.</p></div></div><div className="field-grid"><label className="field wide"><span>Street address</span><input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="123 Main Street" /></label><label className="field"><span>City</span><input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Your city" /></label><label className="field"><span>Country / region</span><input value={form.country} onChange={(event) => update("country", event.target.value)} placeholder="United States" /></label></div><div className="delivery-options"><label className={form.delivery === "standard" ? "selected" : ""}><input type="radio" name="delivery" checked={form.delivery === "standard"} onChange={() => update("delivery", "standard")} /><span><b>Standard delivery</b><small>Free · 2–5 business days</small></span><strong>Free</strong></label><label className={form.delivery === "express" ? "selected" : ""}><input type="radio" name="delivery" checked={form.delivery === "express"} onChange={() => update("delivery", "express")} /><span><b>Express delivery</b><small>1–2 business days</small></span><strong>$24</strong></label></div></section><section className="form-section"><div className="form-heading"><span>03</span><div><h2>Payment method</h2><p>Provider connection is intentionally replaceable.</p></div></div><div className="payment-placeholder"><div><ShieldCheck size={20} /><span><b>Payment is not connected yet</b><small>Your order request will be prepared as payment pending. No payment has been taken.</small></span></div><span className="pending-pill">Pending setup</span></div></section>{error && <p className="form-error"><Info size={16} /> {error}</p>}<button className="button primary checkout-submit" type="submit">Submit order request <ArrowRight size={17} /></button></div><aside className="summary-card checkout-summary"><div className="summary-header"><span>Review your order</span><span className="secure-label"><ShieldCheck size={14} /> Safe handoff</span></div>{lines.map(({ line, product }) => <div className="mini-line" key={line.slug}><span className="mini-qty">{line.qty}</span><span>{product.name}<small>{product.brandLabel} · {line.storage} GB</small></span><b>{formatPrice(product.price * line.qty)}</b></div>)}<div className="summary-row"><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div className="summary-row"><span>Delivery</span><b>{form.delivery === "express" ? "$24" : "Free"}</b></div><div className="summary-total"><span>Estimated total</span><strong>{formatPrice(subtotal + (form.delivery === "express" ? 24 : 0))}</strong></div><p className="summary-note"><ShieldCheck size={14} /> Your details are only used to prepare this order handoff.</p></aside></form>}</main><Footer /></>;
}

function ConfirmationPage() {
  const [, params] = useRoute<{ id: string }>("/order-confirmation/:id");
  return <><Header /><main className="container confirmation-page"><div className="confirmation-card"><div className="success-icon"><Check size={27} /></div><span className="kicker">Order request received</span><h1>We’ve got the <em>next step.</em></h1><p className="confirmation-lede">Your order request <b>#{params?.id}</b> is ready for review. A Natis Phone Ent specialist will confirm market availability, delivery, and the payment handoff with you.</p><div className="confirmation-status"><div className="status-line active"><span><Check size={13} /></span><p><b>Request received</b><small>Your details are ready for handoff.</small></p></div><div className="status-line"><span>2</span><p><b>Availability confirmed</b><small>We’ll check the selected market and variant.</small></p></div><div className="status-line"><span>3</span><p><b>Payment confirmed</b><small>No payment has been taken at this stage.</small></p></div></div><div className="confirmation-actions"><Link href="/phones" className="button primary">Keep browsing <ArrowRight size={16} /></Link><Link href="/" className="text-link">Back to home <ArrowRight size={15} /></Link></div></div></main><Footer /></>;
}

function Footer() {
  return <footer className="site-footer"><div className="container footer-inner"><div><Link href="/" className="wordmark footer-wordmark"><NatisMark /><span>Natis <b>Phone Ent</b></span></Link><p>Quality phones, best prices in Accra.</p></div><div className="footer-links"><div><span>Explore</span><Link href="/phones">Shop phones</Link><Link href="/brands/apple">iPhones</Link><Link href="/brands/samsung">Samsung</Link></div><div><span>Trust</span><a href="tel:+233555016982">Call 055 501 6982</a><a href="https://wa.me/233555016982" target="_blank" rel="noreferrer">WhatsApp us</a><a href="/phones">Repairs &amp; services</a></div></div></div><div className="container footer-bottom"><span>© 2026 Natis Phone Ent</span><span>Circle, Accra · Ghana</span></div></footer>;
}


function AdminPage() {
  const [draft, setDraft] = useState<Product[]>(() => getCatalogProducts());
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ category: "Phone" as "Phone" | "Laptop", brand: "", name: "", storage: "", price: "", notes: "", imageUrl: "", sourceUrl: "" });
  const updateForm = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => { setEditing(null); setForm({ category: "Phone", brand: "", name: "", storage: "", price: "", notes: "", imageUrl: "", sourceUrl: "" }); };
  const saveProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!form.category || !form.brand.trim() || !form.name.trim() || !form.storage.trim() || !form.price.trim()) { setNotice("Category, brand, name, capacity, and price are required."); return; }
    const existing = editing ? draft.find((item) => item.id === editing) : undefined;
    const brandId = form.brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") as BrandId;
    const brandLabel = form.brand.trim();
    const slugBase = `${brandId}-${form.name}-${form.storage}-${form.price}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const product: Product = {
      id: existing?.id || `${slugBase}-${Date.now()}`,
      slug: existing?.slug || `${slugBase}-${draft.length + 1}`,
      brand: brandId,
      brandLabel,
      category: form.category,
      name: form.name.trim(),
      shortDescription: `${form.category} · ${form.storage.trim()} · GHS ${Number(form.price).toLocaleString()}${form.notes.trim() ? ` · ${form.notes.trim()}` : ""}`,
      status: "active",
      price: Number(form.price),
      currency: "GHS",
      region: "Circle, Accra · Ghana",
      storageOptions: [{ label: form.storage.trim(), value: form.storage.trim().toLowerCase() }],
      colorOptions: [{ label: "Ask us", value: "ask-us" }],
      availabilityLabel: form.notes.trim() || "Available in Accra",
      specs: { Storage: form.storage.trim(), Colour: "Confirm with our team", Notes: form.notes.trim() || "Admin listing", Price: `GHS ${Number(form.price).toLocaleString()}` },
      sourceUrl: form.sourceUrl.trim() || "https://www.gsmarena.com/",
      sourceCheckedAt: "2026-10-25",
      imageRightsStatus: form.imageUrl.trim() ? "pending_review" : "original",
      imageRightsNote: form.imageUrl.trim() ? "Admin-uploaded reference; rights clearance pending." : "Original placeholder.",
      imageUrl: form.imageUrl.trim() || undefined,
      featured: false,
      visual: { accent: brandId === "apple" ? "#303236" : brandId === "samsung" ? "#5b916e" : "#2c5e48", accentSoft: brandId === "apple" ? "#eef0f4" : brandId === "samsung" ? "#eaf2ec" : "#e8f1eb", device: "#222827", initials: form.name.split(" ").slice(-2).map((part) => part[0]).join("").slice(0, 3).toUpperCase() },
    };
    setDraft((current) => editing ? current.map((item) => item.id === editing ? product : item) : [product, ...current]);
    setNotice(editing ? "Product updated in the draft." : "Product added to the draft.");
    resetForm();
  };
  const startEdit = (product: Product) => { setEditing(product.id); setForm({ category: product.category || "Phone", brand: product.brandLabel || product.brand, name: product.name, storage: product.storageOptions[0]?.label || "", price: String(product.price), notes: product.specs.Notes || "", imageUrl: product.imageUrl || "", sourceUrl: product.sourceUrl || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const publish = async () => {
    try {
      if (supabaseConfigured) {
        await publishSupabaseCatalog(draft);
        localStorage.setItem("natis-published-products", JSON.stringify(draft));
        setNotice(`Published ${draft.length} products to Supabase.`);
      } else {
        localStorage.setItem("natis-published-products", JSON.stringify(draft));
        setNotice(`Saved ${draft.length} products in this browser only. Configure Supabase to share changes with customers.`);
      }
      window.dispatchEvent(new Event("natis-catalog-published"));
    } catch (error) {
      setNotice(`Publish failed: ${error instanceof Error ? error.message : "Check Supabase configuration and permissions."}`);
    }
  };
  const deleteProduct = (id: string) => { setDraft((current) => current.filter((item) => item.id !== id)); setNotice("Product removed from the draft. Publish to apply the deletion."); };
  const uploadJson = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); const incoming = Array.isArray(parsed) ? parsed : [parsed]; setDraft((current) => [...incoming, ...current]); setNotice(`${incoming.length} product${incoming.length === 1 ? "" : "s"} added to the draft.`); } catch { setNotice("Upload a valid JSON product or product array."); } }; reader.readAsText(file); };
  return <><Header /><main className="container admin-page"><div className="admin-hero"><div><span className="kicker">Public catalog control</span><h1>Manage the <em>storefront.</em></h1><p>Add phones or laptops from any brand, then publish the draft when it is ready.</p></div><div className="admin-warning"><ShieldCheck size={17} /><b>Admin access needs setup</b><span>Before launch, enable Supabase Auth and assign the admin role. Do not publish this dashboard publicly yet.</span></div></div>{notice && <div className="admin-notice"><Check size={16} /> {notice}</div>}<section className="admin-editor"><div className="section-heading"><div><span className="kicker">Product editor</span><h2>{editing ? "Edit product" : "Add a product"}</h2></div><label className="button secondary-button upload-button"><Upload size={15} /> Upload JSON<input type="file" accept="application/json,.json" onChange={uploadJson} /></label></div><form className="admin-form" onSubmit={saveProduct}><label>Category<select value={form.category} onChange={(event) => updateForm("category", event.target.value)}><option value="Phone">Phone</option><option value="Laptop">Laptop</option></select></label><label>Brand<input value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} placeholder="Samsung, Apple, Dell, Lenovo..." /></label><label>Product name<input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Galaxy S26 Ultra or ThinkPad X1" /></label><label>Storage / capacity<input value={form.storage} onChange={(event) => updateForm("storage", event.target.value)} placeholder="256GB or 16GB RAM / 512GB SSD" /></label><label>Price (GHS)<input type="number" min="0" value={form.price} onChange={(event) => updateForm("price", event.target.value)} placeholder="4950" /></label><label>Notes<input value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="With box, inbox" /></label><label>Product image URL<input value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} placeholder="https://..." /></label><label className="wide-field">Source URL<input value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} placeholder="https://www.gsmarena.com/..." /></label><div className="admin-form-actions"><button className="button primary" type="submit">{editing ? <><Pencil size={15} /> Save changes</> : <><Plus size={15} /> Add to draft</>}</button>{editing && <button type="button" className="button secondary-button" onClick={resetForm}>Cancel</button>}</div></form></section><section className="admin-toolbar"><div><span className="kicker">Draft catalog</span><h2>{draft.length} products ready</h2></div><button className="button primary" onClick={publish}><PackageCheck size={16} /> Publish catalog</button></section><section className="admin-list">{draft.map((product) => <article className="admin-row" key={product.id}><PhoneVisual product={product} compact /><div><span className="eyebrow">{product.brandLabel}</span><h3>{product.name}</h3><p>{product.category || "Phone"} · {product.storageOptions[0]?.label} · {formatPrice(product.price)} · {product.specs.Notes}</p></div><div className="admin-row-actions"><button aria-label={`Edit ${product.name}`} onClick={() => startEdit(product)}><Pencil size={15} /></button><button aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product.id)}><Trash2 size={15} /></button></div></article>)}</section></main><Footer /></>;
}

function CatalogSync() {
  useEffect(() => {
    if (!supabaseConfigured) return;
    loadSupabaseCatalog().then((products) => {
      if (!products || products.length === 0) return;
      const next = JSON.stringify(products);
      if (window.localStorage.getItem("natis-published-products") !== next) {
        window.localStorage.setItem("natis-published-products", next);
        window.location.reload();
      }
    }).catch((error) => console.warn("Supabase catalog could not be loaded:", error));
  }, []);
  return null;
}

function PublishableCheckoutPage() {
  const { cart } = useStore();
  const [, navigate] = useLocation();
  const lines = cart
    .map((line) => ({
      line,
      product: getCatalogPublicProducts().find((product) => product.slug === line.slug),
    }))
    .filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
  const subtotal = lines.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);
  const [form, setForm] = useState({ name: "", phone: "", area: "", details: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim() || !form.area.trim()) {
      setError("Enter your name, phone number, and delivery area to continue.");
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;
    setIsSubmitting(true);
    try {
      const order = await createSupabaseOrder({
        customer: form,
        cart: lines.map(({ line, product }) => ({ product, quantity: line.qty })),
      });
      const orderRef = order.id.slice(0, 8).toUpperCase();
      const orderItems = lines
        .map(({ line, product }) => `${line.qty} x ${product.name} — ${formatPrice(product.price * line.qty)}`)
        .join("\n");
      const message = [
        "Hi Natis Phone Ent, I would like to order:",
        orderItems,
        `Estimated total: ${formatPrice(subtotal)}`,
        `Order reference: ${orderRef}`,
        `Name: ${form.name.trim()}`,
        `Phone: ${form.phone.trim()}`,
        `Delivery area: ${form.area.trim()}`,
        `Extra details: ${form.details.trim() || "None"}`,
        "Please confirm availability, final price, delivery, and payment options.",
      ].join("\n");
      const handoffUrl = `https://wa.me/233555016982?text=${encodeURIComponent(message)}`;
      window.sessionStorage.setItem("natis-last-order", JSON.stringify({ id: order.id, handoffUrl }));
      if (whatsappWindow) whatsappWindow.location.replace(handoffUrl);
      navigate(`/order-confirmation/${encodeURIComponent(order.id)}`);
    } catch (caught) {
      whatsappWindow?.close();
      setError(caught instanceof Error ? caught.message : "The order could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <><Header /><main className="container checkout-page">
    <Link href="/cart" className="back-link"><ChevronLeft size={15} /> Back to bag</Link>
    <div className="checkout-heading"><div><span className="kicker">Checkout · secure handoff</span><h1>Let’s get your phone <em>moving.</em></h1><p>Your order request is saved before WhatsApp opens. No payment is taken or verified here.</p></div><div className="checkout-steps"><span className="active">1 <small>Details</small></span><i /><span>2 <small>Review</small></span><i /><span>3 <small>Confirmation</small></span></div></div>
    {lines.length === 0 ? <div className="empty-state cart-empty"><ShoppingBag size={28} /><h2>Your bag is empty.</h2><Link href="/phones" className="button primary">Browse phones <ArrowRight size={16} /></Link></div> : <form className="checkout-layout" onSubmit={submit}>
      <div className="checkout-form">
        <section className="form-section"><div className="form-heading"><span>01</span><div><h2>Contact details</h2><p>We’ll use these details to prepare your order request.</p></div></div><div className="field-grid">
          <label className="field wide"><span>Full name</span><input required maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" /></label>
          <label className="field wide"><span>Phone number</span><input required maxLength={40} value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="024 000 0000" /></label>
        </div></section>
        <section className="form-section"><div className="form-heading"><span>02</span><div><h2>Delivery details</h2><p>We’ll confirm local availability and delivery timing.</p></div></div><div className="field-grid">
          <label className="field wide"><span>Delivery area</span><input required maxLength={160} value={form.area} onChange={(event) => update("area", event.target.value)} placeholder="Area or suburb in Accra" /></label>
          <label className="field wide"><span>Extra details</span><textarea maxLength={2000} value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="Delivery directions or other order notes (optional)" /></label>
        </div></section>
        <section className="form-section"><div className="form-heading"><span>03</span><div><h2>Payment method</h2><p>Payment is arranged only after the shop confirms your order.</p></div></div><div className="payment-placeholder"><div><ShieldCheck size={20} /><span><b>Payment is not connected</b><small>Your order request will be saved as pending. No payment has been taken.</small></span></div><span className="pending-pill">Pending</span></div></section>
        {error && <p className="form-error" role="alert"><Info size={16} /> {error}</p>}
        <button className="button primary checkout-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving order request…" : <>Save order &amp; continue to WhatsApp <ArrowRight size={17} /></>}</button>
      </div>
      <aside className="summary-card checkout-summary"><div className="summary-header"><span>Review your order</span><span className="secure-label"><ShieldCheck size={14} /> Safe handoff</span></div>
        {lines.map(({ line, product }) => <div className="mini-line" key={line.slug}><span className="mini-qty">{line.qty}</span><span>{product.name}<small>{product.brandLabel} · {line.storage}</small></span><b>{formatPrice(product.price * line.qty)}</b></div>)}
        <div className="summary-row"><span>Subtotal</span><b>{formatPrice(subtotal)}</b></div><div className="summary-total"><span>Estimated total</span><strong>{formatPrice(subtotal)}</strong></div><p className="summary-note"><ShieldCheck size={14} /> WhatsApp is opened only after the order request has been saved.</p>
      </aside>
    </form>}
  </main><Footer /></>;
}

function PublishableConfirmationPage() {
  const [, params] = useRoute<{ id: string }>("/order-confirmation/:id");
  const [handoffUrl, setHandoffUrl] = useState("");
  useEffect(() => {
    if (!params?.id) return;
    const savedOrder = window.sessionStorage.getItem("natis-last-order");
    if (!savedOrder) return;
    try {
      const parsed = JSON.parse(savedOrder) as { id?: string; handoffUrl?: string };
      if (parsed.id === params.id && typeof parsed.handoffUrl === "string") setHandoffUrl(parsed.handoffUrl);
    } catch (caught) {
      console.error("Could not read the saved WhatsApp handoff.", caught);
    }
  }, [params?.id]);

  return <><Header /><main className="container confirmation-page"><div className="confirmation-card"><div className="success-icon"><Check size={27} /></div><span className="kicker">Order request saved</span><h1>We’ve got the <em>next step.</em></h1><p className="confirmation-lede">Your order reference is <b>#{params?.id?.slice(0, 8).toUpperCase()}</b>. A Natis Phone Ent specialist will confirm market availability, delivery, and payment options. No payment has been taken.</p><div className="confirmation-status"><div className="status-line active"><span><Check size={13} /></span><p><b>Request received</b><small>Your request was saved before the WhatsApp handoff.</small></p></div><div className="status-line"><span>2</span><p><b>Availability confirmed</b><small>We’ll check the selected market and variant.</small></p></div><div className="status-line"><span>3</span><p><b>Payment confirmed</b><small>Payment has not been made or verified.</small></p></div></div><div className="confirmation-actions">{handoffUrl && <a className="button primary" href={handoffUrl} target="_blank" rel="noreferrer">Continue to WhatsApp <MessageCircle size={16} /></a>}<Link href="/phones" className="button secondary-button">Keep browsing <ArrowRight size={16} /></Link><Link href="/" className="text-link">Back to home <ArrowRight size={15} /></Link></div></div></main><Footer /></>;
}

function ProtectedAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Product[]>(() => getCatalogProducts());
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({ category: "Phone" as "Phone" | "Laptop", brand: "", name: "", storage: "", price: "", notes: "", imageUrl: "", sourceUrl: "" });
  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const refreshOrders = async () => {
    try {
      setOrders(await loadAdminOrders());
      setNotice("Order list updated.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not load orders.");
    }
  };

  useEffect(() => {
    let active = true;
    hasSupabaseAdminSession()
      .then((authenticated) => {
        if (!active) return;
        setIsAdmin(authenticated);
        if (authenticated) void refreshOrders();
      })
      .catch((caught: unknown) => {
        if (active) setNotice(caught instanceof Error ? caught.message : "Could not check the admin session.");
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setNotice("");
    try {
      await signInSupabaseAdmin(email, password);
      setPassword("");
      setIsAdmin(true);
      await refreshOrders();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Admin sign-in failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const signOut = async () => {
    setIsBusy(true);
    try {
      await signOutSupabase();
      setIsAdmin(false);
      setOrders([]);
      setNotice("Signed out.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Sign-out failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setImageFile(null);
    setForm({ category: "Phone", brand: "", name: "", storage: "", price: "", notes: "", imageUrl: "", sourceUrl: "" });
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    const price = Number(form.price);
    if (!form.brand.trim() || !form.name.trim() || !form.storage.trim() || !Number.isFinite(price) || price < 0) {
      setNotice("Enter a category, brand, product name, storage/capacity, and valid GHS price.");
      return;
    }
    setIsBusy(true);
    try {
      const existing = editing ? draft.find((product) => product.id === editing) : undefined;
      const brandId = form.brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slugBase = `${brandId}-${form.name}-${form.storage}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const id = existing?.id || `${slugBase}-${crypto.randomUUID()}`;
      const imageUrl = imageFile ? await uploadSupabaseProductImage(imageFile, id) : form.imageUrl.trim() || undefined;
      const brandLabel = form.brand.trim();
      const product: Product = {
        id,
        slug: existing?.slug || slugBase,
        brand: brandId,
        brandLabel,
        category: form.category,
        name: form.name.trim(),
        shortDescription: `${form.category} · ${form.storage.trim()} · ${formatPrice(price)}${form.notes.trim() ? ` · ${form.notes.trim()}` : ""}`,
        status: "active",
        price,
        currency: "GHS",
        region: "Circle, Accra · Ghana",
        storageOptions: [{ label: form.storage.trim(), value: form.storage.trim().toLowerCase() }],
        colorOptions: existing?.colorOptions || [{ label: "Ask us", value: "ask-us" }],
        availabilityLabel: form.notes.trim() || "Confirm availability",
        specs: { ...(existing?.specs || {}), Storage: form.storage.trim(), Notes: form.notes.trim() || "Admin listing", Price: formatPrice(price) },
        sourceUrl: form.sourceUrl.trim() || existing?.sourceUrl || "",
        sourceCheckedAt: existing?.sourceCheckedAt || new Date().toISOString().slice(0, 10),
        imageRightsStatus: imageUrl ? existing?.imageRightsStatus || "pending_review" : "original",
        imageRightsNote: imageUrl ? existing?.imageRightsNote || "Image rights must be confirmed before commercial use." : "Original placeholder.",
        imageUrl,
        featured: existing?.featured || false,
        visual: existing?.visual || { accent: "#2c5e48", accentSoft: "#e8f1eb", device: "#222827", initials: form.name.split(" ").slice(-2).map((part) => part[0]).join("").slice(0, 3).toUpperCase() },
      };
      setDraft((current) => existing ? current.map((item) => item.id === existing.id ? product : item) : [product, ...current]);
      setNotice("Product saved to the draft. Publish the catalog to make it visible.");
      resetForm();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save the product.");
    } finally {
      setIsBusy(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditing(product.id);
    setImageFile(null);
    setForm({
      category: product.category || "Phone",
      brand: product.brandLabel || product.brand,
      name: product.name,
      storage: product.storageOptions[0]?.label || "",
      price: String(product.price),
      notes: product.specs.Notes || "",
      imageUrl: product.imageUrl || "",
      sourceUrl: product.sourceUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publish = async () => {
    setIsBusy(true);
    try {
      await publishSupabaseCatalog(draft);
      localStorage.setItem("natis-published-products", JSON.stringify(draft));
      window.dispatchEvent(new Event("natis-catalog-published"));
      setNotice(`Published ${draft.length} products to Supabase.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Catalog publish failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name} from the catalog?`)) return;
    setIsBusy(true);
    try {
      await deleteSupabaseProduct(product.id);
      setDraft((current) => current.filter((item) => item.id !== product.id));
      setNotice("Product deleted from Supabase.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Product deletion failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const updateOrderStatus = async (order: OrderRecord, status: OrderRecord["status"]) => {
    setIsBusy(true);
    try {
      await updateSupabaseOrderStatus(order.id, status);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      setNotice(`Order #${order.id.slice(0, 8)} updated.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Order status update failed.");
    } finally {
      setIsBusy(false);
    }
  };

  return <><Header /><main className="container admin-page">
    <div className="admin-hero"><div><span className="kicker">Protected store control</span><h1>Manage the <em>storefront.</em></h1><p>Sign in with a Supabase account that has the admin role to manage products and orders.</p></div></div>
    {notice && <div className="admin-notice" role="status">{notice}</div>}
    {isCheckingSession ? <p>Checking admin session…</p> : !isAdmin ? <section className="admin-editor"><div className="section-heading"><div><span className="kicker">Admin sign in</span><h2>Sign in to continue</h2></div></div>{!supabaseConfigured && <p className="admin-warning">Supabase environment variables are required before admin sign-in is available.</p>}<form className="admin-form admin-access-form" onSubmit={signIn}><label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label><div className="admin-form-actions"><button className="button primary" disabled={isBusy || !supabaseConfigured} type="submit">{isBusy ? "Signing in…" : "Sign in"}</button></div></form></section> : <>
      <div className="admin-toolbar"><div><span className="kicker">Supabase admin session</span><h2>Store management</h2></div><div className="admin-form-actions"><button className="button secondary-button" disabled={isBusy} onClick={() => void refreshOrders()}>Refresh orders</button><button className="button secondary-button" disabled={isBusy} onClick={() => void signOut()}>Sign out</button></div></div>
      <section className="admin-editor"><div className="section-heading"><div><span className="kicker">Product editor</span><h2>{editing ? "Edit product" : "Add a product"}</h2></div></div><form className="admin-form" onSubmit={saveProduct}>
        <label>Category<select value={form.category} onChange={(event) => updateForm("category", event.target.value as "Phone" | "Laptop")}><option value="Phone">Phone</option><option value="Laptop">Laptop</option></select></label>
        <label>Brand<input required value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} /></label><label>Product name<input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label>
        <label>Storage / capacity<input required value={form.storage} onChange={(event) => updateForm("storage", event.target.value)} /></label><label>Price (GHS)<input type="number" min="0" required value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></label>
        <label>Notes<input value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} /></label><label>Product image URL<input value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} /></label>
        <label>Upload product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label><label className="wide-field">Source URL<input value={form.sourceUrl} onChange={(event) => updateForm("sourceUrl", event.target.value)} /></label>
        <div className="admin-form-actions"><button className="button primary" disabled={isBusy} type="submit">{isBusy ? "Saving…" : editing ? "Save changes" : "Add to draft"}</button>{editing && <button className="button secondary-button" type="button" onClick={resetForm}>Cancel</button>}</div>
      </form></section>
      <section className="admin-toolbar"><div><span className="kicker">Draft catalog</span><h2>{draft.length} products ready</h2></div><button className="button primary" disabled={isBusy} onClick={() => void publish()}><PackageCheck size={16} /> Publish catalog</button></section>
      <section className="admin-list">{draft.map((product) => <article className="admin-row" key={product.id}><PhoneVisual product={product} compact /><div><span className="eyebrow">{product.brandLabel}</span><h3>{product.name}</h3><p>{product.category || "Phone"} · {product.storageOptions[0]?.label} · {formatPrice(product.price)} · {product.specs.Notes}</p></div><div className="admin-row-actions"><button disabled={isBusy} aria-label={`Edit ${product.name}`} onClick={() => startEdit(product)}><Pencil size={15} /></button><button disabled={isBusy} aria-label={`Delete ${product.name}`} onClick={() => void deleteProduct(product)}><Trash2 size={15} /></button></div></article>)}</section>
      <section className="admin-toolbar"><div><span className="kicker">Customer orders</span><h2>{orders.length} recent orders</h2></div></section>
      <section className="admin-list">{orders.length ? orders.map((order) => <article className="admin-order-row" key={order.id}><div><h3>Order #{order.id.slice(0, 8).toUpperCase()}</h3><p>{order.customer_name} · {order.customer_phone} · {order.delivery_area}</p><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p><p>{order.item_count} items · {order.currency} {order.total} · {new Date(order.created_at).toLocaleString()}</p>{order.extra_details && <p>Note: {order.extra_details}</p>}</div><label>Status<select disabled={isBusy} value={order.status} onChange={(event) => void updateOrderStatus(order, event.target.value as OrderRecord["status"])}><option value="pending">Pending</option><option value="contacted">Contacted</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label></article>) : <p>No customer orders found.</p>}</section>
    </>}
  </main><Footer /></>;
}

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/admin" component={ProtectedAdminPage} /><Route path="/phones" component={PhonesPage} /><Route path="/shop" component={PhonesPage} /><Route path="/phones/:slug" component={ProductPage} /><Route path="/brands/:brand" component={BrandPage} /><Route path="/compare" component={ComparePage} /><Route path="/cart" component={CartPage} /><Route path="/checkout" component={PublishableCheckoutPage} /><Route path="/order-confirmation/:id" component={PublishableConfirmationPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><CatalogSync /><StoreProvider><Router /></StoreProvider></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
