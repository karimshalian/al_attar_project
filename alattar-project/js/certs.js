/* Al-Attar — certs.js
   Certification badges/cards (footer, homepage trust section) that link
   through to certifications.html, plus the full detail list rendered on
   that page itself. Certification data lives in Supabase (table: certifications).
*/

let CERTS = [];
let CERTS_LOADED = false;

async function certsLoad(){

  const { data, error } =
    await sb
      .from("certifications")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

  if(error){
    console.error("certifications load error:", error);
    return;
  }

  CERTS = (data||[]).map(row=>({
    id: row.id,
    logo: row.logo_url || (row.images && row.images[0]) || null,
    pdfs: row.pdfs && row.pdfs.length ? row.pdfs : (row.images||[]).map(url=>({label:"",url})),
    ar: {
      name: row.name_ar,
      issuer: row.issuer,
      lines: row.details_ar||[]
    },
    en: {
      name: row.name_en,
      issuer: row.issuer,
      lines: row.details_en||[]
    }
  }));

  CERTS_LOADED = true;

  certsRefreshDOM();
  certsScrollToHash();
}

function certsLang(){
  try{ return localStorage.getItem("attar_lang") || "ar"; }
  catch(e){ return "ar"; }
}

/* certifications.html always lives at the site root alongside every other
   page, so a plain relative link works whether we're already on it or not. */
function certsLinkFor(id){
  return `certifications.html#cert-${id}`;
}

function certsRowHtml(mode){

  mode=mode||"badges";

  if(!CERTS_LOADED){
    return mode==="cards"
      ?`<div class="cert-grid cert-grid-loading" data-cert-mode="cards"></div>`
      :`<div class="cert-row cert-row-loading" data-cert-mode="badges"></div>`;
  }

  if(!CERTS.length){
    return mode==="cards"
      ?`<div class="cert-grid" data-cert-mode="cards"></div>`
      :`<div class="cert-row" data-cert-mode="badges"></div>`;
  }

  if(mode==="cards"){
    return `
      <div class="cert-grid" data-cert-mode="cards">
        ${CERTS.map(c=>{
          const t = c[certsLang()];
          return `
            <a
              class="cert-card"
              href="${certsLinkFor(c.id)}">
              ${c.logo
                ?`<img src="${c.logo}" alt="${t.name}" loading="lazy">`
                :`<span class="cert-card-ic">🏅</span>`}
              <div class="t">${t.name}</div>
              <div class="d">${t.issuer}</div>
            </a>
          `;
        }).join("")}
      </div>
    `;
  }

  return `
    <div class="cert-row" data-cert-mode="badges">
      ${CERTS.map(c=>{
        const t = c[certsLang()];
        return `
          <a
            class="cert-badge"
            href="${certsLinkFor(c.id)}"
            aria-label="${t.name}">
            ${c.logo
              ?`<img src="${c.logo}" alt="${t.name}" loading="lazy">`
              :`<span class="cert-badge-ic">🏅</span>`}
          </a>
        `;
      }).join("")}
    </div>
  `;
}

/* Re-render any footer/section already on the page once data arrives,
   without needing to touch app.js / nav.js render internals. */
function certsRefreshDOM(){
  document
    .querySelectorAll(".cert-row, .cert-grid")
    .forEach(el=>{
      const mode=el.dataset.certMode||"badges";
      el.outerHTML=certsRowHtml(mode);
    });

  certsRenderDetailRoot();
}

/* Full-detail list — only rendered when the page has a #certs-detail-root
   mount point (currently just certifications.html). */
function certsRenderDetailRoot(){
  const root=document.getElementById("certs-detail-root");
  if(!root) return;

  if(!CERTS_LOADED){
    root.innerHTML=`<div class="cert-detail-loading"></div>`;
    return;
  }

  root.innerHTML=CERTS.map(c=>{
    const t=c[certsLang()];
    return `
      <article class="cert-detail" id="cert-${c.id}">

        <div class="cert-detail-head">
          <h3>${t.name}</h3>
          <span>${t.issuer}</span>
        </div>

        <ul class="cert-facts">
          ${t.lines.map(l=>`<li>${l}</li>`).join("")}
        </ul>

        <div class="cert-detail-docs">
          ${c.pdfs.map(p=>`
            <div class="cert-doc">
              ${p.label?`<div class="cert-doc-label">${p.label}</div>`:""}
              <div class="cert-doc-frame">
                <iframe src="${p.url}#toolbar=0&navpanes=0" loading="lazy"></iframe>
                <button
                  class="cert-doc-expand"
                  onclick="certsUI.expandDoc('${p.url}')"
                  aria-label="تكبير">
                  ⤢
                </button>
              </div>
            </div>
          `).join("")}
        </div>

      </article>
    `;
  }).join("");
}

/* If the URL points at a specific certificate (certifications.html#cert-x),
   scroll to it and give it a brief highlight once it's rendered. */
function certsScrollToHash(){
  if(!location.hash.startsWith("#cert-")) return;

  const el=document.querySelector(location.hash);
  if(!el) return;

  el.scrollIntoView({ behavior:"smooth", block:"start" });
  el.classList.add("cert-detail-highlight");
  setTimeout(()=>el.classList.remove("cert-detail-highlight"), 2200);
}

window.certsUI = {

  expandDoc(url){
    const root = document.getElementById("cert-expand-root") || (()=>{
      const d = document.createElement("div");
      d.id = "cert-expand-root";
      document.body.appendChild(d);
      return d;
    })();

    root.innerHTML = `
      <div class="cert-expand-ov" onclick="certsUI.closeExpand()"></div>
      <div class="cert-expand-box">
        <button class="cert-expand-x" onclick="certsUI.closeExpand()">✕</button>
        <iframe src="${url}#toolbar=0&navpanes=0" loading="lazy"></iframe>
      </div>
    `;
  },

  closeExpand(){
    const root = document.getElementById("cert-expand-root");
    if(root) root.innerHTML = "";
  }

};

certsLoad();
