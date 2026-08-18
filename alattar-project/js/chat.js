/* Al-Attar — chat.js  (webhook already configured) */
const CHAT_CFG = {
webhook: "https://karreem.app.n8n.cloud/webhook/attar-chat",
  timeoutMs: 30000
};

function chatSession(){
  let s=null;
  try{s=localStorage.getItem("attar_sid");}catch(e){}
  if(!s){s="web_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);try{localStorage.setItem("attar_sid",s);}catch(e){}}
  return s;
}
const CH={open:false,busy:false,log:[],sid:chatSession(),lang:function(){return (typeof S!=="undefined"&&S.lang)?S.lang:(function(){try{return localStorage.getItem("attar_lang")||"ar";}catch(e){return "ar";}})();}};
const CHT={
ar:{fab:"اسأل العطّار",title:"مستشار الأعشاب",online:"متصل الآن",
hello:"أهلاً بك 🌿 احكِ لي شو بتشعر فيه — مثلاً «معدتي منفوخة بعد الأكل» أو «ما بقدر أنام» — وبقترح عليك الخلطة المناسبة وطريقة تحضيرها.",
ph:"اكتب ما تشعر به…",note:"معلومات عامة وليست نصيحة طبية. للأعراض الشديدة أو المستمرة راجع الطبيب.",
chips:["انتفاخ وغازات","ما بقدر أنام","رشح والتهاب حلق","تعب وقلة نشاط"],
err:"صار خلل بالاتصال، جرّب مرة ثانية بعد لحظات.",add:"أضف"},
en:{fab:"Ask Al-Attar",title:"Herbal advisor",online:"Online now",
hello:"Welcome 🌿 Tell me how you're feeling — for example \"bloated after meals\" or \"I can't sleep\" — and I'll suggest a suitable blend and how to prepare it.",
ph:"Describe how you feel…",note:"General information, not medical advice. For severe or persistent symptoms, see a doctor.",
chips:["Bloating & gas","Can't sleep","Cold & sore throat","Low energy"],
err:"Connection problem — please try again in a moment.",add:"Add"}};
const cht=()=>CHT[CH.lang()];
async function chatAsk(text){
  const ctrl=new AbortController();
  const to=setTimeout(()=>ctrl.abort(),CHAT_CFG.timeoutMs);
  try{
    const res=await fetch(CHAT_CFG.webhook,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,
      body:JSON.stringify({message:text,sessionId:CH.sid,lang:CH.lang(),source:"website"})});
    clearTimeout(to);
    if(!res.ok)throw new Error("HTTP "+res.status);
    let d=await res.json();
    if(Array.isArray(d))d=d[0]||{};
    if(typeof d==="string"){try{d=JSON.parse(d);}catch(e){d={reply:d};}}
    if(d.output)d=(typeof d.output==="string")?safeParse(d.output):d.output;
    if(d.text&&!d.reply)d.reply=d.text;
    return {reply:d.reply||d.message||"",product_ids:d.product_ids||[],prep:d.prep||"",caution:d.caution||""};
  }catch(e){
    clearTimeout(to);console.error("chat error:",e);
    return {reply:cht().err,product_ids:[],caution:""};
  }
}
function safeParse(s){
  try{return JSON.parse(s);}catch(e){
    const m=s.match(/\{[\s\S]*\}/);
    if(m){try{return JSON.parse(m[0]);}catch(e2){}}
    return {reply:s};
  }
}
function chatProductCard(id){
  const p=(typeof P!=="undefined")?P.find(x=>x.id===id):null;
  if(!p)return "";
  const L=CH.lang();
  const ic=(typeof CATS!=="undefined")?CATS[p.cat].ic:"🌿";
  const img=p.img?`<img src="${(typeof IMGDIR!=="undefined"?IMGDIR:"assets/img/")+p.img}.jpg" onerror="this.outerHTML='${ic}'">`:ic;
  const price=(typeof fmt==="function")?fmt(p.pr):p.pr;
  return `<div class="chat-card"><div class="cim">${img}</div>
  <div class="cnm"><b>${L==="ar"?p.ar:p.en}</b><span>${L==="ar"?p.ba:p.be} · ${price}</span></div>
  <button class="cadd" onclick="chat.add('${p.id}')">${cht().add}</button></div>`;
}
function chatRender(){
  const T=cht();
  const root=document.getElementById("chat-root");
  if(!root)return;
  if(!CH.open){root.innerHTML=`<button class="chat-fab" onclick="chat.toggle()"><span class="dot"></span>${T.fab}</button>`;return;}
  const body=CH.log.map(m=>{
    if(m.role==="me")return `<div class="msg me">${escHtml(m.text)}</div>`;
    let h=`<div class="msg bot">${escHtml(m.text)}</div>`;
    if(m.prep)h+=`<div class="msg bot" style="font-size:12.5px;color:#5c6b5f">🫖 ${escHtml(m.prep)}</div>`;
    if(m.ids&&m.ids.length)h+=`<div class="chat-cards">${m.ids.map(chatProductCard).join("")}</div>`;
    if(m.caution)h+=`<div class="msg warn">⚠ ${escHtml(m.caution)}</div>`;
    return h;
  }).join("");
  root.innerHTML=`
  <div class="chat-panel">
    <div class="chat-head"><div class="av">🌿</div>
      <div class="ttl"><b>${T.title}</b><span><i></i>${T.online}</span></div>
      <button class="chat-x" onclick="chat.toggle()">✕</button></div>
    <div class="chat-log" id="chat-log">${body}${CH.busy?`<div class="typing"><i></i><i></i><i></i></div>`:""}</div>
    ${CH.log.length<=1?`<div class="chat-chips">${T.chips.map(c=>`<button class="chat-chip" onclick="chat.quick('${c.replace(/'/g,"\\'")}')">${c}</button>`).join("")}</div>`:""}
    <div class="chat-foot"><div class="chat-inrow">
      <textarea class="chat-in" id="chat-in" rows="1" placeholder="${T.ph}" oninput="chat.grow(this)" onkeydown="chat.key(event)"></textarea>
      <button class="chat-send" onclick="chat.send()" ${CH.busy?"disabled":""}>➤</button>
    </div><div class="chat-note">${T.note}</div></div>
  </div>`;
  const lg=document.getElementById("chat-log");
  if(lg)lg.scrollTop=lg.scrollHeight;
}
function escHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
window.chat={
toggle(){CH.open=!CH.open;if(CH.open&&CH.log.length===0)CH.log.push({role:"bot",text:cht().hello});chatRender();if(CH.open)setTimeout(()=>{const i=document.getElementById("chat-in");if(i)i.focus();},80);},
grow(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight,90)+"px";},
key(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chat.send();}},
quick(txt){const i=document.getElementById("chat-in");if(i)i.value=txt;chat.send();},
async send(){
  const el=document.getElementById("chat-in");
  if(!el||CH.busy)return;
  const text=el.value.trim();
  if(!text)return;
  el.value="";el.style.height="auto";
  CH.log.push({role:"me",text});
  CH.busy=true;chatRender();
  const r=await chatAsk(text);
  CH.busy=false;
  CH.log.push({role:"bot",text:r.reply,ids:r.product_ids,prep:r.prep,caution:r.caution});
  chatRender();
},
add(id){if(typeof app!=="undefined"&&app.inc)app.inc(id);chatRender();}
};
(function(){
  const d=document.createElement("div");
  d.id="chat-root";
  document.body.appendChild(d);
  chatRender();
  const mo=new MutationObserver(()=>{if(!document.getElementById("chat-root")){document.body.appendChild(d);chatRender();}});
  mo.observe(document.body,{childList:true});
})();