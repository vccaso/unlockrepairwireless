// app.js — logic extracted from the single-file HTML
const JSON_FILE = "./catalog.json"; // change if your JSON is named differently

const ui = {
  mode: "catalog",
  search: "",
  catalogType: "all",
  catalogCategory: "all",
  quality: "all",
  screenSort: "model_asc"
};

let DATA = null;

function setBranding(branding){
  if (!branding) return;
  if (branding.primaryColor) document.documentElement.style.setProperty("--primary", branding.primaryColor);
  if (branding.accentColor) document.documentElement.style.setProperty("--accent", branding.accentColor);
}

function money(v, currency){
  return new Intl.NumberFormat(undefined, { style:"currency", currency }).format(v);
}

function getMinPrice(item){
  const p = item.price || {};
  if (typeof p.now === "number") return p.now;
  if (typeof p.flat === "number") return p.flat;
  if (typeof p.from === "number") return p.from;
  if (typeof p.to === "number") return p.to;
  return null;
}

function formatCatalogPrice(item, currency){
  const p = item.price || {};
  if (typeof p.now === "number") return money(p.now, currency);
  if (typeof p.flat === "number") return money(p.flat, currency);
  if (typeof p.from === "number" && typeof p.to === "number") return `${money(p.from, currency)} – ${money(p.to, currency)}`;
  if (typeof p.from === "number") return `From ${money(p.from, currency)}`;
  return "Contact for price";
}

function iconPill(text){
  const el = document.createElement("span");
  el.className = "metaPill";
  el.textContent = text;
  return el;
}

function renderHeader(){
  const c = DATA.company;
  document.title = `${c.name} — Catalog`;
  document.getElementById("companyName").textContent = c.name;
  document.getElementById("tagline").textContent = c.tagline || "";
  document.getElementById("logoText").textContent = c.branding?.logoText || (c.name?.slice(0,2).toUpperCase() || "QF");

  const meta = document.getElementById("headerMeta");
  meta.innerHTML = "";
  if (c.contact?.phone) meta.appendChild(iconPill(`📞 ${c.contact.phone}`));
  if (c.contact?.email) meta.appendChild(iconPill(`✉️ ${c.contact.email}`));
  if (c.contact?.hours) meta.appendChild(iconPill(`🕒 ${c.contact.hours}`));

  document.getElementById("metaRight").textContent = DATA.source?.document ? `Source: ${DATA.source.document}` : "unlock repair wireless";
  document.getElementById("footerLeft").textContent = c.contact?.address ? `📍 ${c.contact.address}` : "";
}

function configureControlsForMode(){
  const filter1 = document.getElementById("filter1");
  const filter2 = document.getElementById("filter2");
  const filter1Wrap = document.getElementById("filter1Wrap");
  const filter2Wrap = document.getElementById("filter2Wrap");
  const search = document.getElementById("search");

  filter1.innerHTML = "";
  filter2.innerHTML = "";

  if (ui.mode === "catalog"){
    document.getElementById("heroTitle").textContent = `${DATA.company.name} — Catalog`;
    document.getElementById("heroSub").textContent = "Browse services and products. Search, filter, and sort.";
    search.placeholder = "Search services & products...";

    filter1Wrap.style.display = "";
    filter2Wrap.style.display = "";

    [["all","All types"],["service","Services"],["product","Products"]].forEach(([v,label])=>{
      const o=document.createElement("option"); o.value=v; o.textContent=label; filter1.appendChild(o);
    });
    filter1.value = ui.catalogType;

    const oAll = document.createElement("option"); oAll.value="all"; oAll.textContent="All categories"; filter2.appendChild(oAll);
    (DATA.catalog?.categories || []).forEach(c=>{
      const o=document.createElement("option"); o.value=c.id; o.textContent=c.label; filter2.appendChild(o);
    });
    filter2.value = ui.catalogCategory;

    document.getElementById("currencyText").textContent = `Currency: ${DATA.company.branding?.currency || "USD"}`;
  } else {
    const svc = DATA.service || {};
    document.getElementById("heroTitle").textContent = svc.name || "iPhone Screen Pricing";
    document.getElementById("heroSub").textContent = "Pricing by model and screen quality.";
    search.placeholder = "Search iPhone model (e.g., iPhone 14 Pro Max)...";

    filter1Wrap.style.display = "";
    filter2Wrap.style.display = "";

    const qAll = document.createElement("option"); qAll.value="all"; qAll.textContent="All qualities"; filter1.appendChild(qAll);
    (svc.qualities || []).slice(0,3).forEach(q=>{
      const o=document.createElement("option"); o.value=q.id; o.textContent=q.label; filter1.appendChild(o);
    });
    filter1.value = ui.quality;

    [["model_asc","Sort: Model (A → Z)"],["model_desc","Sort: Model (Z → A)"],["price_low","Sort: Lowest price first (selected quality)"],["price_high","Sort: Highest price first (selected quality)"]].forEach(([v,label])=>{
      const o=document.createElement("option"); o.value=v; o.textContent=label; filter2.appendChild(o);
    });
    filter2.value = ui.screenSort;

    document.getElementById("currencyText").textContent = `Currency: ${svc.currency || DATA.company.branding?.currency || "USD"}`;
  }
}

function renderView(){
  document.getElementById("viewCatalog").style.display = (ui.mode === "catalog") ? "" : "none";
  document.getElementById("viewScreens").style.display = (ui.mode === "screens") ? "" : "none";

  document.getElementById("tabCatalog").classList.toggle("active", ui.mode === "catalog");
  document.getElementById("tabScreens").classList.toggle("active", ui.mode === "screens");

  configureControlsForMode();
  if (ui.mode === "catalog") renderCatalog(); else renderScreens();
}

function buildVirtualScreenItems(){
  // Builds catalog-style cards from pricingByModel + service.qualities
  const svc = DATA.service || {};
  const qualities = (svc.qualities || []).slice(0, 3);
  const currency = svc.currency || DATA.company.branding?.currency || "USD";

  return (DATA.pricingByModel || []).map(row => {
    const priceMap = {};
    qualities.forEach(q => {
      const v = row?.prices?.[q.id];
      priceMap[q.id] = (typeof v === "number") ? v : null;
    });

    // compute range for display
    const nums = Object.values(priceMap).filter(v => typeof v === "number");
    const from = nums.length ? Math.min(...nums) : null;
    const to = nums.length ? Math.max(...nums) : null;

    return {
      id: `svc-screen-${row.model.replace(/\s+/g,"-").toLowerCase()}`,
      type: "service",
      categoryId: svc.categoryId || "repair",
      name: `${svc.name} — ${row.model}`,
      shortDescription: "Choose screen quality below. Prices include installation.",
      _virtual: true,
      _model: row.model,
      _qualities: qualities,
      _priceMap: priceMap,
      price: (from !== null && to !== null) ? { from, to } : {},
      currency
    };
  });
}

function renderCatalog(){
  const currency = DATA.company.branding?.currency || "USD";
  const search = ui.search.trim().toLowerCase();

  // Base items from JSON
  const baseItems = (DATA.catalog?.items || []);

  // Virtual items generated from pricingByModel (screen installs)
  const screenItems = buildVirtualScreenItems();

  // Combine them
  const items = [...baseItems, ...screenItems];

  let filtered = items.filter(it => {
    const matchesType = (ui.catalogType === "all") ? true : it.type === ui.catalogType;
    const matchesCategory = (ui.catalogCategory === "all") ? true : it.categoryId === ui.catalogCategory;

    const hay = [
      it.name,
      it.shortDescription,
      ...(it.details || []),
      it.sku,
      it._model
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesSearch = search ? hay.includes(search) : true;
    return matchesType && matchesCategory && matchesSearch;
  });

  document.getElementById("countText").textContent = `${filtered.length} item(s) shown`;

  const grid = document.getElementById("catalogGrid");
  grid.innerHTML = "";

  const catLabel = Object.fromEntries((DATA.catalog?.categories || []).map(c => [c.id, c.label]));

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const body = document.createElement("div");
    body.className = "cardBody";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.name || "Untitled";

    const meta = document.createElement("div");
    meta.className = "meta";

    const typePill = document.createElement("span");
    typePill.className = `pill ${item.type === "service" ? "service" : "product"}`;
    typePill.textContent = item.type === "service" ? "Service" : "Product";
    meta.appendChild(typePill);

    const catPill = document.createElement("span");
    catPill.className = "pill";
    catPill.textContent = catLabel[item.categoryId] || item.categoryId || "Category";
    meta.appendChild(catPill);

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = item.shortDescription || "—";

    // If this is a virtual screen item, show a mini price list by quality
    let variants = null;
    if (item._virtual && item._qualities && item._priceMap) {
      variants = document.createElement("table");
      variants.className = "variantTable";

      item._qualities.forEach(q => {
        const tr = document.createElement("tr");

        const tdL = document.createElement("td");
        tdL.className = "variantLabel";
        tdL.textContent = q.label;

        const tdP = document.createElement("td");
        tdP.className = "variantPrice";
        const v = item._priceMap[q.id];
        tdP.textContent = (typeof v === "number") ? money(v, item.currency || currency) : "N/A";

        tr.appendChild(tdL);
        tr.appendChild(tdP);
        variants.appendChild(tr);
      });
    }

    const priceRow = document.createElement("div");
    priceRow.className = "priceRow";

    const price = document.createElement("div");
    price.className = "price";
    const strong = document.createElement("strong");

    // For virtual screen items, show range; otherwise use normal formatting
    if (item._virtual) {
      const p = item.price || {};
      strong.textContent = (typeof p.from === "number" && typeof p.to === "number")
        ? `${money(p.from, item.currency || currency)} – ${money(p.to, item.currency || currency)}`
        : "Contact for price";
    } else {
      strong.textContent = formatCatalogPrice(item, currency);
    }

    price.appendChild(strong);

    const right = document.createElement("div");
    right.className = "subinfo";
    right.textContent = item._virtual ? "Screen install" : (item.type === "service" && item.durationMinutes ? `${item.durationMinutes} min` : "");

    priceRow.appendChild(price);
    priceRow.appendChild(right);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(desc);
    if (variants) body.appendChild(variants);
    body.appendChild(priceRow);

    card.appendChild(body);
    grid.appendChild(card);
  });
}


function getPriceForQuality(row, qId){ const v = row?.prices?.[qId]; return (typeof v === "number") ? v : null; }

function renderScreens(){
  const svc = DATA.service || {};
  const qualities = (svc.qualities || []).slice(0,3);
  const currency = svc.currency || DATA.company.branding?.currency || "USD";
  const source = DATA.source || {};

  document.getElementById("q1").textContent = qualities[0]?.label || "—";
  document.getElementById("q2").textContent = qualities[1]?.label || "—";
  document.getElementById("q3").textContent = qualities[2]?.label || "—";

  document.getElementById("screensNote").textContent = source.note || "";
  const search = ui.search.trim().toLowerCase();

  let rows = (DATA.pricingByModel || []).filter(r => {
    if (!search) return true;
    return (r.model || "").toLowerCase().includes(search);
  });

  if (ui.quality !== "all"){ rows = rows.filter(r => getPriceForQuality(r, ui.quality) !== null); }

  const selectedQ = (ui.quality !== "all") ? ui.quality : (qualities[0]?.id || null);
  if (ui.screenSort === "model_asc") rows.sort((a,b) => (a.model||"").localeCompare(b.model||""));
  if (ui.screenSort === "model_desc") rows.sort((a,b) => (b.model||"").localeCompare(a.model||""));
  if (ui.screenSort === "price_low" || ui.screenSort === "price_high"){
    rows.sort((a,b) => {
      const pa = selectedQ ? (getPriceForQuality(a, selectedQ) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      const pb = selectedQ ? (getPriceForQuality(b, selectedQ) ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      return (ui.screenSort === "price_low") ? (pa - pb) : (pb - pa);
    });
  }

  document.getElementById("countText").textContent = `${rows.length} model(s) shown`;
  document.getElementById("screensCount").textContent = `${rows.length} model(s) shown`;

  const tbody = document.getElementById("screensTbody");
  tbody.innerHTML = "";
  rows.forEach(r => {
    const tr = document.createElement("tr");
    const tdModel = document.createElement("td"); tdModel.innerHTML = `<span class="model">${r.model}</span>`; tr.appendChild(tdModel);
    qualities.forEach(q => {
      const td = document.createElement("td");
      const p = getPriceForQuality(r, q.id);
      if (p === null) td.innerHTML = `<span class="na">N/A</span>`;
      else td.innerHTML = `<span class="priceCell">${money(p, currency)}</span>`;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function wire(){
  document.getElementById("tabCatalog").addEventListener("click", () => { ui.mode="catalog"; ui.search=""; document.getElementById("search").value=""; renderView(); });
  document.getElementById("tabScreens").addEventListener("click", () => { ui.mode="screens"; ui.search=""; document.getElementById("search").value=""; renderView(); });

  document.getElementById("search").addEventListener("input", e => { ui.search = e.target.value || ""; if (ui.mode==="catalog") renderCatalog(); else renderScreens(); });

  document.getElementById("filter1").addEventListener("change", e => {
    const v = e.target.value; if (ui.mode==="catalog") ui.catalogType=v; else ui.quality=v; if (ui.mode==="catalog") renderCatalog(); else renderScreens();
  });

  document.getElementById("filter2").addEventListener("change", e => {
    const v = e.target.value; if (ui.mode==="catalog") ui.catalogCategory = v; else ui.screenSort = v; if (ui.mode==="catalog") renderCatalog(); else renderScreens();
  });
}

async function init(){
  const res = await fetch(JSON_FILE);
  if (!res.ok) throw new Error(`Could not load ${JSON_FILE}`);
  DATA = await res.json();
  setBranding(DATA.company?.branding);
  renderHeader();
  ui.catalogType = "all"; ui.catalogCategory = "all"; ui.quality="all"; ui.screenSort="model_asc";
  wire();
  renderView();
}

init().catch(err => {
  console.error(err);
  document.getElementById("heroTitle").textContent = "Error loading JSON";
  document.getElementById("heroSub").textContent = "Use a local server (not file://). Example: python -m http.server";
  document.getElementById("metaRight").textContent = "Load error";
});
