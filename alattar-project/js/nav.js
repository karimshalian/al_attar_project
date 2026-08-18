/* Al-Attar — nav.js : shared header + footer for the content pages */
const NAV={
  ar:{ann:"توصيل سريع ومجاني للطلبات فوق 15 د.أ",annLink:"كم يستغرق وصول طلبي؟",shop:"المتجر",learn:"تعرّف",purpose:"رسالتنا",rewards:"المكافآت",locator:"فروعنا",search:"ابحث",
    shopMenu:[["index.html","🍵","شاي أخضر"],["index.html","🫖","شاي فاخر"],["index.html","🌿","أعشاب"],["index.html","⚕️","خلطات مساعدة"],["index.html","🌸","زهورات"],["index.html","🍎","مشروبات فواكه"],["index.html","🎁","باقات 6×"]],
    learnMenu:[["lab-quality.html","🔬","الجودة والفحص المخبري"],["brewing.html","🫖","طريقة التحضير"]],
    purposeMenu:[["about.html","🌿","من نحن"],["certifications.html","🏆","الشهادات والجوائز"]],
    foot:"© العطّار ٢٠٢٦ · جميع الحقوق محفوظة",fabout:"من نحن",flab:"الجودة",fbrew:"التحضير",fcert:"الشهادات"},
  en:{ann:"FAST & FREE DELIVERY OVER 15 JD",annLink:"HOW FAST WILL I RECEIVE MY ORDER?",shop:"SHOP",learn:"LEARN",purpose:"PURPOSE",rewards:"REWARDS",locator:"STORE LOCATOR",search:"Search",
    shopMenu:[["index.html","🍵","Green Tea"],["index.html","🫖","Premium Tea"],["index.html","🌿","Herbs"],["index.html","⚕️","Support Blends"],["index.html","🌸","Zhourat"],["index.html","🍎","Fruit Infusions"],["index.html","🎁","6-Packs"]],
    learnMenu:[["lab-quality.html","🔬","Lab Testing & Quality"],["brewing.html","🫖","How to Brew"]],
    purposeMenu:[["about.html","🌿","About Us"],["certifications.html","🏆","Certifications & Awards"]],
    foot:"© Al-Attar 2026 · All rights reserved",fabout:"About",flab:"Quality",fbrew:"Brewing",fcert:"Certifications"}};
function navLang(){try{return localStorage.getItem("attar_lang")||"ar";}catch(e){return "ar";}}
function navMenu(items){return `<div class="dropdown">${items.map(([h,i,t])=>`<a href="${h}"><span class="di">${i}</span>${t}</a>`).join("")}</div>`;}
function renderShell(){
  const L=navLang(),T=NAV[L];
  document.documentElement.setAttribute("dir",L==="ar"?"rtl":"ltr");
  document.documentElement.setAttribute("lang",L);
  const hdr=document.getElementById("site-header");
  if(hdr)hdr.innerHTML=`
<div class="announce">${T.ann}<a href="#">${T.annLink}</a></div>
<header class="topbar"><div class="topbar-in">
<nav class="mainnav">
<div class="navitem"><button>${T.shop}<span class="car">▼</span></button>${navMenu(T.shopMenu)}</div>
<div class="navitem"><button>${T.learn}<span class="car">▼</span></button>${navMenu(T.learnMenu)}</div>
<div class="navitem"><button>${T.purpose}<span class="car">▼</span></button>${navMenu(T.purposeMenu)}</div>
</nav>
<a class="logo" href="index.html"><img src="assets/img/logo.png" alt="Al-Attar" onerror="this.outerHTML='<span class=&quot;mark&quot;>ع</span>'"></a>
<div class="top-right">
<div class="searchwrap"><span class="si">⌕</span><input class="search-box" placeholder="${T.search}"></div>
<a class="toplink" href="#">${T.rewards}</a>
<a class="toplink" href="#">${T.locator}</a>
<a class="toplink" href="#" onclick="navToggleLang();return false">${L==="ar"?"EN":"عربي"}</a>
<button class="accounticon${window.AUTH&&window.AUTH.user?" logged-in":""}" onclick="authUI.open()" aria-label="account">👤</button>
<a class="carticon" href="index.html" aria-label="cart">🛒</a>
</div></div></header>`;
  const ft=document.getElementById("site-footer");
  if(ft)ft.innerHTML=`<footer>${window.SKIP_FOOTER_CERTS?"":certsRowHtml()}<div class="flinks"><a href="about.html">${T.fabout}</a><a href="lab-quality.html">${T.flab}</a><a href="brewing.html">${T.fbrew}</a><a href="certifications.html">${T.fcert}</a></div>${T.foot}</footer>`;
}
function navToggleLang(){const n=navLang()==="ar"?"en":"ar";try{localStorage.setItem("attar_lang",n);}catch(e){}renderShell();}
renderShell();
document.addEventListener("auth-changed",renderShell);
if(!window.__attarScrollShrinkBound){
  window.__attarScrollShrinkBound = true;
  (function(){
    function onScroll(){
      // Recompute and re-apply on every tick — no reliance on a "last state"
      // memory, so it can never get stuck out of sync with the real scroll position.
      document.body.classList.toggle("scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  })();
}