/* Al-Attar CRM Admin — dashboard, customers, orders, loyalty and products */

const ADM={
  products:[],
  productPerformance:[],
  orders:[],
  customers:[],
  loyalty:[],
  certifications:[],
  certLogo:null,
  certPdfs:[],
  prodGallery:[],
  ingredientRows:[],
  ingredientImg:null,

  categories:{},
  benefits:{},
  ingredients:{},

  customerNotes:[],
  customerLoyalty:[],

  busy:false,
  loading:false,
  err:"",
  tab:"dashboard",
  search:"",
  selectedCustomer:null
};

const ADM_STATUS_LABELS={
  pending:"قيد الانتظار",
  confirmed:"تم التأكيد",
  shipped:"تم الشحن",
  done:"تم التسليم",
  cancelled:"ملغي"
};

const ADM_STATUS_CLASS={
  pending:"warn",
  confirmed:"info",
  shipped:"info",
  done:"ok",
  cancelled:"bad"
};

function slugify(s){
  return s.toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g,"_")
      .replace(/^_+|_+$/g,"");
}

function admEsc(v){
  return String(v??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
}

function admMoney(v){
  return Number(v||0).toFixed(2)+" د.أ";
}

function admDate(v){
  return v
      ?new Date(v).toLocaleDateString("ar-JO")
      :"—";
}

function admDateTime(v){
  return v
      ?new Date(v).toLocaleString("ar-JO")
      :"—";
}

function admMapsUrl(o){
  if(o?.location_url) return o.location_url;

  if(o?.latitude!==null&&o?.latitude!==undefined&&
      o?.longitude!==null&&o?.longitude!==undefined){
    return `https://www.google.com/maps?q=${encodeURIComponent(o.latitude+","+o.longitude)}`;
  }

  return "";
}


/* =========================================================
   LABELS
========================================================= */

async function admLoadLabels(){
  try{
    const [catRes,benRes,ingRes]=await Promise.all([
      sb.from("category_labels").select("*"),
      sb.from("benefit_labels").select("*"),
      sb.from("ingredient_labels").select("*")
    ]);

    ADM.categories={};
    (catRes.data||[]).forEach(r=>{
      ADM.categories[r.key]={
        ar:r.ar,
        en:r.en,
        icon:r.icon||"🌿"
      };
    });

    ADM.benefits={};
    (benRes.data||[]).forEach(r=>{
      ADM.benefits[r.key]={
        ar:r.ar,
        en:r.en
      };
    });

    ADM.ingredients={};
    ADM.ingredientRows=ingRes.data||[];
    (ingRes.data||[]).forEach(r=>{
      ADM.ingredients[r.key]={
        ar:r.ar,
        en:r.en
      };
    });

  }catch(err){
    console.error("labels load error:",err);
  }
}


/* =========================================================
   ACCESS
========================================================= */

function admGate(){
  const root=document.getElementById("admin-root");

  if(!window.AUTH?.ready){
    root.innerHTML=`
      <div class="adm-gate">
        <h2>لوحة التحكم</h2>
        <p>جاري التحقق من الصلاحيات…</p>
      </div>`;
    return false;
  }

  if(!window.AUTH.user){
    root.innerHTML=`
      <div class="adm-gate">
        <h2>لوحة التحكم</h2>
        <p>لازم تسجّل دخول أول.</p>
        <button class="adm-btn" onclick="authUI.open()">تسجيل الدخول</button>
      </div>`;
    return false;
  }

  const role=window.AUTH.profile?.role;

  if(role!=="admin"&&role!=="manager"){
    root.innerHTML=`
      <div class="adm-gate">
        <h2>غير مصرّح</h2>
        <p>هاد الحساب مش أدمن أو مدير.</p>
        <a class="adm-btn" href="index.html">رجوع</a>
      </div>`;
    return false;
  }

  return true;
}


/* =========================================================
   LOAD
========================================================= */

async function admLoad(){
  if(!admGate()) return;

  ADM.loading=true;
  ADM.err="";
  admRender();

  const role=window.AUTH.profile?.role;

  if(role!=="admin"&&(ADM.tab==="products"||ADM.tab==="certifications"||ADM.tab==="ingredients")){
    ADM.tab="dashboard";
  }

  try{
    const [custRes,ordRes,loyRes]=await Promise.all([

      sb
          .from("crm_customers")
          .select("*")
          .order("total_spent",{ascending:false}),

      sb
          .from("orders")
          .select(`
          id,
          user_id,
          status,
          delivery_method,
          payment_method,
          full_name,
          phone,
          address,
          latitude,
          longitude,
          location_url,
          subtotal,
          shipping,
          total,
          loyalty_points_redeemed,
          loyalty_discount,
          loyalty_points_earned,
          created_at,
          order_items(
            name_ar,
            name_en,
            price,
            qty
          )
        `)
          .order("created_at",{ascending:false}),

      sb
          .from("crm_loyalty_overview")
          .select("*")
          .order("active_points",{ascending:false})

    ]);


    if(custRes.error){
      console.error("customers load error:",custRes.error);
      ADM.customers=[];
    }else{
      ADM.customers=custRes.data||[];
    }


    if(ordRes.error){
      console.error("orders load error:",ordRes.error);
      ADM.orders=[];
    }else{
      const customerById=Object.fromEntries(
          ADM.customers.map(c=>[c.id,c])
      );

      ADM.orders=(ordRes.data||[]).map(o=>({
        ...o,
        profiles:customerById[o.user_id]||null
      }));
    }


    if(loyRes.error){
      console.error("loyalty load error:",loyRes.error);
      ADM.loyalty=[];
    }else{
      ADM.loyalty=loyRes.data||[];
    }


    if(role==="admin"){
      await admLoadLabels();

      const [prodRes,perfRes,certRes]=await Promise.all([
        sb
            .from("products")
            .select("*")
            .order("created_at",{ascending:false}),

        sb
            .from("crm_product_performance")
            .select("*")
            .order("revenue",{ascending:false}),

        sb
            .from("certifications")
            .select("*")
            .order("sort_order",{ascending:true})
      ]);

      if(prodRes.error){
        console.error("products load error:",prodRes.error);
        ADM.products=[];
      }else{
        ADM.products=prodRes.data||[];
      }

      if(perfRes.error){
        console.error("product performance error:",perfRes.error);
        ADM.productPerformance=[];
      }else{
        ADM.productPerformance=perfRes.data||[];
      }

      if(certRes.error){
        console.error("certifications load error:",certRes.error);
        ADM.certifications=[];
      }else{
        ADM.certifications=certRes.data||[];
      }
    }

  }catch(err){
    console.error("CRM load error:",err);
    ADM.err=err.message||"تعذر تحميل البيانات";
  }

  ADM.loading=false;
  admRender();
}


/* =========================================================
   NAV
========================================================= */

function admNav(){
  const role=window.AUTH.profile?.role;

  const items=[
    ["dashboard","🏠","الرئيسية"],
    ["orders","📦","الطلبات"],
    ["customers","👥","العملاء"],
    ["loyalty","⭐","الولاء"]
  ];

  if(role==="admin"){
    items.push(["products","🌿","المنتجات"]);
    items.push(["ingredients","🍃","المكوّنات"]);
    items.push(["certifications","🏅","الشهادات"]);
  }

  return `<aside class="crm-side">

    <div class="crm-brand">
      <span>🌿</span>
      <div>
        <b>العطّار</b>
        <small>CRM</small>
      </div>
    </div>

    <nav>
      ${items.map(([k,i,l])=>`
        <button
          class="crm-nav ${ADM.tab===k?"on":""}"
          onclick="admUI.switchTab('${k}')">
          <span>${i}</span>
          ${l}
        </button>
      `).join("")}
    </nav>

    <div class="crm-side-foot">
      <div>
        ${admEsc(
      window.AUTH.profile?.full_name||
      window.AUTH.user?.email||
      ""
  )}
      </div>

      <small>${role==="admin"?"Admin":"Manager"}</small>

      <a href="index.html">
        ↩ العودة للمتجر
      </a>
    </div>

  </aside>`;
}


/* =========================================================
   RENDER
========================================================= */

function admRender(){
  if(!admGate()) return;

  const root=document.getElementById("admin-root");

  if(ADM.loading&&!ADM.orders.length&&!ADM.customers.length){
    root.innerHTML=`
      <div class="adm-loading">
        جاري تحميل CRM…
      </div>`;
    return;
  }

  const titles={
    dashboard:"نظرة عامة",
    orders:"الطلبات",
    customers:"العملاء",
    loyalty:"برنامج الولاء",
    products:"المنتجات",
    ingredients:"المكوّنات",
    certifications:"الشهادات"
  };

  root.innerHTML=`
    <div class="crm-shell">

      ${admNav()}

      <main class="crm-main">

        <header class="crm-top">

          <div>
            <h1>${titles[ADM.tab]||"CRM"}</h1>

            <p>
              ${ADM.err
      ?`<span class="crm-error">${admEsc(ADM.err)}</span>`
      :"إدارة العملاء والطلبات والولاء من مكان واحد"}
            </p>
          </div>

          <div class="crm-top-actions">

            ${ADM.tab==="products"
      ?`<button class="adm-btn" onclick="admUI.newProduct()">+ منتج جديد</button>`
      :""}

            ${ADM.tab==="certifications"
      ?`<button class="adm-btn" onclick="admUI.newCertification()">+ شهادة جديدة</button>`
      :""}

            ${ADM.tab==="ingredients"
      ?`<button class="adm-btn" onclick="admUI.newIngredient()">+ مكوّن جديد</button>`
      :""}

            <button
              class="crm-refresh"
              onclick="admLoad()">
              ↻ تحديث
            </button>

          </div>

        </header>

        <section class="crm-content">
          ${admTabHtml()}
        </section>

        <div id="adm-modal-root"></div>

      </main>

    </div>`;
}

function admTabHtml(){
  if(ADM.tab==="dashboard") return admDashboardHtml();
  if(ADM.tab==="orders") return admOrdersHtml();
  if(ADM.tab==="customers") return admCustomersHtml();
  if(ADM.tab==="loyalty") return admLoyaltyHtml();
  if(ADM.tab==="certifications") return admCertificationsHtml();
  if(ADM.tab==="ingredients") return admIngredientsHtml();

  return admProductsHtml();
}


/* =========================================================
   DASHBOARD
========================================================= */

function admDashboardHtml(){
  const done=ADM.orders.filter(o=>o.status==="done");

  const revenue=done.reduce(
      (s,o)=>s+Number(o.total||0),
      0
  );

  const customerRows=ADM.customers.filter(
      c=>Number(c.total_orders||0)>0
  );

  const new30=customerRows.filter(c=>
      Date.now()-new Date(c.customer_since).getTime()
      <30*86400000
  ).length;

  const aov=done.length
      ?revenue/done.length
      :0;

  const outstanding=ADM.loyalty.reduce(
      (s,x)=>s+Number(x.active_points||0),
      0
  );

  const pending=ADM.orders.filter(
      o=>o.status==="pending"
  ).length;

  const top=customerRows
      .slice()
      .sort(
          (a,b)=>
              Number(b.total_spent)-
              Number(a.total_spent)
      )
      .slice(0,5);

  const recent=ADM.orders.slice(0,6);

  const cod=ADM.orders.filter(
      o=>o.payment_method==="cod"
  ).length;

  const bank=ADM.orders.filter(
      o=>o.payment_method==="bank"
  ).length;

  return `
    <div class="crm-kpis">

      ${admKpi(
      "إجمالي المبيعات",
      admMoney(revenue),
      "الطلبات المسلّمة",
      "💰"
  )}

      ${admKpi(
      "الطلبات",
      ADM.orders.length,
      `${pending} قيد الانتظار`,
      "📦"
  )}

      ${admKpi(
      "العملاء",
      customerRows.length,
      `${new30} جدد آخر 30 يوم`,
      "👥"
  )}

      ${admKpi(
      "متوسط الطلب",
      admMoney(aov),
      "للطلبات المسلّمة",
      "🧾"
  )}

      ${admKpi(
      "نقاط متاحة",
      outstanding,
      `${admMoney(outstanding/10)} قيمة`,
      "⭐"
  )}

    </div>


    <div class="crm-grid-2">

      <div class="crm-card">

        <div class="crm-card-head">
          <h3>أحدث الطلبات</h3>

          <button onclick="admUI.switchTab('orders')">
            عرض الكل
          </button>
        </div>

        ${recent.map(admMiniOrder).join("")||admEmpty("لا توجد طلبات")}

      </div>


      <div class="crm-card">

        <div class="crm-card-head">
          <h3>أفضل العملاء</h3>

          <button onclick="admUI.switchTab('customers')">
            عرض الكل
          </button>
        </div>

        ${top.map((c,i)=>`
          <button
            class="crm-customer-mini"
            onclick="admUI.openCustomer('${c.id}')">

            <span class="crm-rank">
              ${i+1}
            </span>

            <span>
              <b>${admEsc(c.full_name||c.email||"عميل")}</b>
              <small>${c.total_orders} طلب</small>
            </span>

            <strong>${admMoney(c.total_spent)}</strong>

          </button>
        `).join("")||admEmpty("لا يوجد عملاء بعد")}

      </div>

    </div>


    <div class="crm-grid-2">

      <div class="crm-card">

        <h3>حالة الطلبات</h3>

        <div class="crm-status-grid">

          ${Object.entries(ADM_STATUS_LABELS).map(([k,v])=>`
            <div>
              <span>${v}</span>
              <b>${ADM.orders.filter(o=>o.status===k).length}</b>
            </div>
          `).join("")}

        </div>

      </div>


      <div class="crm-card">

        <h3>طرق الدفع</h3>

        <div class="crm-pay">

          <div>
            <span>💵 الدفع عند الاستلام</span>
            <b>${cod}</b>
          </div>

          <div>
            <span>🏦 تحويل بنكي</span>
            <b>${bank}</b>
          </div>

        </div>

      </div>

    </div>`;
}

function admKpi(label,value,sub,icon){
  return `<div class="crm-kpi">

    <div class="crm-kpi-icon">
      ${icon}
    </div>

    <div>
      <span>${label}</span>
      <b>${value}</b>
      <small>${sub}</small>
    </div>

  </div>`;
}

function admMiniOrder(o){
  const name=
      o.profiles?.full_name||
      o.full_name||
      o.profiles?.email||
      "عميل";

  return `<button
    class="crm-mini-order"
    onclick="admUI.switchTab('orders')">

    <span>
      <b>#${o.id.slice(0,8)}</b>
      <small>${admEsc(name)} · ${admDate(o.created_at)}</small>
    </span>

    <span class="crm-status ${ADM_STATUS_CLASS[o.status]}">
      ${ADM_STATUS_LABELS[o.status]||o.status}
    </span>

    <strong>${admMoney(o.total)}</strong>

  </button>`;
}

function admEmpty(t){
  return `<div class="adm-empty">${t}</div>`;
}


/* =========================================================
   CUSTOMERS
========================================================= */

function admCustomersHtml(){
  const q=ADM.search.trim().toLowerCase();

  const rows=ADM.customers
      .filter(
          c=>Number(c.total_orders||0)>0
      )
      .filter(
          c=>
              !q||
              [c.full_name,c.email,c.phone]
                  .some(
                      v=>
                          String(v||"")
                              .toLowerCase()
                              .includes(q)
                  )
      );

  return `
    <div class="crm-toolbar">

      <div class="crm-search">
        ⌕
        <input
          value="${admEsc(ADM.search)}"
          placeholder="ابحث بالاسم، الإيميل أو الهاتف"
          oninput="admUI.search(this.value)">
      </div>

      <span>${rows.length} عميل</span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-table">

        <thead>
          <tr>
            <th>العميل</th>
            <th>الطلبات</th>
            <th>إجمالي الإنفاق</th>
            <th>متوسط الطلب</th>
            <th>النقاط</th>
            <th>آخر طلب</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${rows.map(c=>`

            <tr>

              <td>
                <div class="crm-person">

                  <span>
                    ${admEsc(
      (c.full_name||c.email||"?")
          .charAt(0)
          .toUpperCase()
  )}
                  </span>

                  <div>
                    <b>${admEsc(c.full_name||"بدون اسم")}</b>

                    <small>
                      ${admEsc(c.email||"")}
                      ${c.phone?` · ${admEsc(c.phone)}`:""}
                    </small>
                  </div>

                </div>
              </td>

              <td>${c.total_orders}</td>

              <td>
                <b>${admMoney(c.total_spent)}</b>
              </td>

              <td>${admMoney(c.average_order_value)}</td>

              <td>
                <span class="crm-points">
                  ⭐ ${c.loyalty_points}
                </span>
              </td>

              <td>${admDate(c.last_order_at)}</td>

              <td>
                <button
                  class="crm-row-btn"
                  onclick="admUI.openCustomer('${c.id}')">
                  فتح الملف
                </button>
              </td>

            </tr>

          `).join("")||`
            <tr>
              <td colspan="7">
                ${admEmpty("لا يوجد نتائج")}
              </td>
            </tr>
          `}

        </tbody>

      </table>

    </div>`;
}


/* =========================================================
   ORDERS
========================================================= */

function admOrdersHtml(){
  const q=ADM.search.trim().toLowerCase();

  const rows=ADM.orders.filter(o=>
      !q||
      [
        o.id,
        o.full_name,
        o.phone,
        o.address,
        o.profiles?.full_name,
        o.profiles?.email
      ]
          .some(
              v=>
                  String(v||"")
                      .toLowerCase()
                      .includes(q)
          )
  );

  return `
    <div class="crm-toolbar">

      <div class="crm-search">
        ⌕
        <input
          value="${admEsc(ADM.search)}"
          placeholder="ابحث برقم الطلب أو العميل"
          oninput="admUI.search(this.value)">
      </div>

      <span>${rows.length} طلب</span>

    </div>


    <div class="crm-order-list">

      ${rows.map(o=>{

    const name=
        o.profiles?.full_name||
        o.full_name||
        o.profiles?.email||
        "عميل";

    const mapUrl=admMapsUrl(o);

    return `
          <article class="crm-order">

            <div class="crm-order-top">

              <div>
                <b>#${o.id.slice(0,8)}</b>
                <small>${admDateTime(o.created_at)}</small>
              </div>

              <div class="crm-order-customer">

                ${o.user_id
        ?`<button onclick="admUI.openCustomer('${o.user_id}')">${admEsc(name)}</button>`
        :admEsc(name)
    }

                <small>
                  ${admEsc(
        o.phone||
        o.profiles?.phone||
        ""
    )}
                </small>

              </div>

              <div>
                <select
                  class="crm-status-select"
                  onchange="admUI.setOrderStatus('${o.id}',this.value)">

                  ${Object.entries(ADM_STATUS_LABELS).map(([k,v])=>`
                    <option
                      value="${k}"
                      ${o.status===k?"selected":""}>
                      ${v}
                    </option>
                  `).join("")}

                </select>
              </div>

              <strong>${admMoney(o.total)}</strong>

            </div>


            <div class="crm-order-items">

              ${(o.order_items||[]).map(it=>`
                <div>
                  <span>${admEsc(it.name_ar)} × ${it.qty}</span>
                  <span>${admMoney(Number(it.price)*Number(it.qty))}</span>
                </div>
              `).join("")}

            </div>


            <div class="crm-order-meta">

              <span>
                ${o.delivery_method==="pickup"
        ?"🏬 استلام من المتجر"
        :"🚚 توصيل للمنزل"}
              </span>

              <span>
                ${o.payment_method==="bank"
        ?"🏦 تحويل بنكي"
        :"💵 دفع عند الاستلام"}
              </span>


              ${o.delivery_method==="delivery"&&o.address
        ?`<span>🏠 ${admEsc(o.address)}</span>`
        :""
    }


              ${mapUrl
        ?`<a
                    class="crm-row-btn"
                    href="${admEsc(mapUrl)}"
                    target="_blank"
                    rel="noopener">
                    📍 فتح موقع التوصيل
                  </a>`
        :""
    }


              ${o.loyalty_points_redeemed
        ?`<span>
                    ⭐ استخدم
                    ${o.loyalty_points_redeemed}
                    نقطة
                    (-${admMoney(o.loyalty_discount)})
                  </span>`
        :""
    }


              ${o.loyalty_points_earned
        ?`<span>
                    ✨ كسب
                    ${o.loyalty_points_earned}
                    نقطة
                  </span>`
        :""
    }

            </div>

          </article>`;
  }).join("")||admEmpty("لا توجد طلبات")}

    </div>`;
}


/* =========================================================
   LOYALTY
========================================================= */

function admLoyaltyHtml(){
  const total=ADM.loyalty.reduce(
      (s,x)=>s+Number(x.active_points||0),
      0
  );

  const earned=ADM.loyalty.reduce(
      (s,x)=>s+Number(x.lifetime_earned||0),
      0
  );

  const redeemed=ADM.loyalty.reduce(
      (s,x)=>s+Number(x.lifetime_redeemed||0),
      0
  );

  const rows=ADM.loyalty
      .filter(x=>x.email||x.full_name)
      .sort(
          (a,b)=>
              Number(b.active_points)-
              Number(a.active_points)
      );

  return `
    <div class="crm-kpis crm-kpis-3">

      ${admKpi(
      "النقاط المتاحة",
      total,
      `${admMoney(total/10)} قيمة حالية`,
      "⭐"
  )}

      ${admKpi(
      "إجمالي المكتسب",
      earned,
      "من الطلبات المسلّمة",
      "✨"
  )}

      ${admKpi(
      "إجمالي المستخدم",
      redeemed,
      "خصومات العملاء",
      "🎁"
  )}

    </div>


    <div class="crm-table-wrap">

      <table class="crm-table">

        <thead>
          <tr>
            <th>العميل</th>
            <th>الرصيد</th>
            <th>القيمة</th>
            <th>مكتسب تاريخياً</th>
            <th>مستخدم</th>
            <th>أقرب انتهاء</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${rows.map(x=>`
            <tr>

              <td>
                <b>${admEsc(x.full_name||x.email)}</b>
                <small class="crm-block">
                  ${admEsc(x.email||"")}
                </small>
              </td>

              <td>
                <span class="crm-points">
                  ${x.active_points} نقطة
                </span>
              </td>

              <td>
                ${admMoney(Number(x.active_points)/10)}
              </td>

              <td>
                ${x.lifetime_earned}
              </td>

              <td>
                ${x.lifetime_redeemed}
              </td>

              <td>
                ${admDate(x.next_expiry)}
              </td>

              <td>
                <button
                  class="crm-row-btn"
                  onclick="admUI.openCustomer('${x.user_id}')">
                  التفاصيل
                </button>
              </td>

            </tr>
          `).join("")}

        </tbody>

      </table>

    </div>`;
}


/* =========================================================
   PRODUCTS
========================================================= */

function admProductsHtml(){
  const perf=Object.fromEntries(
      (ADM.productPerformance||[])
          .map(x=>[x.id,x])
  );

  const q=ADM.search.trim().toLowerCase();

  const rows=ADM.products.filter(
      p=>
          !q||
          [p.name_ar,p.name_en,p.id]
              .some(
                  v=>
                      String(v||"")
                          .toLowerCase()
                          .includes(q)
              )
  );

  return `
    <div class="crm-toolbar">

      <div class="crm-search">
        ⌕
        <input
          value="${admEsc(ADM.search)}"
          placeholder="ابحث باسم المنتج (عربي أو إنجليزي)"
          oninput="admUI.search(this.value)">
      </div>

      <span>${rows.length} منتج</span>

    </div>


    <div class="crm-table-wrap">

      <table class="crm-table">

        <thead>
          <tr>
            <th>المنتج</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>وحدات مباعة</th>
            <th>الإيراد</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${rows.map(p=>{

    const m=perf[p.id]||{};

    return `
              <tr>

                <td>

                  <div class="crm-product">

                    <span>
                      ${p.image_url
        ?`<img src="${admEsc(p.image_url)}">`
        :"🌿"}
                    </span>

                    <div>
                      <b>${admEsc(p.name_ar)}</b>
                      <small>${admEsc(p.name_en)}</small>
                    </div>

                  </div>

                </td>

                <td>${admMoney(p.price)}</td>

                <td>
                  ${p.active
        ?`<span class="crm-status ok">نشط</span>`
        :`<span class="crm-status bad">موقوف</span>`}
                </td>

                <td>${m.units_sold||0}</td>

                <td>${admMoney(m.revenue||0)}</td>

                <td>

                  <div class="adm-row-acts">

                    <button
                      class="adm-icon-btn"
                      onclick="admUI.edit('${p.id}')">
                      ✎
                    </button>

                    <button
                      class="adm-icon-btn danger"
                      onclick="admUI.remove('${p.id}')">
                      🗑
                    </button>

                  </div>

                </td>

              </tr>`;
  }).join("")||`
            <tr>
              <td colspan="6">
                ${admEmpty(q?"ما في منتجات مطابقة للبحث":"ما في منتجات")}
              </td>
            </tr>
          `}

        </tbody>

      </table>

    </div>`;
}


/* =========================================================
   CERTIFICATIONS
========================================================= */

function admCertificationsHtml(){
  return `
    <div class="crm-table-wrap">

      <table class="crm-table">

        <thead>
          <tr>
            <th>الشهادة</th>
            <th>الجهة المانحة</th>
            <th>الترتيب</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${ADM.certifications.map(c=>`
            <tr>

              <td>

                <div class="crm-product">

                  <span>
                    ${(c.images&&c.images[0])
      ?`<img src="${admEsc(c.images[0])}">`
      :"🏅"}
                  </span>

                  <div>
                    <b>${admEsc(c.name_ar)}</b>
                    <small>${admEsc(c.name_en)}</small>
                  </div>

                </div>

              </td>

              <td>${admEsc(c.issuer)}</td>

              <td>${c.sort_order}</td>

              <td>
                ${c.active
      ?`<span class="crm-status ok">نشط</span>`
      :`<span class="crm-status bad">موقوف</span>`}
              </td>

              <td>

                <div class="adm-row-acts">

                  <button
                    class="adm-icon-btn"
                    onclick="admUI.editCertification('${c.id}')">
                    ✎
                  </button>

                  <button
                    class="adm-icon-btn danger"
                    onclick="admUI.removeCertification('${c.id}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `).join("")||`
            <tr>
              <td colspan="5">
                ${admEmpty("ما في شهادات مضافة")}
              </td>
            </tr>
          `}

        </tbody>

      </table>

    </div>`;
}


/* =========================================================
   INGREDIENTS
========================================================= */

function admIngredientsHtml(){
  return `
    <div class="crm-table-wrap">

      <table class="crm-table">

        <thead>
          <tr>
            <th>المكوّن</th>
            <th>الاسم العلمي</th>
            <th>معلومات مفصّلة؟</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          ${ADM.ingredientRows.map(r=>`
            <tr>

              <td>

                <div class="crm-product">

                  <span>
                    ${r.image_url
      ?`<img src="${admEsc(r.image_url)}">`
      :"🍃"}
                  </span>

                  <div>
                    <b>${admEsc(r.ar)}</b>
                    <small>${admEsc(r.en)}</small>
                  </div>

                </div>

              </td>

              <td><i>${admEsc(r.scientific_name||"—")}</i></td>

              <td>
                ${r.desc_ar||r.scientific_name
      ?`<span class="crm-status ok">مكتملة</span>`
      :`<span class="crm-status warn">ناقصة</span>`}
              </td>

              <td>

                <div class="adm-row-acts">

                  <button
                    class="adm-icon-btn"
                    onclick="admUI.editIngredient('${r.key}')">
                    ✎
                  </button>

                  <button
                    class="adm-icon-btn danger"
                    onclick="admUI.deleteIngredient('${r.key}')">
                    🗑
                  </button>

                </div>

              </td>

            </tr>
          `).join("")||`
            <tr>
              <td colspan="4">
                ${admEmpty("ما في مكوّنات مضافة")}
              </td>
            </tr>
          `}

        </tbody>

      </table>

    </div>`;
}


/* =========================================================
   CUSTOMER DETAIL
========================================================= */

async function admLoadCustomerDetail(id){
  const [notesRes,loyRes]=await Promise.all([

    sb
        .from("customer_notes")
        .select("*")
        .eq("customer_id",id)
        .order("created_at",{ascending:false}),

    sb
        .from("loyalty_transactions")
        .select(`
        id,
        type,
        points,
        note,
        created_at,
        expires_at,
        remaining_points,
        order_id
      `)
        .eq("user_id",id)
        .order("created_at",{ascending:false})
        .limit(50)

  ]);

  ADM.customerNotes=
      notesRes.error
          ?[]
          :(notesRes.data||[]);

  ADM.customerLoyalty=
      loyRes.error
          ?[]
          :(loyRes.data||[]);
}

function admContactItem(icon,label,value){
  return `<div class="crm-contact-item">

    <span class="crm-contact-icon">
      ${icon}
    </span>

    <div>
      <small>${label}</small>
      <b>${admEsc(value)}</b>
    </div>

  </div>`;
}

function admCustomerDetailHtml(id){
  const c=ADM.customers.find(x=>x.id===id);
  if(!c) return "";

  const orders=ADM.orders
      .filter(o=>o.user_id===id)
      .sort(
          (a,b)=>
              new Date(b.created_at)-
              new Date(a.created_at)
      );

  const latestOrder=orders[0]||null;

  const contactName=
      c.full_name||
      latestOrder?.full_name||
      "بدون اسم";

  const contactEmail=
      c.email||"";

  const contactPhone=
      c.phone||
      latestOrder?.phone||
      "";

  const contactAddress=
      latestOrder?.address||
      "";

  const latestMapUrl=
      admMapsUrl(latestOrder);

  const phoneLink=contactPhone
      ?String(contactPhone).replace(/[^\d+]/g,"")
      :"";

  const txLabel={
    earned:"مكتسب",
    redeemed:"مستخدم",
    expired:"منتهي",
    refund:"مسترجع",
    adjustment:"تعديل"
  };

  return `
    <div
      class="adm-overlay"
      onclick="if(event.target===this)admUI.closeForm()">

      <div class="crm-customer-modal">


        <div class="crm-modal-head">

          <div class="crm-person big">

            <span>
              ${admEsc(
      contactName.charAt(0).toUpperCase()||"?"
  )}
            </span>

            <div>
              <h2>${admEsc(contactName)}</h2>

              <p>
                ${contactEmail
      ?admEsc(contactEmail)
      :"لا يوجد بريد إلكتروني"}
              </p>
            </div>

          </div>

          <button
            class="auth-x"
            onclick="admUI.closeForm()">
            ✕
          </button>

        </div>


        <section class="crm-card crm-contact-card">

          <div class="crm-card-head">
            <h3>بيانات التواصل</h3>
          </div>

          <div class="crm-contact-grid">

            ${admContactItem(
      "👤",
      "الاسم",
      contactName
  )}

            ${admContactItem(
      "📞",
      "رقم الهاتف",
      contactPhone||"غير متوفر"
  )}

            ${admContactItem(
      "✉️",
      "البريد الإلكتروني",
      contactEmail||"غير متوفر"
  )}

            ${admContactItem(
      "📍",
      "آخر عنوان توصيل",
      contactAddress||"غير متوفر"
  )}

            ${admContactItem(
      "📅",
      "عميل منذ",
      admDate(c.customer_since)
  )}

            ${admContactItem(
      "🛒",
      "آخر طلب",
      admDate(c.last_order_at)
  )}

          </div>


          <div class="crm-contact-actions">

            ${contactPhone?`
              <a
                class="adm-btn"
                href="tel:${phoneLink}">
                📞 اتصال
              </a>

              <button
                class="crm-row-btn"
                onclick="navigator.clipboard.writeText('${admEsc(contactPhone)}')">
                📋 نسخ الرقم
              </button>
            `:""}


            ${contactEmail?`
              <a
                class="crm-row-btn"
                href="mailto:${admEsc(contactEmail)}">
                ✉️ إرسال بريد
              </a>
            `:""}


            ${latestMapUrl?`
              <a
                class="crm-row-btn"
                target="_blank"
                rel="noopener"
                href="${admEsc(latestMapUrl)}">
                📍 فتح آخر موقع توصيل
              </a>
            `:""}

          </div>

        </section>


        <div class="crm-profile-kpis">

          ${admKpi(
      "إجمالي الإنفاق",
      admMoney(c.total_spent),
      `${c.delivered_orders} طلب مسلّم`,
      "💰"
  )}

          ${admKpi(
      "عدد الطلبات",
      c.total_orders,
      `آخر طلب ${admDate(c.last_order_at)}`,
      "📦"
  )}

          ${admKpi(
      "رصيد النقاط",
      c.loyalty_points,
      `${admMoney(Number(c.loyalty_points)/10)} قيمة`,
      "⭐"
  )}

        </div>


        ${window.AUTH.profile?.role==="admin"?`

          <section class="crm-card crm-loyalty-manage">

            <div class="crm-card-head">

              <div>
                <h3>إدارة النقاط</h3>

                <p>
                  الرصيد الحالي:
                  <b>${Number(c.loyalty_points||0)} نقطة</b>
                  ·
                  ${admMoney(Number(c.loyalty_points||0)/10)}
                </p>
              </div>

            </div>


            <div class="crm-loyalty-manage-grid">

              <div>

                <label>
                  عدد النقاط
                </label>

                <input
                  id="crm-points-amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="مثال: 10">

              </div>


              <div class="crm-loyalty-reason">

                <label>
                  سبب التعديل
                </label>

                <input
                  id="crm-points-reason"
                  type="text"
                  placeholder="مثال: تعويض للعميل أو تصحيح رصيد">

              </div>

            </div>


            <div class="crm-loyalty-actions">

              <button
                class="adm-btn"
                onclick="admUI.adjustPoints('${id}','add')">

                + إضافة نقاط

              </button>


              <button
                class="crm-row-btn crm-deduct-btn"
                onclick="admUI.adjustPoints('${id}','deduct')">

                − خصم نقاط

              </button>


              <button
                class="crm-row-btn crm-reset-btn"
                onclick="admUI.resetPoints('${id}')">

                تصفير الرصيد

              </button>

            </div>


            <small class="crm-loyalty-help">
              الإضافة صالحة 6 أشهر.
              الخصم يستخدم أقدم نقاط صالحة أولاً.
              كل تعديل يُسجل في سجل الولاء.
            </small>

          </section>

        `:""}


        <div class="crm-detail-grid">


          <section class="crm-card">

            <h3>
              آخر الطلبات
            </h3>

            ${orders.slice(0,10).map(admMiniOrder).join("")||admEmpty("لا توجد طلبات")}

          </section>


          <section class="crm-card">

            <h3>
              سجل الولاء
            </h3>


            <div class="crm-timeline">

              ${ADM.customerLoyalty.slice(0,10).map(t=>`

                <div>

                  <span
                    class="${Number(t.points)>=0?"plus":"minus"}">

                    ${Number(t.points)>=0?"+":""}${t.points}

                  </span>


                  <p>

                    <b>
                      ${txLabel[t.type]||t.type}
                    </b>

                    <small>
                      ${admDate(t.created_at)}

                      ${t.expires_at
      ?` · ينتهي ${admDate(t.expires_at)}`
      :""}
                    </small>

                  </p>

                </div>

              `).join("")||admEmpty("لا يوجد حركات")}

            </div>

          </section>


        </div>


        <section class="crm-card crm-notes">

          <div class="crm-card-head">
            <h3>ملاحظات الفريق</h3>
          </div>

          <div class="crm-note-add">

            <textarea
              id="crm-note-input"
              placeholder="مثال: مهتم بخلطات النوم — التواصل معه الأسبوع القادم…"></textarea>

            <button
              class="adm-btn"
              onclick="admUI.addNote('${id}')">

              إضافة

            </button>

          </div>

          ${ADM.customerNotes.map(n=>`

            <div class="crm-note">

              <p>
                ${admEsc(n.note)}
              </p>

              <small>
                ${admDateTime(n.created_at)}
              </small>

            </div>

          `).join("")||admEmpty("لا توجد ملاحظات")}

        </section>


      </div>

    </div>`;
}


/* =========================================================
   PRODUCT FORM
========================================================= */

function admProdGalleryHtml(){
  return `
    <div class="adm-cert-strip" id="adm-gallery">

      ${ADM.prodGallery.map((g,i)=>`
        <div class="adm-cert-thumb adm-gallery-thumb">
          <img src="${g.type==="url"?admEsc(g.url):g.previewUrl}">
          <input
            class="adm-gallery-label"
            value="${admEsc(g.label)}"
            placeholder="اسم الصورة"
            oninput="admUI.setGalleryLabel(${i},this.value)">
          <button
            type="button"
            class="adm-cert-thumb-x"
            onclick="admUI.removeGalleryImage(${i})">
            ✕
          </button>
        </div>
      `).join("")}

      <label class="adm-cert-add">
        + صورة
        <input
          type="file"
          accept="image/*"
          multiple
          onchange="admUI.addGalleryImages(this)">
      </label>

    </div>`;
}


function admFormHtml(p){
  const isNew=!p;

  p=p||{
    id:"",
    name_ar:"",
    name_en:"",
    desc_ar:"",
    desc_en:"",
    price:"",
    category:"",
    benefits:[],
    ingredients:[],
    image_url:"",
    card_image_url:"",
    badge_text:"",
    active:true
  };

  const catList=Object.entries(ADM.categories);
  const benList=Object.entries(ADM.benefits);
  const ingList=Object.entries(ADM.ingredients);

  return `
    <div
      class="adm-overlay"
      onclick="if(event.target===this)admUI.closeForm()">

      <div class="adm-modal">

        <div class="adm-modal-head">

          <b>
            ${isNew?"منتج جديد":"تعديل منتج"}
          </b>

          <button
            class="auth-x"
            onclick="admUI.closeForm()">
            ✕
          </button>

        </div>


        <div class="adm-modal-body">

          ${ADM.err
      ?`<div class="auth-err">${admEsc(ADM.err)}</div>`
      :""}


          <label class="adm-l">
            صورة المنتج (العلبة)
          </label>

          <div class="adm-imgpick">

            <div
              class="adm-imgpick-prev adm-imgpick-prev-lg"
              id="adm-img-prev">

              ${p.image_url
      ?`<img src="${admEsc(p.image_url)}" class="adm-preview-image">`
      :"🌿"}

            </div>

            <input
              type="file"
              id="adm-img-file"
              accept="image/*"
              onchange="admUI.previewImg(this)">

          </div>


          <label class="adm-l">
            صورة الكرت بالمتجر (اختياري — لو فاضية بتستخدم صورة المنتج فوق)
          </label>

          <div class="adm-imgpick">

            <div
              class="adm-imgpick-prev adm-imgpick-prev-lg"
              id="adm-cardimg-prev">

              ${p.card_image_url
      ?`<img src="${admEsc(p.card_image_url)}" class="adm-preview-image">`
      :"🖼️"}

            </div>

            <input
              type="file"
              id="adm-cardimg-file"
              accept="image/*"
              onchange="admUI.previewCardImg(this)">

          </div>


          <label class="adm-l">
            شارة على الكرت (اختياري — مثلاً: الأكثر مبيعاً)
          </label>

          <input
            class="auth-field"
            id="adm-badge-text"
            value="${admEsc(p.badge_text||"")}"
            placeholder="بدون شارة">


          <label class="adm-l">
            معرض صور المنتج (تظهر بصفحة تفاصيل المنتج — مكوّنات خام، أجواء...)
          </label>

          ${admProdGalleryHtml()}


          <label class="adm-l">
            الاسم بالعربي
          </label>

          <input
            class="auth-field"
            id="adm-name-ar"
            value="${admEsc(p.name_ar)}"
            required>


          <label class="adm-l">
            Name in English
          </label>

          <input
            class="auth-field"
            id="adm-name-en"
            value="${admEsc(p.name_en)}"
            required>


          <label class="adm-l">
            السعر (د.أ)
          </label>

          <input
            class="auth-field"
            id="adm-price"
            type="number"
            step="0.01"
            value="${p.price}"
            required>


          <label class="adm-l">
            الفئة
          </label>

          <select
            class="auth-field adm-select-spaced"
            id="adm-cat"
            onchange="admUI.handleCategoryChange()">

            <option value="">
              -- اختر فئة --
            </option>

            ${catList.map(([k,v])=>`
              <option
                value="${k}"
                ${p.category===k?"selected":""}>
                ${v.ar} (${v.en})
              </option>
            `).join("")}

            <option
              value="__new__"
              class="adm-new-option">
              ✚ أضف فئة جديدة
            </option>

          </select>


          <label class="adm-l">
            الفوائد (${(p.benefits||[]).length})
          </label>

          <select
            class="auth-field adm-select-spaced-sm"
            id="adm-ben-select"
            onchange="admUI.handleBenefitChange()">

            <option value="">
              -- اختر فائدة --
            </option>

            ${benList.map(([k,v])=>`
              <option value="${k}">
                ${v.ar} (${v.en})
              </option>
            `).join("")}

            <option
              value="__new__"
              class="adm-new-option">
              ✚ أضف فائدة جديدة
            </option>

          </select>


          <div
            id="adm-benefits"
            class="adm-tag-list"
            data-keys='${JSON.stringify(p.benefits||[])}'>

            ${(p.benefits||[]).length===0
      ?`<p class="adm-tag-empty">ما في فوائد</p>`
      :(p.benefits||[]).map(k=>`
                <div
                  class="adm-tag adm-tag-benefit"
                  data-key="${k}">

                  <span>
                    ${ADM.benefits[k]
          ?ADM.benefits[k].ar
          :k}
                  </span>

                  <button
                    type="button"
                    onclick="admUI.removeBenefit('${k}')"
                    class="adm-tag-remove">
                    ✕
                  </button>

                </div>
              `).join("")}

          </div>


          <label class="adm-l">
            المكوّنات (${(p.ingredients||[]).length})
          </label>

          <select
            class="auth-field adm-select-spaced-sm"
            id="adm-ing-select"
            onchange="admUI.handleIngredientChange()">

            <option value="">
              -- اختر مكوّن --
            </option>

            ${ingList.map(([k,v])=>`
              <option value="${k}">
                ${v.ar} (${v.en})
              </option>
            `).join("")}

            <option
              value="__new__"
              class="adm-new-option">
              ✚ أضف مكوّن جديد
            </option>

          </select>


          <div
            id="adm-ingredients"
            class="adm-tag-list"
            data-keys='${JSON.stringify(p.ingredients||[])}'>

            ${(p.ingredients||[]).length===0
      ?`<p class="adm-tag-empty">ما في مكونات</p>`
      :(p.ingredients||[]).map(k=>`
                <div
                  class="adm-tag adm-tag-ingredient"
                  data-key="${k}">

                  <span>
                    ${ADM.ingredients[k]
          ?ADM.ingredients[k].ar
          :k}
                  </span>

                  <button
                    type="button"
                    onclick="admUI.removeIngredient('${k}')"
                    class="adm-tag-remove">
                    ✕
                  </button>

                </div>
              `).join("")}

          </div>


          <label class="adm-l">

            <input
              type="checkbox"
              id="adm-active"
              ${p.active?"checked":""}>

            نشط

          </label>


          <button
            class="auth-submit adm-save-btn"
            ${ADM.busy?"disabled":""}
            onclick="admUI.save('${p.id}')">

            ${ADM.busy?"جاري…":"💾 حفظ"}

          </button>

        </div>

      </div>

    </div>`;
}


/* =========================================================
   CERTIFICATION FORM
========================================================= */

function admCertLogoHtml(){
  const logo=ADM.certLogo;

  return `
    <div class="adm-cert-strip" id="adm-cert-logo">

      ${logo
      ?`
          <div class="adm-cert-thumb">
            <img src="${logo.type==="url"?admEsc(logo.url):logo.previewUrl}">
            <button
              type="button"
              class="adm-cert-thumb-x"
              onclick="admUI.removeCertLogo()">
              ✕
            </button>
          </div>
        `
      :`
          <label class="adm-cert-add">
            + شعار
            <input
              type="file"
              accept="image/*"
              onchange="admUI.setCertLogo(this)">
          </label>
        `}

    </div>`;
}

function admCertPdfsHtml(){
  return `
    <div class="adm-cert-pdf-list" id="adm-cert-pdfs">

      ${ADM.certPdfs.map((p,i)=>`
        <div class="adm-cert-pdf-row">
          <span class="adm-cert-pdf-ic">📄</span>
          <input
            class="auth-field adm-cert-pdf-label"
            value="${admEsc(p.label)}"
            placeholder="اسم الملف (مثلاً: الشهادة، الملحق)"
            oninput="admUI.setCertPdfLabel(${i},this.value)">
          <button
            type="button"
            class="adm-cert-thumb-x"
            onclick="admUI.removeCertPdf(${i})">
            ✕
          </button>
        </div>
      `).join("")}

      <label class="adm-cert-add-pdf">
        + أضف ملف PDF
        <input
          type="file"
          accept="application/pdf"
          multiple
          onchange="admUI.addCertPdfs(this)">
      </label>

    </div>`;
}

function admCertFormHtml(c){
  const isNew=!c;

  c=c||{
    id:"",
    name_ar:"",
    name_en:"",
    issuer:"",
    details_ar:[],
    details_en:[],
    sort_order:(ADM.certifications.length+1)*10,
    active:true
  };

  return `
    <div
      class="adm-overlay"
      onclick="if(event.target===this)admUI.closeForm()">

      <div class="adm-modal">

        <div class="adm-modal-head">

          <b>
            ${isNew?"شهادة جديدة":"تعديل شهادة"}
          </b>

          <button
            class="auth-x"
            onclick="admUI.closeForm()">
            ✕
          </button>

        </div>


        <div class="adm-modal-body">

          ${ADM.err
      ?`<div class="auth-err">${admEsc(ADM.err)}</div>`
      :""}


          <label class="adm-l">
            شعار الشهادة (بادج صغير يظهر بالفوتر)
          </label>

          ${admCertLogoHtml()}


          <label class="adm-l">
            ملفات PDF (الشهادة الكاملة، تظهر بصفحة الشهادات)
          </label>

          ${admCertPdfsHtml()}


          <label class="adm-l">
            اسم الشهادة بالعربي
          </label>

          <input
            class="auth-field"
            id="adm-cert-name-ar"
            value="${admEsc(c.name_ar)}"
            required>


          <label class="adm-l">
            Certificate name in English
          </label>

          <input
            class="auth-field"
            id="adm-cert-name-en"
            value="${admEsc(c.name_en)}"
            required>


          <label class="adm-l">
            الجهة المانحة (Issuer)
          </label>

          <input
            class="auth-field"
            id="adm-cert-issuer"
            value="${admEsc(c.issuer)}"
            required>


          <label class="adm-l">
            التفاصيل بالعربي (سطر لكل نقطة)
          </label>

          <textarea
            class="auth-field adm-cert-textarea"
            id="adm-cert-details-ar"
            rows="4">${admEsc((c.details_ar||[]).join("\n"))}</textarea>


          <label class="adm-l">
            Details in English (one point per line)
          </label>

          <textarea
            class="auth-field adm-cert-textarea"
            id="adm-cert-details-en"
            rows="4">${admEsc((c.details_en||[]).join("\n"))}</textarea>


          <label class="adm-l">
            ترتيب الظهور
          </label>

          <input
            class="auth-field"
            type="number"
            id="adm-cert-sort"
            value="${c.sort_order}">


          <label class="adm-l">

            <input
              type="checkbox"
              id="adm-cert-active"
              ${c.active?"checked":""}>

            نشط (تظهر بالفوتر)

          </label>


          <button
            class="auth-submit adm-save-btn"
            ${ADM.busy?"disabled":""}
            onclick="admUI.saveCertification('${c.id}')">

            ${ADM.busy?"جاري…":"💾 حفظ"}

          </button>

        </div>

      </div>

    </div>`;
}


/* =========================================================
   INGREDIENT FORM
========================================================= */

function admIngredientImgHtml(){
  const img=ADM.ingredientImg;

  return `
    <div class="adm-cert-strip" id="adm-ing-img">

      ${img
      ?`
          <div class="adm-cert-thumb">
            <img src="${img.type==="url"?admEsc(img.url):img.previewUrl}">
            <button
              type="button"
              class="adm-cert-thumb-x"
              onclick="admUI.removeIngredientImg()">
              ✕
            </button>
          </div>
        `
      :`
          <label class="adm-cert-add">
            + صورة
            <input
              type="file"
              accept="image/*"
              onchange="admUI.setIngredientImg(this)">
          </label>
        `}

    </div>`;
}

function admIngredientFormHtml(r){
  const isNew=!r;

  r=r||{
    key:"",
    ar:"",
    en:"",
    scientific_name:"",
    common_names_ar:"",
    common_names_en:"",
    family_ar:"",
    family_en:"",
    parts_used_ar:"",
    parts_used_en:"",
    desc_ar:"",
    desc_en:"",
    benefits_ar:[],
    benefits_en:[]
  };

  return `
    <div
      class="adm-overlay"
      onclick="if(event.target===this)admUI.closeForm()">

      <div class="adm-modal">

        <div class="adm-modal-head">

          <b>
            ${isNew?"مكوّن جديد":"تعديل مكوّن"}
          </b>

          <button
            class="auth-x"
            onclick="admUI.closeForm()">
            ✕
          </button>

        </div>


        <div class="adm-modal-body">

          ${ADM.err
      ?`<div class="auth-err">${admEsc(ADM.err)}</div>`
      :""}


          <label class="adm-l">صورة المكوّن</label>

          ${admIngredientImgHtml()}


          <label class="adm-l">الاسم بالعربي</label>
          <input class="auth-field" id="adm-ing-ar" value="${admEsc(r.ar)}" required>

          <label class="adm-l">Name in English</label>
          <input class="auth-field" id="adm-ing-en" value="${admEsc(r.en)}" required>

          <label class="adm-l">الاسم العلمي (Scientific name)</label>
          <input class="auth-field" id="adm-ing-sci" value="${admEsc(r.scientific_name||"")}" placeholder="مثلاً: Withania somnifera">

          <label class="adm-l">أسماء شائعة أخرى بالعربي (اختياري)</label>
          <input class="auth-field" id="adm-ing-common-ar" value="${admEsc(r.common_names_ar||"")}">

          <label class="adm-l">Common names in English</label>
          <input class="auth-field" id="adm-ing-common-en" value="${admEsc(r.common_names_en||"")}">

          <label class="adm-l">الفصيلة بالعربي</label>
          <input class="auth-field" id="adm-ing-fam-ar" value="${admEsc(r.family_ar||"")}">

          <label class="adm-l">Family (English)</label>
          <input class="auth-field" id="adm-ing-fam-en" value="${admEsc(r.family_en||"")}">

          <label class="adm-l">الجزء المستخدم بالعربي</label>
          <input class="auth-field" id="adm-ing-parts-ar" value="${admEsc(r.parts_used_ar||"")}" placeholder="مثلاً: الجذور">

          <label class="adm-l">Parts used (English)</label>
          <input class="auth-field" id="adm-ing-parts-en" value="${admEsc(r.parts_used_en||"")}" placeholder="e.g. Roots">

          <label class="adm-l">وصف المكوّن بالعربي</label>
          <textarea class="auth-field adm-cert-textarea" id="adm-ing-desc-ar" rows="3">${admEsc(r.desc_ar||"")}</textarea>

          <label class="adm-l">Description (English)</label>
          <textarea class="auth-field adm-cert-textarea" id="adm-ing-desc-en" rows="3">${admEsc(r.desc_en||"")}</textarea>

          <label class="adm-l">فوائد المكوّن بالعربي (سطر لكل فائدة)</label>
          <textarea class="auth-field adm-cert-textarea" id="adm-ing-ben-ar" rows="3">${admEsc((r.benefits_ar||[]).join("\n"))}</textarea>

          <label class="adm-l">Benefits (English, one per line)</label>
          <textarea class="auth-field adm-cert-textarea" id="adm-ing-ben-en" rows="3">${admEsc((r.benefits_en||[]).join("\n"))}</textarea>


          <button
            class="auth-submit adm-save-btn"
            ${ADM.busy?"disabled":""}
            onclick="admUI.saveIngredient('${r.key}')">
            ${ADM.busy?"جاري…":"💾 حفظ"}
          </button>

        </div>

      </div>

    </div>`;
}


/* =========================================================
   POPUP / TAGS
========================================================= */

function showPopup(title,callback){
  const html=`
    <div
      class="adm-overlay adm-popup-overlay"
      onclick="if(event.target===this)admUI.closePopup()">

      <div class="adm-modal adm-modal-sm">

        <div class="adm-modal-head">

          <b>${title}</b>

          <button
            class="auth-x"
            onclick="admUI.closePopup()">
            ✕
          </button>

        </div>

        <div class="adm-modal-body">

          <label class="adm-l">
            بالعربي
          </label>

          <input
            class="auth-field adm-popup-input"
            id="popup-input-ar"
            placeholder="مثال: نعناع">


          <label class="adm-l">
            In English
          </label>

          <input
            class="auth-field adm-popup-input adm-popup-input-last"
            id="popup-input-en"
            placeholder="e.g. Mint">


          <button
            class="auth-submit adm-save-btn"
            onclick="admUI.submitPopup('${callback}')">

            إضافة

          </button>

        </div>

      </div>

    </div>`;

  const layer=document.createElement("div");

  layer.id="adm-popup-layer";
  layer.innerHTML=html;

  document.body.appendChild(layer);

  document
      .getElementById("popup-input-ar")
      ?.focus();
}

function refreshTagDiv(divId,keyLabelMap){
  const div=document.getElementById(divId);
  if(!div) return;

  const keys=JSON.parse(
      div.dataset.keys||"[]"
  );

  const isBenefit=
      divId==="adm-benefits";

  div.innerHTML=keys.length===0
      ?`<p class="adm-tag-empty">
        ${isBenefit?"ما في فوائد":"ما في مكونات"}
      </p>`
      :keys.map(k=>`
      <div
        class="adm-tag ${isBenefit?"adm-tag-benefit":"adm-tag-ingredient"}"
        data-key="${k}">

        <span>
          ${keyLabelMap[k]
          ?keyLabelMap[k].ar
          :k}
        </span>

        <button
          type="button"
          class="adm-tag-remove"
          onclick="admUI.${isBenefit?"removeBenefit":"removeIngredient"}('${k}')">

          ✕

        </button>

      </div>
    `).join("");
}


/* =========================================================
   ACTIONS
========================================================= */

/* If a write fails with an RLS/permission error, the session token
   may be momentarily stale (e.g. mid auto-refresh). Refresh once and
   retry the same operation before giving up. */
async function admWriteWithRetry(fn){
  const first=await fn();

  if(
      first.error&&
      (first.error.code==="42501"||first.error.status===403)
  ){
    await sb.auth.refreshSession();
    return await fn();
  }

  return first;
}


window.admUI={

  newProduct(){
    ADM.err="";
    ADM.prodGallery=[];

    document.getElementById("adm-modal-root").innerHTML=
        admFormHtml(null);
  },

  edit(id){
    ADM.err="";

    const p=ADM.products.find(
        x=>x.id===id
    );

    ADM.prodGallery=(p?.gallery||[]).map(
        g=>({type:"url",url:g.url,label:g.label||""})
    );

    document.getElementById("adm-modal-root").innerHTML=
        admFormHtml(p);
  },

  closeForm(){
    document.getElementById("adm-modal-root").innerHTML="";
  },

  closePopup(){
    document.getElementById("adm-popup-layer")?.remove();
  },

  previewImg(input){
    const f=input.files[0];
    if(!f) return;

    const url=URL.createObjectURL(f);

    document.getElementById("adm-img-prev").innerHTML=
        `<img src="${url}" class="adm-preview-image">`;
  },

  previewCardImg(input){
    const f=input.files[0];
    if(!f) return;

    const url=URL.createObjectURL(f);

    document.getElementById("adm-cardimg-prev").innerHTML=
        `<img src="${url}" class="adm-preview-image">`;
  },

  addGalleryImages(input){
    const files=Array.from(input.files||[]);

    files.forEach(file=>{
      ADM.prodGallery.push({
        type:"file",
        file,
        previewUrl:URL.createObjectURL(file),
        label:""
      });
    });

    const strip=document.getElementById("adm-gallery");
    if(strip){
      strip.outerHTML=admProdGalleryHtml();
    }
  },

  setGalleryLabel(i,value){
    if(ADM.prodGallery[i]){
      ADM.prodGallery[i].label=value;
    }
  },

  removeGalleryImage(i){
    ADM.prodGallery.splice(i,1);

    const strip=document.getElementById("adm-gallery");
    if(strip){
      strip.outerHTML=admProdGalleryHtml();
    }
  },


  /* CATEGORY */

  handleCategoryChange(){
    const select=document.getElementById("adm-cat");

    if(select.value==="__new__"){
      select.value="";
      showPopup(
          "أضف فئة جديدة",
          "addCategoryPopup"
      );
    }
  },

  async addCategoryPopup(ar,en){
    const key=slugify(en||ar);
    if(!key) return;

    const {error}=await sb
        .from("category_labels")
        .upsert({
          key,
          ar,
          en,
          icon:"🌿"
        });

    if(error){
      alert("خطأ: "+error.message);
      return;
    }

    ADM.categories[key]={
      ar,
      en,
      icon:"🌿"
    };

    const select=document.getElementById("adm-cat");

    if(select){
      select.innerHTML=
          `<option value="">-- اختر فئة --</option>`+

          Object.entries(ADM.categories)
              .map(([k,v])=>`
            <option
              value="${k}"
              ${k===key?"selected":""}>
              ${v.ar} (${v.en})
            </option>
          `)
              .join("")+

          `<option
          value="__new__"
          class="adm-new-option">
          ✚ أضف فئة جديدة
        </option>`;
    }

    admUI.closePopup();
  },


  /* BENEFITS */

  handleBenefitChange(){
    const select=document.getElementById("adm-ben-select");
    const val=select.value;

    if(!val) return;

    if(val==="__new__"){
      select.value="";
      showPopup(
          "أضف فائدة جديدة",
          "addBenefitPopup"
      );
      return;
    }

    const div=document.getElementById("adm-benefits");

    const keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    if(!keys.includes(val)){
      keys.push(val);
      div.dataset.keys=JSON.stringify(keys);

      refreshTagDiv(
          "adm-benefits",
          ADM.benefits
      );
    }

    select.value="";
  },

  async addBenefitPopup(ar,en){
    const key=slugify(en||ar);
    if(!key) return;

    const {error}=await sb
        .from("benefit_labels")
        .upsert({
          key,
          ar,
          en
        });

    if(error){
      alert("خطأ: "+error.message);
      return;
    }

    ADM.benefits[key]={ar,en};

    const div=document.getElementById("adm-benefits");

    const keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    if(!keys.includes(key)){
      keys.push(key);
    }

    div.dataset.keys=JSON.stringify(keys);

    refreshTagDiv(
        "adm-benefits",
        ADM.benefits
    );

    const select=document.getElementById("adm-ben-select");

    if(select){
      const opt=document.createElement("option");

      opt.value=key;
      opt.textContent=`${ar} (${en})`;

      select.insertBefore(
          opt,
          select.querySelector(
              "option[value='__new__']"
          )
      );
    }

    admUI.closePopup();
  },

  removeBenefit(key){
    const div=document.getElementById("adm-benefits");

    let keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    keys=keys.filter(
        k=>k!==key
    );

    div.dataset.keys=JSON.stringify(keys);

    refreshTagDiv(
        "adm-benefits",
        ADM.benefits
    );
  },


  /* INGREDIENTS */

  handleIngredientChange(){
    const select=document.getElementById("adm-ing-select");
    const val=select.value;

    if(!val) return;

    if(val==="__new__"){
      select.value="";
      showPopup(
          "أضف مكوّن جديد",
          "addIngredientPopup"
      );
      return;
    }

    const div=document.getElementById("adm-ingredients");

    const keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    if(!keys.includes(val)){
      keys.push(val);
      div.dataset.keys=JSON.stringify(keys);

      refreshTagDiv(
          "adm-ingredients",
          ADM.ingredients
      );
    }

    select.value="";
  },

  async addIngredientPopup(ar,en){
    const key=slugify(en||ar);
    if(!key) return;

    const {error}=await sb
        .from("ingredient_labels")
        .upsert({
          key,
          ar,
          en
        });

    if(error){
      alert("خطأ: "+error.message);
      return;
    }

    ADM.ingredients[key]={ar,en};

    if(!ADM.ingredientRows.some(r=>r.key===key)){
      ADM.ingredientRows.push({
        key,ar,en,
        scientific_name:null,
        common_names_ar:null,
        common_names_en:null,
        family_ar:null,
        family_en:null,
        parts_used_ar:null,
        parts_used_en:null,
        desc_ar:null,
        desc_en:null,
        benefits_ar:[],
        benefits_en:[],
        image_url:null
      });
    }

    const div=document.getElementById("adm-ingredients");

    const keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    if(!keys.includes(key)){
      keys.push(key);
    }

    div.dataset.keys=JSON.stringify(keys);

    refreshTagDiv(
        "adm-ingredients",
        ADM.ingredients
    );

    const select=document.getElementById("adm-ing-select");

    if(select){
      const opt=document.createElement("option");

      opt.value=key;
      opt.textContent=`${ar} (${en})`;

      select.insertBefore(
          opt,
          select.querySelector(
              "option[value='__new__']"
          )
      );
    }

    admUI.closePopup();
  },

  async deleteIngredient(key){
    const usedBy=ADM.products.filter(
        p=>(p.ingredients||[]).includes(key)
    );

    const warn=usedBy.length
        ?`\n\nتنبيه: هاد المكوّن مستخدم بـ ${usedBy.length} منتج، وبضل اسمه ظاهر فيهم كنص خام بعد الحذف.`
        :"";

    if(!confirm("متأكد إنك بدك تحذف هاد المكوّن نهائياً؟"+warn)) return;

    const {error}=await admWriteWithRetry(()=>
        sb.from("ingredient_labels").delete().eq("key",key)
    );

    if(error){
      alert("تعذر حذف المكوّن: "+error.message);
      return;
    }

    delete ADM.ingredients[key];
    ADM.ingredientRows=ADM.ingredientRows.filter(r=>r.key!==key);
    admRender();
  },

  removeIngredient(key){
    const div=document.getElementById("adm-ingredients");

    let keys=JSON.parse(
        div.dataset.keys||"[]"
    );

    keys=keys.filter(
        k=>k!==key
    );

    div.dataset.keys=JSON.stringify(keys);

    refreshTagDiv(
        "adm-ingredients",
        ADM.ingredients
    );
  },


  submitPopup(callback){
    const ar=document
        .getElementById("popup-input-ar")
        .value
        .trim();

    const en=document
        .getElementById("popup-input-en")
        .value
        .trim();

    if(!ar||!en){
      alert("عبّي الاسم بالعربي والإنجليزي");
      return;
    }

    if(admUI[callback]){
      admUI[callback](ar,en);
    }
  },


  /* NAV */

  switchTab(tab){
    ADM.tab=tab;
    ADM.search="";
    ADM.err="";
    admRender();
  },

  search(v){
    ADM.search=v;
    admRender();

    const i=document.querySelector(
        ".crm-search input"
    );

    if(i){
      i.focus();
      i.setSelectionRange(
          i.value.length,
          i.value.length
      );
    }
  },


  /* CUSTOMER */

  async openCustomer(id){
    ADM.selectedCustomer=id;

    await admLoadCustomerDetail(id);

    const root=document.getElementById(
        "adm-modal-root"
    );

    if(root){
      root.innerHTML=admCustomerDetailHtml(id);
    }
  },

  async addNote(id){
    const el=document.getElementById(
        "crm-note-input"
    );

    const note=el?.value.trim();

    if(!note) return;

    const {error}=await sb
        .from("customer_notes")
        .insert({
          customer_id:id,
          author_id:window.AUTH.user.id,
          note
        });

    if(error){
      alert(
          "تعذر إضافة الملاحظة: "+
          error.message
      );
      return;
    }

    await admLoadCustomerDetail(id);

    document.getElementById(
        "adm-modal-root"
    ).innerHTML=
        admCustomerDetailHtml(id);
  },


  /* LOYALTY ADMIN */

  async adjustPoints(id,mode){
    if(window.AUTH.profile?.role!=="admin"){
      alert("هذه العملية متاحة للأدمن فقط");
      return;
    }

    const amountEl=document.getElementById(
        "crm-points-amount"
    );

    const reasonEl=document.getElementById(
        "crm-points-reason"
    );

    const amount=parseInt(
        amountEl?.value,
        10
    );

    const reason=
        reasonEl?.value.trim();

    if(!Number.isInteger(amount)||amount<=0){
      alert("أدخل عدد نقاط صحيح أكبر من صفر");
      return;
    }

    if(!reason){
      alert("سبب التعديل مطلوب");
      return;
    }

    const points=
        mode==="deduct"
            ?-amount
            :amount;

    const {data,error}=await sb.rpc(
        "admin_adjust_loyalty",
        {
          p_user_id:id,
          p_points:points,
          p_reason:reason
        }
    );

    if(error){
      alert(
          "تعذر تعديل النقاط: "+
          error.message
      );
      return;
    }

    const result=
        Array.isArray(data)
            ?data[0]
            :data;

    alert(
        `تم تحديث الرصيد بنجاح. الرصيد الحالي: ${result?.new_balance??"—"} نقطة`
    );

    await admLoad();
    await admLoadCustomerDetail(id);

    const root=document.getElementById(
        "adm-modal-root"
    );

    if(root){
      root.innerHTML=
          admCustomerDetailHtml(id);
    }
  },

  async resetPoints(id){
    if(window.AUTH.profile?.role!=="admin"){
      alert("هذه العملية متاحة للأدمن فقط");
      return;
    }

    const reasonEl=document.getElementById(
        "crm-points-reason"
    );

    const reason=
        reasonEl?.value.trim();

    if(!reason){
      alert("اكتب سبب التصفير أولاً");
      return;
    }

    if(!confirm(
        "متأكد من تصفير الرصيد الحالي لهذا العميل؟ سيبقى السجل التاريخي محفوظاً."
    )){
      return;
    }

    const {data,error}=await sb.rpc(
        "admin_reset_loyalty",
        {
          p_user_id:id,
          p_reason:reason
        }
    );

    if(error){
      alert(
          "تعذر تصفير النقاط: "+
          error.message
      );
      return;
    }

    const result=
        Array.isArray(data)
            ?data[0]
            :data;

    alert(
        `تم تصفير الرصيد. الرصيد السابق: ${result?.previous_balance??"—"} نقطة`
    );

    await admLoad();
    await admLoadCustomerDetail(id);

    const root=document.getElementById(
        "adm-modal-root"
    );

    if(root){
      root.innerHTML=
          admCustomerDetailHtml(id);
    }
  },


  /* ORDER */

  async setOrderStatus(id,status){
    const o=ADM.orders.find(
        x=>x.id===id
    );

    const prev=o?.status;

    if(o){
      o.status=status;
    }

    const {error}=await sb
        .from("orders")
        .update({status})
        .eq("id",id);

    if(error){
      if(o){
        o.status=prev;
      }

      alert(
          "خطأ بتحديث الحالة: "+
          error.message
      );

      admRender();
      return;
    }

    await admLoad();
  },


  /* PRODUCT */

  async remove(id){
    if(!confirm("متأكد؟")) return;

    const {error}=await admWriteWithRetry(()=>
        sb
            .from("products")
            .delete()
            .eq("id",id)
    );

    if(error){
      alert(
          "تعذر حذف المنتج: "+
          error.message
      );
      return;
    }

    await admLoad();

    document.dispatchEvent(
        new CustomEvent(
            "products-changed"
        )
    );
  },

  async save(existingId){
    ADM.busy=true;
    ADM.err="";

    try{
      const name_ar=document
          .getElementById("adm-name-ar")
          .value
          .trim();

      const name_en=document
          .getElementById("adm-name-en")
          .value
          .trim();

      const price=parseFloat(
          document
              .getElementById("adm-price")
              .value
      );

      const category=document
          .getElementById("adm-cat")
          .value;

      const active=document
          .getElementById("adm-active")
          .checked;

      const benefits=JSON.parse(
          document
              .getElementById("adm-benefits")
              .dataset.keys||"[]"
      );

      const ingredients=JSON.parse(
          document
              .getElementById("adm-ingredients")
              .dataset.keys||"[]"
      );

      if(
          !name_ar||
          !name_en||
          isNaN(price)||
          !category
      ){
        throw new Error(
            "عبّي كل الحقول المطلوبة"
        );
      }

      let id=existingId;

      if(!id){
        id=
            slugify(name_en||name_ar)+
            "_"+
            Date.now()
                .toString(36)
                .slice(-4);
      }

      let image_url=
          ADM.products.find(
              p=>p.id===existingId
          )?.image_url||null;

      const file=document
          .getElementById("adm-img-file")
          .files[0];

      if(file){
        const path=
            `${id}-${Date.now()}.${file.name.split(".").pop()}`;

        const {error:upErr}=await sb.storage
            .from("product-images")
            .upload(
                path,
                file,
                {upsert:true}
            );

        if(upErr){
          throw upErr;
        }

        const {data:pub}=sb.storage
            .from("product-images")
            .getPublicUrl(path);

        image_url=pub.publicUrl;
      }

      let card_image_url=
          ADM.products.find(
              p=>p.id===existingId
          )?.card_image_url||null;

      const cardFile=document
          .getElementById("adm-cardimg-file")
          .files[0];

      if(cardFile){
        const cardPath=
            `${id}-card-${Date.now()}.${cardFile.name.split(".").pop()}`;

        const {error:cardUpErr}=await sb.storage
            .from("product-images")
            .upload(
                cardPath,
                cardFile,
                {upsert:true}
            );

        if(cardUpErr){
          throw cardUpErr;
        }

        const {data:cardPub}=sb.storage
            .from("product-images")
            .getPublicUrl(cardPath);

        card_image_url=cardPub.publicUrl;
      }

      const badge_text=
          document
              .getElementById("adm-badge-text")
              .value
              .trim()||null;

      const gallery=[];

      for(let i=0;i<ADM.prodGallery.length;i++){
        const g=ADM.prodGallery[i];

        if(g.type==="url"){
          gallery.push({label:g.label,url:g.url});
          continue;
        }

        const gPath=
            `${id}-gallery-${Date.now()}-${i}.${g.file.name.split(".").pop()}`;

        const {error:gUpErr}=await sb.storage
            .from("product-images")
            .upload(
                gPath,
                g.file,
                {upsert:true}
            );

        if(gUpErr){
          throw gUpErr;
        }

        const {data:gPub}=sb.storage
            .from("product-images")
            .getPublicUrl(gPath);

        gallery.push({label:g.label,url:gPub.publicUrl});
      }

      const row={
        id,
        name_ar,
        name_en,
        price,
        category,
        benefits,
        ingredients,
        image_url,
        card_image_url,
        badge_text,
        gallery,
        active
      };

      const {error}=await admWriteWithRetry(()=>
          sb
              .from("products")
              .upsert(row)
      );

      if(error){
        throw error;
      }

      ADM.busy=false;

      admUI.closeForm();

      await admLoad();

      document.dispatchEvent(
          new CustomEvent(
              "products-changed"
          )
      );

    }catch(err){
      console.error("save error:",err);

      ADM.busy=false;

      ADM.err=
          "خطأ بالحفظ: "+
          err.message;

      alert(ADM.err);
    }
  },


  /* CERTIFICATIONS */

  newCertification(){
    ADM.err="";
    ADM.certLogo=null;
    ADM.certPdfs=[];

    document.getElementById("adm-modal-root").innerHTML=
        admCertFormHtml(null);
  },

  editCertification(id){
    ADM.err="";

    const c=ADM.certifications.find(
        x=>x.id===id
    );

    ADM.certLogo=c?.logo_url
        ?{type:"url",url:c.logo_url}
        :null;

    ADM.certPdfs=(c?.pdfs||[]).map(
        p=>({type:"url",url:p.url,label:p.label||""})
    );

    document.getElementById("adm-modal-root").innerHTML=
        admCertFormHtml(c);
  },

  setCertLogo(input){
    const file=input.files?.[0];
    if(!file) return;

    ADM.certLogo={
      type:"file",
      file,
      previewUrl:URL.createObjectURL(file)
    };

    const strip=document.getElementById("adm-cert-logo");
    if(strip){
      strip.outerHTML=admCertLogoHtml();
    }
  },

  removeCertLogo(){
    ADM.certLogo=null;

    const strip=document.getElementById("adm-cert-logo");
    if(strip){
      strip.outerHTML=admCertLogoHtml();
    }
  },

  addCertPdfs(input){
    const files=Array.from(input.files||[]);

    files.forEach(file=>{
      ADM.certPdfs.push({
        type:"file",
        file,
        label:file.name.replace(/\.pdf$/i,"")
      });
    });

    const list=document.getElementById("adm-cert-pdfs");
    if(list){
      list.outerHTML=admCertPdfsHtml();
    }
  },

  setCertPdfLabel(i,value){
    if(ADM.certPdfs[i]){
      ADM.certPdfs[i].label=value;
    }
  },

  removeCertPdf(i){
    ADM.certPdfs.splice(i,1);

    const list=document.getElementById("adm-cert-pdfs");
    if(list){
      list.outerHTML=admCertPdfsHtml();
    }
  },

  async removeCertification(id){
    if(!confirm("متأكد إنك بدك تحذف هاي الشهادة؟")) return;

    const {error}=await admWriteWithRetry(()=>
        sb
            .from("certifications")
            .delete()
            .eq("id",id)
    );

    if(error){
      alert(
          "تعذر حذف الشهادة: "+
          error.message
      );
      return;
    }

    await admLoad();
  },

  /* INGREDIENTS */

  newIngredient(){
    ADM.err="";
    ADM.ingredientImg=null;

    document.getElementById("adm-modal-root").innerHTML=
        admIngredientFormHtml(null);
  },

  editIngredient(key){
    ADM.err="";

    const r=ADM.ingredientRows.find(
        x=>x.key===key
    );

    ADM.ingredientImg=r?.image_url
        ?{type:"url",url:r.image_url}
        :null;

    document.getElementById("adm-modal-root").innerHTML=
        admIngredientFormHtml(r);
  },

  setIngredientImg(input){
    const file=input.files?.[0];
    if(!file) return;

    ADM.ingredientImg={
      type:"file",
      file,
      previewUrl:URL.createObjectURL(file)
    };

    const strip=document.getElementById("adm-ing-img");
    if(strip){
      strip.outerHTML=admIngredientImgHtml();
    }
  },

  removeIngredientImg(){
    ADM.ingredientImg=null;

    const strip=document.getElementById("adm-ing-img");
    if(strip){
      strip.outerHTML=admIngredientImgHtml();
    }
  },

  async saveIngredient(existingKey){
    ADM.busy=true;
    ADM.err="";

    try{
      const ar=document.getElementById("adm-ing-ar").value.trim();
      const en=document.getElementById("adm-ing-en").value.trim();

      if(!ar||!en){
        throw new Error("عبّي الاسم بالعربي والإنجليزي");
      }

      const key=existingKey||slugify(en);

      let image_url=null;

      if(ADM.ingredientImg){
        if(ADM.ingredientImg.type==="url"){
          image_url=ADM.ingredientImg.url;
        }else{
          const ext=ADM.ingredientImg.file.name.split(".").pop();
          const path=`ingredient-${key}-${Date.now()}.${ext}`;

          const {error:upErr}=await sb.storage
              .from("product-images")
              .upload(path,ADM.ingredientImg.file,{upsert:true});

          if(upErr) throw upErr;

          const {data:pub}=sb.storage
              .from("product-images")
              .getPublicUrl(path);

          image_url=pub.publicUrl;
        }
      }

      const row={
        key,
        ar,
        en,
        scientific_name:document.getElementById("adm-ing-sci").value.trim()||null,
        common_names_ar:document.getElementById("adm-ing-common-ar").value.trim()||null,
        common_names_en:document.getElementById("adm-ing-common-en").value.trim()||null,
        family_ar:document.getElementById("adm-ing-fam-ar").value.trim()||null,
        family_en:document.getElementById("adm-ing-fam-en").value.trim()||null,
        parts_used_ar:document.getElementById("adm-ing-parts-ar").value.trim()||null,
        parts_used_en:document.getElementById("adm-ing-parts-en").value.trim()||null,
        desc_ar:document.getElementById("adm-ing-desc-ar").value.trim()||null,
        desc_en:document.getElementById("adm-ing-desc-en").value.trim()||null,
        benefits_ar:document.getElementById("adm-ing-ben-ar").value.split("\n").map(l=>l.trim()).filter(Boolean),
        benefits_en:document.getElementById("adm-ing-ben-en").value.split("\n").map(l=>l.trim()).filter(Boolean),
        image_url
      };

      const {error}=await admWriteWithRetry(()=>
          sb.from("ingredient_labels").upsert(row)
      );

      if(error) throw error;

      ADM.busy=false;
      admUI.closeForm();
      await admLoadLabels();
      admRender();

    }catch(err){
      console.error("save ingredient error:",err);
      ADM.busy=false;
      ADM.err="خطأ بالحفظ: "+err.message;
      alert(ADM.err);
    }
  },


  async saveCertification(existingId){
    ADM.busy=true;
    ADM.err="";

    try{
      const name_ar=document
          .getElementById("adm-cert-name-ar")
          .value
          .trim();

      const name_en=document
          .getElementById("adm-cert-name-en")
          .value
          .trim();

      const issuer=document
          .getElementById("adm-cert-issuer")
          .value
          .trim();

      const details_ar=document
          .getElementById("adm-cert-details-ar")
          .value
          .split("\n")
          .map(l=>l.trim())
          .filter(Boolean);

      const details_en=document
          .getElementById("adm-cert-details-en")
          .value
          .split("\n")
          .map(l=>l.trim())
          .filter(Boolean);

      const sort_order=parseInt(
          document
              .getElementById("adm-cert-sort")
              .value,
          10
      )||0;

      const active=document
          .getElementById("adm-cert-active")
          .checked;

      if(!name_ar||!name_en||!issuer){
        throw new Error(
            "عبّي كل الحقول المطلوبة"
        );
      }

      let id=existingId;

      if(!id){
        id=
            slugify(name_en||name_ar)+
            "_"+
            Date.now()
                .toString(36)
                .slice(-4);
      }

      let logo_url=null;

      if(ADM.certLogo){
        if(ADM.certLogo.type==="url"){
          logo_url=ADM.certLogo.url;
        }else{
          const ext=ADM.certLogo.file.name.split(".").pop();
          const path=`${id}-logo-${Date.now()}.${ext}`;

          const {error:upErr}=await sb.storage
              .from("certification-images")
              .upload(
                  path,
                  ADM.certLogo.file,
                  {upsert:true}
              );

          if(upErr){
            throw upErr;
          }

          const {data:pub}=sb.storage
              .from("certification-images")
              .getPublicUrl(path);

          logo_url=pub.publicUrl;
        }
      }

      const pdfs=[];

      for(let i=0;i<ADM.certPdfs.length;i++){
        const p=ADM.certPdfs[i];

        if(p.type==="url"){
          pdfs.push({label:p.label,url:p.url});
          continue;
        }

        const path=`${id}-doc-${Date.now()}-${i}.pdf`;

        const {error:upErr}=await sb.storage
            .from("certification-images")
            .upload(
                path,
                p.file,
                {upsert:true,contentType:"application/pdf"}
            );

        if(upErr){
          throw upErr;
        }

        const {data:pub}=sb.storage
            .from("certification-images")
            .getPublicUrl(path);

        pdfs.push({label:p.label,url:pub.publicUrl});
      }

      const row={
        id,
        name_ar,
        name_en,
        issuer,
        details_ar,
        details_en,
        logo_url,
        pdfs,
        sort_order,
        active
      };

      const {error}=await admWriteWithRetry(()=>
          sb
              .from("certifications")
              .upsert(row)
      );

      if(error){
        throw error;
      }

      ADM.busy=false;

      admUI.closeForm();

      await admLoad();

    }catch(err){
      console.error("save certification error:",err);

      ADM.busy=false;

      ADM.err=
          "خطأ بالحفظ: "+
          err.message;

      alert(ADM.err);
    }
  }
};


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "auth-changed",
    ()=>{
      const modalOpen=
          document.getElementById("adm-modal-root")?.innerHTML;

      if(modalOpen) return;

      if(admGate()){
        admLoad();
      }
    }
);

window.addEventListener(
    "load",
    ()=>{
      if(admGate()){
        admLoad();
      }
    }
);