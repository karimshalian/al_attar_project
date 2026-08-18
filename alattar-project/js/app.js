/* Al-Attar — app.js FINAL */
const FREE_SHIP=15,SHIP_FEE=2;

function initLang(){
  try{
    return localStorage.getItem("attar_lang")||"ar";
  }catch(e){
    return "ar";
  }
}

let S={
  lang:initLang(),
  q:"",
  cart:{},
  drawer:false,
  step:"cart",
  delivery:"delivery",
  payment:"cod",
  orderNo:4127,
  cats:[],
  bens:[],
  ings:[],
  open:{cat:true,ben:true,ing:false},
  ingQ:"",
  sideOpen:false,
  modal:null,

  loyalty:{
    points:0,
    value:0,
    nextExpiry:null,
    nextExpiryPoints:0,
    loading:false
  },

  pointsToUse:0,

  location:{
    lat:null,
    lng:null,
    loading:false,
    error:""
  }
};

const t=()=>STR[S.lang];

const fmt=n=>
    Number(n||0).toFixed(2)+
    (S.lang==="ar"?" د.أ":" JD");

const esc=s=>
    String(s??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/"/g,"&quot;");

const setState=p=>{
  Object.assign(S,p);
  render();
};

const setQty=(id,q)=>{
  if(q<=0){
    delete S.cart[id];
  }else{
    S.cart[id]=q;
  }

  render();
};


/* =========================================================
   LOYALTY
========================================================= */

async function loadLoyaltySummary(){

  if(!window.AUTH?.user){

    S.loyalty={
      points:0,
      value:0,
      nextExpiry:null,
      nextExpiryPoints:0,
      loading:false
    };

    S.pointsToUse=0;

    render();

    return;
  }

  S.loyalty.loading=true;

  render();

  const {
    data,
    error
  }=await sb.rpc(
      "get_loyalty_summary"
  );

  if(error){

    console.error(
        "loyalty summary error:",
        error
    );

    S.loyalty={
      points:0,
      value:0,
      nextExpiry:null,
      nextExpiryPoints:0,
      loading:false
    };

  }else{

    const r=
        Array.isArray(data)
            ?data[0]||{}
            :data||{};

    S.loyalty={
      points:Number(r.points||0),
      value:Number(r.value_jod||0),
      nextExpiry:r.next_expiry||null,
      nextExpiryPoints:Number(
          r.next_expiry_points||0
      ),
      loading:false
    };

    if(
        S.pointsToUse>
        S.loyalty.points
    ){
      S.pointsToUse=
          Math.floor(
              S.loyalty.points
          );
    }
  }

  render();
}


function loyaltyExpiryText(){

  if(
      !S.loyalty.nextExpiry ||
      !S.loyalty.nextExpiryPoints
  ){
    return "";
  }

  const d=
      new Date(
          S.loyalty.nextExpiry
      );

  const ds=
      d.toLocaleDateString(
          S.lang==="ar"
              ?"ar-JO"
              :"en-GB",
          {
            year:"numeric",
            month:"short",
            day:"numeric"
          }
      );

  return S.lang==="ar"
      ?`${S.loyalty.nextExpiryPoints} نقطة تنتهي في ${ds}`
      :`${S.loyalty.nextExpiryPoints} points expire on ${ds}`;
}


/* =========================================================
   LOCATION
========================================================= */

function locationText(){

  if(S.location.loading){
    return S.lang==="ar"
        ?"جاري تحديد موقعك…"
        :"Locating you…";
  }

  if(S.location.error){
    return S.location.error;
  }

  if(
      S.location.lat!==null &&
      S.location.lng!==null
  ){

    return `${
        Number(S.location.lat)
            .toFixed(6)
    }, ${
        Number(S.location.lng)
            .toFixed(6)
    }`;
  }

  return S.lang==="ar"
      ?"لم يتم تحديد الموقع بعد"
      :"Location not selected yet";
}


function googleMapsUrl(
    lat,
    lng
){

  if(
      lat===null ||
      lng===null
  ){
    return "";
  }

  return `https://www.google.com/maps?q=${
      encodeURIComponent(
          lat+","+lng
      )
  }`;
}


/* =========================================================
   DATA
========================================================= */

let P=[];
let CATS={};
let BEN={};
let ING={};


const tog=(arr,val)=>{

  if(arr.includes(val)){
    return arr.filter(
        x=>x!==val
    );
  }

  return arr.concat([val]);
};


function filtered(){

  const q=
      S.q
          .trim()
          .toLowerCase();

  if(
      S.cats.length===0 &&
      S.bens.length===0 &&
      S.ings.length===0 &&
      !q
  ){
    return P;
  }

  return P.filter(p=>{

    const matchCat=
        S.cats.length===0 ||
        S.cats.includes(
            p.cat
        );

    const matchBen=
        S.bens.length===0 ||
        (p.b||[])
            .some(
                b=>
                    S.bens.includes(b)
            );

    const matchIng=
        S.ings.length===0 ||
        (p.ing||[])
            .some(
                i=>
                    S.ings.includes(i)
            );

    const matchQ=
        !q ||
        p.ar
            .toLowerCase()
            .includes(q) ||
        p.en
            .toLowerCase()
            .includes(q) ||
        (p.ing||[])
            .some(
                k=>{
                  const lbl=ING[k];
                  return (
                      k.toLowerCase().includes(q) ||
                      (lbl && lbl.ar && lbl.ar.toLowerCase().includes(q)) ||
                      (lbl && lbl.en && lbl.en.toLowerCase().includes(q))
                  );
                }
            );

    return (
        matchCat &&
        matchBen &&
        matchIng &&
        matchQ
    );
  });
}


const cartItems=()=>
    P
        .filter(
            p=>S.cart[p.id]
        )
        .map(
            p=>({
              ...p,
              qty:S.cart[p.id]
            })
        );


const nAct=()=>
    S.cats.length+
    S.bens.length+
    S.ings.length;


function imgTag(p){

  const ic=
      CATS[p.cat]?.ic ||
      "🌿";

  if(p.imgUrl){

    return `
      <img
        src="${p.imgUrl}"
        alt="${esc(p.en)}"
        loading="lazy"
        onerror="this.outerHTML='<span class=&quot;ph&quot;>${ic}</span>'">
    `;
  }

  return `
    <span class="ph">
      ${ic}
    </span>
  `;
}


function cardImgTag(p){

  const ic=
      CATS[p.cat]?.ic ||
      "🌿";

  const base=p.imgUrl;
  const hover=p.cardImgUrl;

  if(!base && !hover){
    return `
      <span class="ph">
        ${ic}
      </span>
    `;
  }

  const baseHtml=base
      ?`
      <img
        class="pcard-img-base"
        src="${base}"
        alt="${esc(p.en)}"
        loading="lazy"
        onerror="this.style.display='none'">
    `
      :"";

  const hoverHtml=(hover && hover!==base)
      ?`
      <img
        class="pcard-img-hover"
        src="${hover}"
        alt="${esc(p.en)}"
        loading="lazy"
        onerror="this.style.display='none'">
    `
      :"";

  return baseHtml+hoverHtml;
}


/* =========================================================
   LABELS
========================================================= */

async function loadLabels(){

  try{

    const [
      catRes,
      benRes,
      ingRes
    ]=await Promise.all([

      sb
          .from(
              "category_labels"
          )
          .select("*"),

      sb
          .from(
              "benefit_labels"
          )
          .select("*"),

      sb
          .from(
              "ingredient_labels"
          )
          .select("*")

    ]);


    if(catRes.data){

      CATS={};

      catRes.data
          .forEach(r=>{

            CATS[r.key]={
              ar:r.ar,
              en:r.en,
              ic:r.icon||"🌿"
            };

          });
    }


    if(benRes.data){

      BEN={};

      benRes.data
          .forEach(r=>{

            BEN[r.key]={
              ar:r.ar,
              en:r.en
            };

          });
    }


    if(ingRes.data){

      ING={};

      ingRes.data
          .forEach(r=>{

            ING[r.key]={
              ar:r.ar,
              en:r.en
            };

          });
    }


    console.log(
        "✅ labels loaded — cats:",
        Object.keys(CATS).length,
        "ben:",
        Object.keys(BEN).length,
        "ing:",
        Object.keys(ING).length
    );

  }catch(e){

    console.error(
        "❌ labels load error:",
        e
    );
  }
}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProductsFromSupabase(){

  try{

    await loadLabels();


    const {
      data,
      error
    }=await sb

        .from(
            "products"
        )

        .select("*")

        .eq(
            "active",
            true
        )

        .order(
            "created_at",
            {
              ascending:false
            }
        );


    if(error){

      console.error(
          "❌ load error",
          error
      );

      return;
    }


    if(
        !data ||
        data.length===0
    ){

      console.log(
          "⚠️ no products"
      );

      return;
    }


    data.forEach(r=>{

      if(
          r.category &&
          !CATS[r.category]
      ){

        CATS[r.category]={
          ar:r.category,
          en:r.category,
          ic:"🌿"
        };
      }


      (r.benefits||[])
          .forEach(b=>{

            if(!BEN[b]){

              BEN[b]={
                ar:b,
                en:b
              };
            }
          });


      (r.ingredients||[])
          .forEach(i=>{

            if(!ING[i]){

              ING[i]={
                ar:i,
                en:i
              };
            }
          });

    });


    P=data.map(r=>({

      id:r.id,
      cat:r.category,
      b:r.benefits||[],
      pr:Number(r.price),

      ar:r.name_ar,
      en:r.name_en,

      ba:r.desc_ar||"",
      be:r.desc_en||"",

      imgUrl:r.image_url||null,
      cardImgUrl:r.card_image_url||null,
      badge:r.badge_text||null,

      ing:r.ingredients||[]

    }));


    console.log(
        "✅ loaded",
        P.length,
        "products"
    );


    render();

  }catch(e){

    console.error(
        "❌",
        e
    );
  }
}


/* =========================================================
   FILTERS
========================================================= */

function fGroup(
    key,
    title,
    body
){

  const open=
      S.open[key];

  return `
    <div class="fgroup">

      <button
        class="fgroup-h"
        onclick="window.app.fold('${key}')"
        type="button">

        <span>
          ${title}
        </span>

        <span
          class="chev${open?" open":""}">

          ▼

        </span>

      </button>

      ${
      open
          ?`
            <div class="fbody">
              ${body}
            </div>
          `
          :""
  }

    </div>
  `;
}


function ck(
    on,
    fn,
    label,
    cnt
){

  return `
    <label
      class="fitem${on?" on":""}"
      onclick="${fn}">

      <span class="cbx">
        ${on?"✓":""}
      </span>

      <span>
        ${label}
      </span>

      <span class="cnt">
        ${cnt}
      </span>

    </label>
  `;
}


function renderSidebar(){

  const L=S.lang;
  const T=t();


  const cat=
      Object
          .entries(CATS)
          .map(([k,c])=>{

            const cnt=
                P.filter(
                    p=>p.cat===k
                ).length;

            return ck(
                S.cats.includes(k),
                `window.app.cat('${k}')`,
                c[L],
                cnt
            );

          })
          .join("");


  const ben=
      Object
          .entries(BEN)
          .map(([k,b])=>{

            const cnt=
                P.filter(
                    p=>
                        (p.b||[])
                            .includes(k)
                ).length;

            if(cnt===0){
              return "";
            }

            return ck(
                S.bens.includes(k),
                `window.app.ben('${k}')`,
                b[L]||b.ar||k,
                cnt
            );

          })
          .filter(Boolean)
          .join("");


  const iq=
      S.ingQ
          .trim()
          .toLowerCase();


  const ingEntries=
      Object
          .entries(ING)
          .filter(([k,v])=>

              !iq ||

              (v.ar||"")
                  .includes(iq) ||

              (v.en||"")
                  .toLowerCase()
                  .includes(iq)

          );


  const ing=`

    <input
      class="ing-search"
      placeholder="${T.selectIng}"
      value="${esc(S.ingQ)}"
      oninput="window.app.ingQ(this.value)">

    <div id="ing-list-body">

      ${
      ingEntries
          .map(([k,v])=>{

            const cnt=
                P.filter(
                    p=>
                        (p.ing||[])
                            .includes(k)
                ).length;

            if(cnt===0){
              return "";
            }

            return ck(
                S.ings.includes(k),
                `window.app.ing('${k}')`,
                v[L]||v.ar||k,
                cnt
            );

          })
          .filter(Boolean)
          .join("")
  }

    </div>
  `;


  const chips=[

    ...S.cats.map(k=>({
      txt:
          CATS[k]
              ?CATS[k][L]
              :k,

      fn:
          `window.app.cat('${k}')`
    })),

    ...S.bens.map(k=>({
      txt:
          BEN[k]
              ?BEN[k][L]||BEN[k].ar
              :k,

      fn:
          `window.app.ben('${k}')`
    })),

    ...S.ings.map(k=>({
      txt:
          ING[k]
              ?ING[k][L]||ING[k].ar
              :k,

      fn:
          `window.app.ing('${k}')`
    }))

  ];


  return `
    <aside
      class="sidebar${S.sideOpen?" open":""}">

      <div class="f-head">

        <b>
          ${T.filters}
          ${nAct()?` (${nAct()})`:""}
        </b>

        ${
      nAct()
          ?`
              <button
                class="clearall"
                onclick="window.app.clearAll()"
                type="button">

                ${T.clearAll}

              </button>
            `
          :""
  }

      </div>


      ${
      chips.length
          ?`
            <div class="chipbar">

              ${
              chips
                  .map(c=>`
                    <span
                      class="chip"
                      onclick="${c.fn}">

                      ${esc(c.txt)} ✕

                    </span>
                  `)
                  .join("")
          }

            </div>
          `
          :""
  }


      ${
      fGroup(
          "cat",
          T.shopByCat,
          cat
      )
  }


      ${
      fGroup(
          "ben",
          T.shopByBen,
          ben
      )
  }


      ${
      fGroup(
          "ing",
          T.shopByIng,
          ing
      )
  }

    </aside>
  `;
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function card(p){

  const L=S.lang;
  const T=t();

  const q=
      S.cart[p.id]||0;


  return `
    <div class="pcard">

      <div class="pcard-imgwrap">

        ${
      p.badge
          ?`<span class="pcard-badge">${esc(p.badge)}</span>`
          :""
  }

        ${cardImgTag(p)}

      </div>


      <div class="pcard-body">

        <h3 class="pcard-name">
          ${L==="ar"?p.ar:p.en}
        </h3>

        <p class="pcard-tag">
          ${L==="ar"?p.ba:p.be}
        </p>


        ${
      q===0

          ?`
              <button
                class="quickbuy"
                onclick="window.app.inc('${p.id}')"
                type="button">

                ${T.quickBuy}

              </button>
            `

          :`
              <div class="qtybox">

                <button
                  onclick="window.app.dec('${p.id}')"
                  type="button">

                  −

                </button>

                <span>
                  ${q}
                </span>

                <button
                  onclick="window.app.inc('${p.id}')"
                  type="button">

                  +

                </button>

              </div>
            `
  }


        <a
          class="pcard-learnmore"
          href="product.html?id=${encodeURIComponent(p.id)}">

          ${T.learnMore}

        </a>

      </div>

    </div>
  `;
}



/* =========================================================
   MODAL
========================================================= */

function modal(){

  const p=
      P.find(
          x=>x.id===S.modal
      );

  if(!p){
    return "";
  }

  const L=S.lang;
  const T=t();

  const q=
      S.cart[p.id]||0;


  const ings=
      (p.ing||[])
          .map(k=>`
        <span class="mpill">
          ${
              ING[k]
                  ?ING[k][L]||ING[k].ar
                  :k
          }
        </span>
      `)
          .join("");


  const bens=
      (p.b||[])
          .map(k=>`
        <span class="mpill">
          ${
              BEN[k]
                  ?BEN[k][L]||BEN[k].ar
                  :k
          }
        </span>
      `)
          .join("");


  const catInfo=
      CATS[p.cat]||
      {
        ar:p.cat,
        en:p.cat,
        ic:"🌿"
      };


  return `
    <div
      class="modal-ov"
      onclick="window.app.close(event)">

      <div
        class="modal"
        onclick="event.stopPropagation()">


        <button
          class="modal-x"
          onclick="window.app.close()"
          type="button">

          ✕

        </button>


        <div
          class="modal-img imgwrap c-${p.cat}">

          ${imgTag(p)}

        </div>


        <div class="modal-body">

          <div class="modal-cat">
            ${catInfo[L]}
          </div>

          <h3>
            ${L==="ar"?p.ar:p.en}
          </h3>

          <p class="mdesc">
            ${L==="ar"?p.ba:p.be}
          </p>

          <div class="msect">
            ${T.ingredients}
          </div>

          <div class="mpills">
            ${ings}
          </div>

          <div class="msect">
            ${T.benefits}
          </div>

          <div class="mpills">
            ${bens}
          </div>

          <div class="msect">
            ${T.brewing}
          </div>

          <p class="mbrew">
            ${T.brewTxt}
          </p>

          <div class="mprice">
            ${fmt(p.pr)}
          </div>


          ${
      q===0

          ?`
                <button
                  class="mbtn"
                  onclick="window.app.inc('${p.id}')"
                  type="button">

                  ${T.addToCart}

                </button>
              `

          :`
                <div class="qtybox">

                  <button
                    onclick="window.app.dec('${p.id}')"
                    type="button">

                    −

                  </button>

                  <span>
                    ${q}
                  </span>

                  <button
                    onclick="window.app.inc('${p.id}')"
                    type="button">

                    +

                  </button>

                </div>
              `
  }


          <div class="mlab">
            ✓ ${T.labTested}
          </div>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   SHOP UPDATES
========================================================= */

function updateShopGrid(){

  const T=t();

  const shown=
      filtered();

  const grid=
      document
          .getElementById(
              "shop-grid"
          );

  const count=
      document
          .getElementById(
              "shop-count"
          );

  const empty=
      document
          .getElementById(
              "shop-empty"
          );


  if(grid){

    grid.innerHTML=
        shown
            .map(card)
            .join("");

  }


  if(count){

    count.textContent=
        `${shown.length} ${T.unit}`;

  }


  if(empty){

    empty.innerHTML=
        shown.length===0

            ?`
          <div class="emptymsg">
            ${T.noResults}
          </div>
        `

            :"";

  }
}


function updateIngList(){

  const L=S.lang;

  const iq=
      S.ingQ
          .trim()
          .toLowerCase();


  const ingEntries=
      Object
          .entries(ING)
          .filter(([k,v])=>

              !iq ||

              (v.ar||"")
                  .includes(iq) ||

              (v.en||"")
                  .toLowerCase()
                  .includes(iq)

          );


  const body=
      document
          .getElementById(
              "ing-list-body"
          );


  if(!body){
    return;
  }


  body.innerHTML=
      ingEntries
          .map(([k,v])=>{

            const cnt=
                P.filter(
                    p=>
                        (p.ing||[])
                            .includes(k)
                ).length;

            if(cnt===0){
              return "";
            }

            return ck(
                S.ings.includes(k),
                `window.app.ing('${k}')`,
                v[L]||v.ar||k,
                cnt
            );

          })
          .filter(Boolean)
          .join("");
}


/* =========================================================
   MAIN RENDER
========================================================= */

function render(){

  const L=S.lang;
  const T=t();


  document
      .documentElement
      .setAttribute(
          "dir",
          L==="ar"
              ?"rtl"
              :"ltr"
      );


  document
      .documentElement
      .setAttribute(
          "lang",
          L
      );


  const items=
      cartItems();


  const count=
      items.reduce(
          (s,i)=>
              s+i.qty,
          0
      );


  const sub=
      items.reduce(
          (s,i)=>
              s+i.pr*i.qty,
          0
      );


  const ship=
      sub===0

          ?0

          :(
              S.delivery==="pickup"

                  ?0

                  :(
                      sub>=FREE_SHIP
                          ?0
                          :SHIP_FEE
                  )
          );


  const shown=
      filtered();


  document
      .getElementById(
          "root"
      )
      .innerHTML=`

      <div class="announce">

        ${T.annBold}

        <a
          href="#"
          onclick="return false">

          ${T.annLink}

        </a>

      </div>


      <header class="topbar">

        <div class="topbar-in">


          <nav class="mainnav">


            <div class="navitem">

              <button type="button">

                ${T.navShop}

                <span class="car">
                  ▼
                </span>

              </button>


              <div class="dropdown">

                ${
      Object
          .entries(CATS)
          .map(([k,c])=>`

                      <a
                        href="#"
                        onclick="window.app.cat('${k}');window.app.go('#shop');return false">

                        <span class="di">
                          ${c.ic}
                        </span>

                        ${c[L]}

                      </a>

                    `)
          .join("")
  }


                <div class="sep"></div>


                <a
                  href="#"
                  onclick="window.app.clearAll();window.app.go('#shop');return false">

                  <span class="di">
                    🧺
                  </span>

                  ${T.allProducts}

                </a>

              </div>

            </div>


            <div class="navitem">

              <button type="button">

                ${T.navLearn}

                <span class="car">
                  ▼
                </span>

              </button>


              <div class="dropdown">

                <a href="lab-quality.html">

                  <span class="di">
                    🔬
                  </span>

                  ${T.mLab}

                </a>


                <a href="brewing.html">

                  <span class="di">
                    🫖
                  </span>

                  ${T.mBrew}

                </a>

              </div>

            </div>


            <div class="navitem">

              <button type="button">

                ${T.navPurpose}

                <span class="car">
                  ▼
                </span>

              </button>


              <div class="dropdown">

                <a href="about.html">

                  <span class="di">
                    🌿
                  </span>

                  ${T.mAbout}

                </a>


                <a href="certifications.html">

                  <span class="di">
                    🏆
                  </span>

                  ${T.mCert}

                </a>

              </div>

            </div>


          </nav>


          <a
            class="logo"
            href="#"
            onclick="window.app.home(event)">

            <img
              src="assets/img/logo.png"
              alt="Al-Attar"
              onerror="this.outerHTML='<span class=&quot;mark&quot;>ع</span>'">

          </a>


          <div class="top-right">

            <div class="searchwrap">

              <span class="si">
                ⌕
              </span>

              <input
                class="search-box"
                placeholder="${T.search}"
                value="${esc(S.q)}"
                oninput="window.app.q(this.value)">

            </div>


            <a
              class="toplink"
              href="#"
              onclick="window.app.go('#why');return false">

              ${T.rewards}

            </a>


            <a
              class="toplink"
              href="#"
              onclick="return false">

              ${T.locator}

            </a>


            <a
              class="toplink"
              href="#"
              onclick="window.app.lang();return false">

              ${L==="ar"?"EN":"عربي"}

            </a>


            <button
              class="accounticon${window.AUTH&&window.AUTH.user?" logged-in":""}"
              onclick="authUI.open()"
              type="button">

              👤

            </button>


            <button
              class="carticon"
              onclick="window.app.openCart()"
              type="button">

              🛒

              <span class="cartbadge">
                ${count}
              </span>

            </button>


          </div>


        </div>

      </header>


      <section class="hero">

        <div class="hero-in">

          <div class="crumb">

            ${T.crumb1}
            /
            <b>
              ${T.crumb2}
            </b>

          </div>

          <h1>
            ${T.heroTitle}
          </h1>

          <p>
            ${T.heroSub}
          </p>

          <div class="hero-trust">

            <span>
              ${T.t1}
            </span>

            <span>
              ${T.t2}
            </span>

            <span>
              ${T.t3}
            </span>

            <span>
              ${T.t4}
            </span>

          </div>

        </div>

      </section>


      <div
        class="shop"
        id="shop">

        ${renderSidebar()}

        <div>

          <button
            class="filters-toggle"
            onclick="window.app.toggleSide()"
            type="button">

            ${T.filters}
            ${nAct()?` (${nAct()})`:""}

          </button>


          <div class="prow">

            <h2>
              ${T.allProducts}
            </h2>

            <span id="shop-count">
              ${shown.length} ${T.unit}
            </span>

          </div>


          <div
            class="grid"
            id="shop-grid">

            ${shown.map(card).join("")}

          </div>


          <div id="shop-empty">

            ${
      shown.length===0

          ?`
                  <div class="emptymsg">
                    ${T.noResults}
                  </div>
                `

          :""
  }

          </div>

        </div>

      </div>


      <section
        class="trust"
        id="why">

        <h2>
          ${T.trustH}
        </h2>

        ${certsRowHtml("cards")}

      </section>


      <footer>

        <div class="flinks">

          <a href="about.html">
            ${T.mAbout}
          </a>

          <a href="lab-quality.html">
            ${T.mLab}
          </a>

          <a href="brewing.html">
            ${T.mBrew}
          </a>

          <a href="certifications.html">
            ${T.mCert}
          </a>

        </div>

        ${T.copyright}

      </footer>


      ${
      S.drawer
          ?drawer(
              items,
              count,
              sub,
              ship
          )
          :""
  }


      ${
      S.modal
          ?modal()
          :""
  }
    `;
}


/* =========================================================
   CART / CHECKOUT
========================================================= */

function drawer(
    items,
    count,
    sub,
    ship
){

  const T=t();
  const L=S.lang;

  const total=
      sub+ship;


  const title=
      S.step==="cart"

          ?`${T.cartTitle} (${count})`

          :S.step==="checkout"

              ?T.checkoutTitle

              :T.doneTitle;


  let body="";


  /* CART */

  if(S.step==="cart"){

    body=`

      <div class="cart-body">

        ${
        items.length===0
            ?`
              <div class="emptymsg">
                ${T.cartEmpty}
              </div>
            `
            :""
    }


        ${
        items
            .map(it=>{

              const catInfo=
                  CATS[it.cat]||
                  {
                    ic:"🌿"
                  };

              return `

                <div class="citem">

                  <div class="thumb">

                    ${
                  it.imgUrl

                      ?`
                          <img
                            src="${it.imgUrl}"
                            onerror="this.outerHTML='${catInfo.ic}'">
                        `

                      :catInfo.ic
              }

                  </div>


                  <div class="nm">

                    <b>
                      ${L==="ar"?it.ar:it.en}
                    </b>

                    <span>
                      ${fmt(it.pr)}
                    </span>

                  </div>


                  <div class="qtybox">

                    <button
                      onclick="window.app.dec('${it.id}')"
                      type="button">

                      −

                    </button>

                    <span>
                      ${it.qty}
                    </span>

                    <button
                      onclick="window.app.inc('${it.id}')"
                      type="button">

                      +

                    </button>

                  </div>


                  <div class="ctotal">
                    ${fmt(it.pr*it.qty)}
                  </div>

                </div>

              `;

            })
            .join("")
    }

      </div>


      <div class="summary">

        <div class="srow">

          <span>
            ${T.subtotal}
          </span>

          <b>
            ${fmt(sub)}
          </b>

        </div>


        <div class="srow">

          <span>
            ${T.shipping}
          </span>

          <b>
            ${ship===0?T.free:fmt(ship)}
          </b>

        </div>


        <div class="srow big">

          <span>
            ${T.total}
          </span>

          <span>
            ${fmt(total)}
          </span>

        </div>


        <div>
          ${T.freeNote}
        </div>


        <button
          class="checkoutbtn"
          ${items.length===0?"disabled":""}
          onclick="window.app.step('checkout')"
          type="button">

          ${T.checkout}

        </button>

      </div>
    `;


    /* CHECKOUT */

  }else if(
      S.step==="checkout"
  ){

    const maxRedeem=
        Math.min(

            Math.floor(
                S.loyalty.points
            ),

            Math.floor(
                (sub+1e-9)*10
            )

        );


    const redeem=
        Math.min(
            S.pointsToUse,
            maxRedeem
        );


    const discount=
        redeem/10;


    const checkoutTotal=
        Math.max(
            0,
            total-discount
        );


    const expiry=
        loyaltyExpiryText();


    body=`

      <div class="cart-body">


        <div>

          <div class="small-label">
            ${T.contactInfo}
          </div>


          <div class="checkout-fields">


            <input
              class="field"
              id="co-name"
              placeholder="${T.phName}"
              value="${esc(
        window.AUTH?.profile?.full_name||
        ""
    )}">


            <input
              class="field"
              id="co-phone"
              placeholder="${T.phPhone}"
              value="${esc(
        window.AUTH?.profile?.phone||
        ""
    )}">


            <input
              class="field"
              id="co-address"
              placeholder="${T.phAddr}">


            <button
              class="optbtn"
              onclick="window.app.locateMe()"
              type="button"
              ${S.location.loading?"disabled":""}>

              <span>

                ${
        S.location.loading

            ?(
                L==="ar"
                    ?"📍 جاري تحديد موقعك…"
                    :"📍 Locating…"
            )

            :(
                L==="ar"
                    ?"📍 حدّد موقعي"
                    :"📍 Use my location"
            )
    }

              </span>

            </button>


            <div class="loyalty-note">
              ${locationText()}
            </div>


            ${
        S.location.lat!==null &&
        S.location.lng!==null

            ?`
                  <a
                    class="backlink"
                    href="${googleMapsUrl(
                S.location.lat,
                S.location.lng
            )}"
                    target="_blank"
                    rel="noopener">

                    ${
                L==="ar"
                    ?"🗺️ فتح في Google Maps"
                    :"🗺️ Open in Google Maps"
            }

                  </a>
                `

            :""
    }


          </div>

        </div>


        <div>

          <div class="small-label">
            ${T.deliveryMethod}
          </div>


          <div class="checkout-options">

            <button
              class="optbtn${S.delivery==="delivery"?" on":""}"
              onclick="window.app.delivery('delivery')"
              type="button">

              <span>
                ${T.delHome}
              </span>

              <b>
                ${
        sub>=FREE_SHIP
            ?T.free
            :fmt(SHIP_FEE)
    }
              </b>

            </button>


            <button
              class="optbtn${S.delivery==="pickup"?" on":""}"
              onclick="window.app.delivery('pickup')"
              type="button">

              <span>
                ${T.delPickup}
              </span>

              <b>
                ${T.free}
              </b>

            </button>

          </div>

        </div>


        <div>

          <div class="small-label">
            ${T.paymentMethod}
          </div>


          <div class="checkout-options">

            <button
              class="optbtn${S.payment==="cod"?" on":""}"
              onclick="window.app.payment('cod')"
              type="button">

              <span>
                ${T.payCod}
              </span>

            </button>


            <button
              class="optbtn${S.payment==="bank"?" on":""}"
              onclick="window.app.payment('bank')"
              type="button">

              <span>
                ${T.payBank}
              </span>

            </button>

          </div>

        </div>


        <div class="loyalty-checkout">

          <div class="loyalty-checkout-head">

            <div>

              <b>
                ${
        L==="ar"
            ?"🌿 نقاط العطّار"
            :"🌿 Al-Attar Points"
    }
              </b>


              <span>

                ${
        S.loyalty.loading

            ?(
                L==="ar"
                    ?"جاري التحميل…"
                    :"Loading…"
            )

            :(
                L==="ar"
                    ?`رصيدك ${S.loyalty.points} نقطة = ${S.loyalty.value.toFixed(2)} د.أ`
                    :`Your balance: ${S.loyalty.points} points = ${S.loyalty.value.toFixed(2)} JD`
            )
    }

              </span>

            </div>

          </div>


          ${
        expiry

            ?`
                <div class="loyalty-expiry">

                  ⏳ ${expiry}

                </div>
              `

            :""
    }


          ${
        maxRedeem>=1

            ?`

                <label class="loyalty-use">

                  <input
                    type="checkbox"
                    ${redeem>0?"checked":""}
                    onchange="window.app.togglePoints(this.checked)">

                  <span>

                    ${
                L==="ar"
                    ?"استخدام النقاط في هذا الطلب"
                    :"Use points on this order"
            }

                  </span>

                </label>


                ${
                redeem>0

                    ?`

                      <div class="loyalty-slider">

                        <input
                          type="range"
                          min="1"
                          max="${maxRedeem}"
                          step="1"
                          value="${redeem}"
                          oninput="window.app.points(Number(this.value))">


                        <div>

                          <b>

                            ${redeem}

                            ${
                        L==="ar"
                            ?"نقطة"
                            :"points"
                    }

                          </b>


                          <span>
                            − ${fmt(discount)}
                          </span>

                        </div>

                      </div>

                    `

                    :""
            }

              `

            :`

                <div class="loyalty-note">

                  ${
                L==="ar"
                    ?"لا يوجد رصيد نقاط متاح للاستخدام."
                    :"No points balance is available to redeem."
            }

                </div>

              `
    }


          <div class="loyalty-note">

            ${
        L==="ar"

            ?"كل نقطة = 0.10 د.أ (10 نقاط = 1 د.أ). النقاط صالحة لمدة 6 أشهر من تاريخ اكتسابها."

            :"Each point = 0.10 JD (10 points = 1 JD). Points are valid for 6 months from the date earned."
    }

          </div>

        </div>


      </div>


      <div class="summary">

        <div class="srow">

          <span>
            ${T.subtotal}
          </span>

          <b>
            ${fmt(sub)}
          </b>

        </div>


        <div class="srow">

          <span>
            ${T.shipping}
          </span>

          <b>
            ${ship===0?T.free:fmt(ship)}
          </b>

        </div>


        ${
        discount>0

            ?`
              <div class="srow loyalty-discount">

                <span>

                  ${
                L==="ar"
                    ?"خصم النقاط"
                    :"Points discount"
            }

                </span>

                <b>
                  − ${fmt(discount)}
                </b>

              </div>
            `

            :""
    }


        <div class="srow big">

          <span>
            ${T.total}
          </span>

          <span>
            ${fmt(checkoutTotal)}
          </span>

        </div>


        <button
          class="checkoutbtn"
          onclick="window.app.placeOrder()"
          type="button">

          ${T.confirmOrder}

        </button>


        <button
          class="backlink"
          onclick="window.app.step('cart')"
          type="button">

          ${T.backToCart}

        </button>

      </div>
    `;


    /* DONE */

  }else{

    body=`

      <div class="done-wrap">

        <div class="done-check">
          ✓
        </div>

        <b class="done-title">
          ${T.thankYou}
        </b>

        <div class="done-text">

          ${T.orderNoLabel}
          #${S.orderNo}

          <br>

          ${T.willContact}

        </div>

        <button
          class="checkoutbtn done-back"
          onclick="window.app.closeCart()"
          type="button">

          ${T.backToShop}

        </button>

      </div>
    `;
  }


  return `

    <div
      class="overlay"
      onclick="window.app.closeCart()">
    </div>


    <div class="drawer">

      <div class="drawer-head">

        <b>
          ${title}
        </b>

        <button
          class="iconbtn"
          onclick="window.app.closeCart()"
          type="button">

          ✕

        </button>

      </div>

      ${body}

    </div>
  `;
}


/* =========================================================
   ACTIONS
========================================================= */

window.app={


  lang(){

    const n=
        S.lang==="ar"
            ?"en"
            :"ar";

    try{

      localStorage.setItem(
          "attar_lang",
          n
      );

    }catch(e){}

    setState({
      lang:n
    });
  },


  cat(k){

    setState({
      cats:
          tog(
              S.cats,
              k
          )
    });
  },


  ben(k){

    setState({
      bens:
          tog(
              S.bens,
              k
          )
    });
  },


  ing(k){

    setState({
      ings:
          tog(
              S.ings,
              k
          )
    });
  },


  ingQ(v){

    S.ingQ=v;

    updateIngList();
  },


  fold(k){

    S.open[k]=
        !S.open[k];

    render();
  },


  clearAll(){

    setState({
      cats:[],
      bens:[],
      ings:[],
      ingQ:""
    });
  },


  toggleSide(){

    setState({
      sideOpen:
          !S.sideOpen
    });
  },


  q(v){

    S.q=v;

    updateShopGrid();
  },


  inc(id){

    setQty(
        id,
        (S.cart[id]||0)+1
    );
  },


  dec(id){

    setQty(
        id,
        (S.cart[id]||0)-1
    );
  },


  open(id){

    setState({
      modal:id
    });
  },


  close(e){

    if(
        e &&
        e.target &&
        !e.target.classList.contains(
            "modal-ov"
        ) &&
        e.target.tagName!=="BUTTON"
    ){
      return;
    }

    setState({
      modal:null
    });
  },


  openCart(){

    setState({
      drawer:true,
      step:"cart"
    });
  },


  closeCart(){

    setState({
      drawer:false,
      step:"cart"
    });
  },


  step(s){

    setState({
      step:s
    });

    if(s==="checkout"){
      loadLoyaltySummary();
    }
  },


  delivery(d){

    S.delivery=d;

    if(d==="pickup"){

      S.location={
        lat:null,
        lng:null,
        loading:false,
        error:""
      };

    }

    render();
  },


  togglePoints(on){

    const sub=
        cartItems()
            .reduce(
                (a,i)=>
                    a+i.pr*i.qty,
                0
            );

    S.pointsToUse=
        on

            ?Math.min(
                Math.floor(
                    S.loyalty.points
                ),
                Math.floor(
                    (sub+1e-9)*10
                )
            )

            :0;

    render();
  },


  points(n){

    S.pointsToUse=
        Math.max(
            0,
            Math.floor(
                Number(n)
            )
        );

    render();
  },


  /* =========================================================
     LOCATION
  ========================================================= */

  locateMe(){

    if(!navigator.geolocation){

      S.location.error=
          S.lang==="ar"
              ?"المتصفح لا يدعم تحديد الموقع."
              :"Geolocation is not supported by this browser.";

      render();

      return;
    }


    S.location.loading=true;
    S.location.error="";

    render();


    navigator
        .geolocation
        .getCurrentPosition(

            position=>{

              S.location={

                lat:Number(
                    position.coords.latitude
                ),

                lng:Number(
                    position.coords.longitude
                ),

                loading:false,

                error:""

              };


              console.log(
                  "Location:",
                  S.location.lat,
                  S.location.lng
              );


              render();
            },


            error=>{

              let msg=
                  S.lang==="ar"
                      ?"تعذر تحديد موقعك."
                      :"Could not determine your location.";


              if(error.code===1){

                msg=
                    S.lang==="ar"
                        ?"تم رفض إذن الموقع. اسمح للموقع بالوصول إلى موقعك من إعدادات المتصفح."
                        :"Location permission was denied.";

              }else if(error.code===2){

                msg=
                    S.lang==="ar"
                        ?"الموقع غير متوفر حالياً."
                        :"Your location is currently unavailable.";

              }else if(error.code===3){

                msg=
                    S.lang==="ar"
                        ?"استغرق تحديد الموقع وقتاً طويلاً. حاول مرة ثانية."
                        :"Location request timed out.";

              }


              S.location={

                lat:null,
                lng:null,
                loading:false,
                error:msg

              };


              console.error(
                  "Geolocation error:",
                  error
              );


              render();
            },


            {
              enableHighAccuracy:true,
              timeout:12000,
              maximumAge:60000
            }

        );
  },


  payment(p){

    setState({
      payment:p
    });
  },


  /* =========================================================
     PLACE ORDER
  ========================================================= */

  async placeOrder(){

    if(
        !window.AUTH ||
        !window.AUTH.user
    ){

      setState({
        drawer:false
      });

      authUI.open();

      return;
    }


    const items=
        cartItems();


    if(!items.length){
      return;
    }


    const name=
        document
            .getElementById(
                "co-name"
            )
            ?.value
            .trim()
        ||"";


    const phone=
        document
            .getElementById(
                "co-phone"
            )
            ?.value
            .trim()
        ||"";


    const address=
        document
            .getElementById(
                "co-address"
            )
            ?.value
            .trim()
        ||"";


    try{

      const payload=
          items.map(it=>({

            product_id:
            it.id,

            qty:
            it.qty

          }));


      const {
        data,
        error
      }=await sb.rpc(

          "place_order_with_loyalty",

          {

            p_items:
            payload,

            p_delivery_method:
            S.delivery,

            p_payment_method:
            S.payment,

            p_full_name:
                name||null,

            p_phone:
                phone||null,

            p_address:
                address||null,

            p_points_to_use:
                S.pointsToUse||0,

            p_latitude:
                S.delivery==="delivery"
                    ?S.location.lat
                    :null,

            p_longitude:
                S.delivery==="delivery"
                    ?S.location.lng
                    :null

          }
      );


      if(error){
        throw error;
      }


      const order=
          Array.isArray(data)
              ?data[0]
              :data;


      S.pointsToUse=0;


      S.location={
        lat:null,
        lng:null,
        loading:false,
        error:""
      };


      await refreshAuthState();


      setState({

        step:"done",

        cart:{},

        orderNo:
            String(
                order.order_id
            )
                .slice(
                    0,
                    8
                )

      });


    }catch(err){

      console.error(
          "order error:",
          err
      );


      alert(

          S.lang==="ar"

              ?"صار خطأ بتنفيذ الطلب، تأكد من النقاط والبيانات وحاول مرة ثانية."

              :"Something went wrong placing the order. Please check your points and details and try again."

      );
    }
  },


  home(e){

    e.preventDefault();

    window.app.clearAll();

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  },


  go(sel){

    const el=
        document
            .querySelector(
                sel
            );

    if(el){

      el.scrollIntoView({
        behavior:"smooth"
      });

    }
  }

};


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "keydown",
    function(e){

      if(e.key==="Escape"){

        if(S.modal){

          setState({
            modal:null
          });

        }else if(S.drawer){

          setState({
            drawer:false
          });

        }
      }
    }
);


document.addEventListener(
    "auth-changed",
    render
);


render();


loadProductsFromSupabase().then(()=>{

  const params=
      new URLSearchParams(location.search);

  const addId=
      params.get("add");

  if(addId){

    window.app.inc(addId);
    window.app.openCart();

    params.delete("add");

    const cleanUrl=
        location.pathname+
        (params.toString()?`?${params.toString()}`:"")+
        location.hash;

    history.replaceState(
        null,
        "",
        cleanUrl
    );
  }
});


document.addEventListener(
    "products-changed",
    loadProductsFromSupabase
);


/* =========================================================
   HEADER SCROLL
========================================================= */

if(
    !window.__attarScrollShrinkBound
){

  window.__attarScrollShrinkBound=
      true;


  (function(){

    function onScroll(){

      document
          .body
          .classList
          .toggle(
              "scrolled",
              window.scrollY>40
          );

    }


    window.addEventListener(
        "scroll",
        onScroll,
        {
          passive:true
        }
    );


    onScroll();

  })();
}