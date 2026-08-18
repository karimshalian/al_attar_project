/* Al-Attar — product-detail.js
   Renders the standalone product page (product.html?id=...),
   replacing the old "Learn More" popup with a real, linkable page.
*/

const PD_T = {
  ar: {
    ingredients: "المكوّنات:",
    benefits: "الفوائد:",
    quickBuy: "أضف للسلة",
    certsTitle: "معتمد من",
    notFoundTitle: "المنتج غير موجود",
    notFoundBody: "ممكن يكون هذا المنتج انحذف أو توقف مؤقتاً.",
    backToShop: "العودة للمتجر",
    home: "الرئيسية",
    shop: "المتجر",
    ingInfoTitle: "لمحة عن المكوّنات",
    ingBenefits: "الفوائد العشبية",
    ingCommon: "أسماء أخرى",
    ingFamily: "الفصيلة",
    ingParts: "الجزء المستخدم"
  },
  en: {
    ingredients: "Ingredients:",
    benefits: "Benefits:",
    quickBuy: "Add to Cart",
    certsTitle: "Certified by",
    notFoundTitle: "Product not found",
    notFoundBody: "This product may have been removed or is temporarily unavailable.",
    backToShop: "Back to Shop",
    home: "Home",
    shop: "Shop",
    ingInfoTitle: "A Closer Look at the Ingredients",
    ingBenefits: "Herbal Benefits",
    ingCommon: "Common Names",
    ingFamily: "Family",
    ingParts: "Parts Used"
  }
};

function pdLang(){
  try{ return localStorage.getItem("attar_lang") || "ar"; }
  catch(e){ return "ar"; }
}

function pdFmt(n,L){
  return Number(n||0).toFixed(2) + (L==="ar" ? " د.أ" : " JD");
}

function pdEsc(s){
  return String(s??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/"/g,"&quot;");
}

function pdNotFoundHtml(){
  const L=pdLang();
  const T=PD_T[L];

  return `
    <div class="pd-empty">
      <h1>${T.notFoundTitle}</h1>
      <p>${T.notFoundBody}</p>
      <a class="cta-btn" href="index.html">${T.backToShop}</a>
    </div>
  `;
}

async function pdLoad(){
  const root=document.getElementById("product-root");
  if(!root) return;

  const params=new URLSearchParams(location.search);
  const id=params.get("id");

  if(!id){
    root.innerHTML=pdNotFoundHtml();
    return;
  }

  const [prodRes, catRes, benRes, ingRes]=await Promise.all([
    sb.from("products").select("*").eq("id",id).eq("active",true).single(),
    sb.from("category_labels").select("*"),
    sb.from("benefit_labels").select("*"),
    sb.from("ingredient_labels").select("*")
  ]);

  if(prodRes.error || !prodRes.data){
    root.innerHTML=pdNotFoundHtml();
    return;
  }

  const CATS={},BEN={},ING={};

  (catRes.data||[]).forEach(r=>{
    CATS[r.key]={ ar:r.ar, en:r.en, ic:r.icon||"🌿" };
  });

  (benRes.data||[]).forEach(r=>{
    BEN[r.key]={ ar:r.ar, en:r.en };
  });

  (ingRes.data||[]).forEach(r=>{
    ING[r.key]=r;
  });

  pdRender(prodRes.data, CATS, BEN, ING);
}

function pdIngredientTabsHtml(r, ING, L){
  const T=PD_T[L];

  const keys=(r.ingredients||[]).filter(k=>{
    const ing=ING[k];
    return ing && (ing.desc_ar || ing.desc_en || ing.scientific_name);
  });

  if(!keys.length) return "";

  const panes=keys.map((k,i)=>{
    const ing=ING[k];
    const name = L==="ar" ? ing.ar : ing.en;
    const desc = L==="ar" ? (ing.desc_ar||"") : (ing.desc_en||ing.desc_ar||"");
    const commonNames = L==="ar" ? (ing.common_names_ar||"") : (ing.common_names_en||"");
    const family = L==="ar" ? (ing.family_ar||"") : (ing.family_en||"");
    const parts = L==="ar" ? (ing.parts_used_ar||"") : (ing.parts_used_en||"");
    const benefits = (L==="ar" ? ing.benefits_ar : ing.benefits_en) || [];

    const factsRows=[
      commonNames ? `<div class="ping-fact"><b>${T.ingCommon}</b><span>${pdEsc(commonNames)}</span></div>` : "",
      family ? `<div class="ping-fact"><b>${T.ingFamily}</b><span>${pdEsc(family)}</span></div>` : "",
      parts ? `<div class="ping-fact"><b>${T.ingParts}</b><span>${pdEsc(parts)}</span></div>` : ""
    ].join("");

    return `
      <div class="ping-pane" data-ping-pane="${k}" style="${i===0?"":"display:none"}">

        <div class="ping-pane-text">

          <h3>${pdEsc(name)}</h3>
          ${ing.scientific_name ? `<i class="ping-sci">${pdEsc(ing.scientific_name)}</i>` : ""}

          ${desc ? `<p>${pdEsc(desc)}</p>` : ""}

          ${benefits.length ? `
            <div class="ping-sub">${T.ingBenefits}</div>
            <ul class="ping-benefits">
              ${benefits.map(b=>`<li>${pdEsc(b)}</li>`).join("")}
            </ul>
          ` : ""}

          ${factsRows ? `<div class="ping-facts">${factsRows}</div>` : ""}

        </div>

        ${ing.image_url ? `
          <div class="ping-pane-img">
            <img src="${pdEsc(ing.image_url)}" alt="${pdEsc(name)}" loading="lazy">
          </div>
        ` : ""}

      </div>
    `;
  }).join("");

  const tabs=keys.map((k,i)=>{
    const ing=ING[k];
    const name = L==="ar" ? ing.ar : ing.en;
    return `
      <button
        class="ping-tab${i===0?" active":""}"
        data-ping-tab="${k}"
        onclick="pdSwitchIngTab('${k}')"
        type="button">
        ${pdEsc(name)}
      </button>
    `;
  }).join("");

  return `
    <div class="pd-ingredients">
      <h2 class="pd-section-title">${T.ingInfoTitle}</h2>
      <div class="ping-tabs">${tabs}</div>
      <div class="ping-panes">${panes}</div>
    </div>
  `;
}

function pdSwitchIngTab(key){
  document.querySelectorAll("[data-ping-tab]").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.pingTab===key);
  });

  document.querySelectorAll("[data-ping-pane]").forEach(pane=>{
    pane.style.display = pane.dataset.pingPane===key ? "" : "none";
  });
}

function pdRender(r, CATS, BEN, ING){
  const L=pdLang();
  const T=PD_T[L];
  const root=document.getElementById("product-root");

  const name = L==="ar" ? r.name_ar : r.name_en;
  const desc = L==="ar" ? (r.desc_ar||"") : (r.desc_en||"");
  const catInfo = CATS[r.category] || { ar:r.category, en:r.category, ic:"🌿" };

  const imgSrc = r.image_url;
  const imgHtml = imgSrc
      ? `<img src="${pdEsc(imgSrc)}" alt="${pdEsc(name)}" loading="lazy">`
      : `<span class="ph">${catInfo.ic}</span>`;

  const ings=(r.ingredients||[])
      .map(k=>`<span class="mpill">${ING[k] ? (ING[k][L]||ING[k].ar) : k}</span>`)
      .join("");

  const bens=(r.benefits||[])
      .map(k=>`<span class="mpill">${BEN[k] ? (BEN[k][L]||BEN[k].ar) : k}</span>`)
      .join("");

  const galleryHtml = (r.gallery && r.gallery.length) ? `
    <div class="pd-gallery">
      <div class="pd-gallery-grid">
        ${r.gallery.map(g=>`
          <div class="pd-gallery-item">
            <img src="${pdEsc(g.url)}" alt="${pdEsc(g.label||name)}" loading="lazy">
            ${g.label ? `<span>${pdEsc(g.label)}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const ingTabsHtml = pdIngredientTabsHtml(r, ING, L);

  document.title = `${name} | العطّار`;

  root.innerHTML=`
    <div class="pd-crumb">
      <a href="index.html">${T.home}</a> / <a href="index.html">${T.shop}</a> / ${pdEsc(name)}
    </div>

    <div class="pd-layout">

      <div class="pd-imgwrap">
        ${r.badge_text ? `<span class="pcard-badge">${pdEsc(r.badge_text)}</span>` : ""}
        ${imgHtml}
      </div>

      <div class="pd-info">

        <div class="pd-cat">${catInfo[L]}</div>

        <h1 class="pd-name">${pdEsc(name)}</h1>

        ${desc ? `<p class="pd-desc">${pdEsc(desc)}</p>` : ""}

        <div class="pd-price">${pdFmt(r.price,L)}</div>

        ${ings ? `
          <div class="msect">${T.ingredients}</div>
          <div class="mpills">${ings}</div>
        ` : ""}

        ${bens ? `
          <div class="msect">${T.benefits}</div>
          <div class="mpills">${bens}</div>
        ` : ""}

        <button
          class="quickbuy pd-quickbuy"
          type="button"
          onclick="location.href='index.html?add=${encodeURIComponent(r.id)}'">
          <span>${T.quickBuy}</span>
        </button>

      </div>

    </div>

    ${galleryHtml}

    ${ingTabsHtml}

    <div class="pd-certs">
      <div class="pd-certs-title">${T.certsTitle}</div>
      ${typeof certsRowHtml === "function" ? certsRowHtml() : ""}
    </div>
  `;
}

pdLoad();