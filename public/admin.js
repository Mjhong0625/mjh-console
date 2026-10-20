const $=s=>document.querySelector(s),app=$("#app");
const api=async(m,p,b)=>{const r=await fetch("/api/"+p,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});if(r.status===401&&p!=="login"){login();throw 0}const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ago=t=>{if(!t)return"—";const s=(Date.now()-new Date(t).getTime())/1000;return s<3600?Math.max(1,Math.round(s/60))+" 分钟前":s<86400?Math.round(s/3600)+" 小时前":Math.round(s/86400)+" 天前"};
function login(){app.innerHTML=`<form class="login"><h1>MJH 总汇</h1><input type="password" id="pw" placeholder="密码" autofocus><button class="pri">登入</button><div class="mu" id="er"></div></form>`;
 $("form").onsubmit=async e=>{e.preventDefault();try{await api("POST","login",{password:$("#pw").value});load()}catch(x){$("#er").textContent=x.message||""}}}
async function load(){
 app.innerHTML=`<div class="bar"><h1>MJH 总汇</h1><div><button id="ad">＋ 添加品牌</button> <button id="rf">刷新</button> <button id="lo">登出</button></div></div><div id="body"><div class="mu" id="ld">读取中…</div></div>`;
 $("#lo").onclick=async()=>{await api("POST","logout");login()};$("#rf").onclick=load;
 $("#ad").onclick=()=>{$("#body").insertAdjacentHTML("afterbegin",`<div class="card" style="margin-bottom:12px"><form class="form" id="f"><input name="name" placeholder="品牌名" required><input name="url" placeholder="后台网址 如 brand-telegrambot.mjhco.com" required><input name="key" placeholder="PLATFORM_KEY（≥16位）" required><input name="note" placeholder="备注（可选）"><button class="pri">保存</button></form></div>`);
  $("#f").onsubmit=async e=>{e.preventDefault();try{await api("POST","brands",Object.fromEntries(new FormData(e.target)));load()}catch(x){alert(x.message)}}};
 let list;try{list=await api("GET","overview")}catch(e){return}
 const ok=list.filter(b=>b.status==="ok"),sum=f=>ok.reduce((a,b)=>a+(f(b.data)||0),0);
 const rows=list.map(b=>{const d=b.data||{},u=d.users||{},p=d.posts||{},c=d.clicks||{};const st=b.status==="ok"?(d.bot&&d.bot.ready?["ok","在线"]:["warn","机器人离线"]):["bad",b.error];
  return `<tr><td><b>${esc(b.name)}</b>${d.demo?' <span class="mu">示范</span>':""}<div class="mu">${esc(b.note)}</div></td><td><span class="dot ${st[0]}"></span>${esc(st[1])}</td>
  <td class="n">${b.status==="ok"?u.total:"—"}</td><td class="n">${b.status==="ok"?u.active7:"—"}</td><td class="n">${b.status==="ok"?u.new24h:"—"}</td><td class="n">${b.status==="ok"?p.sent7:"—"}</td><td class="n">${b.status==="ok"?c.clicks7:"—"}</td>
  <td>${b.status==="ok"?ago(p.lastSentAt):"—"}</td><td class="n">${b.status==="ok"&&p.failed?'<span style="color:var(--bad)">'+p.failed+"</span>":b.status==="ok"?0:"—"}</td><td class="mu">${esc(d.version||"")}</td>
  <td><a href="${esc(b.url)}" target="_blank" rel="noopener">打开后台</a> <button class="x" data-del="${b.id}" title="移除">✕</button></td></tr>`}).join("");
 $("#body").className="";$("#ld")&&$("#ld").remove();$("#body").insertAdjacentHTML("beforeend",`<div class="tot"><div><b>${list.length}</b><span class="mu">品牌</span></div><div><b>${sum(d=>d.users.total)}</b><span class="mu">用户合计</span></div><div><b>${sum(d=>d.users.active7)}</b><span class="mu">7天活跃</span></div><div><b>${sum(d=>d.clicks.clicks7)}</b><span class="mu">7天点击</span></div></div>
 <div class="card"><table><thead><tr><th>品牌</th><th>状态</th><th class="n">用户</th><th class="n">7天活跃</th><th class="n">24h新增</th><th class="n">7天发文</th><th class="n">7天点击</th><th>最近发文</th><th class="n">失败</th><th>版本</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="11" class="mu">还没有品牌，点右上「添加品牌」</td></tr>'}</tbody></table></div>`);
 document.querySelectorAll("[data-del]").forEach(x=>x.onclick=async()=>{if(confirm("从总汇移除此品牌？（不会影响品牌本身）")){await api("DELETE","brands/"+x.dataset.del);load()}});}
api("GET","brands").then(load).catch(()=>login());
