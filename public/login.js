const $ = (s) => document.querySelector(s);
$("#showPassword").onclick = () => { const p = $("#pw"), on = p.type === "password"; p.type = on ? "text" : "password"; $("#showPassword").setAttribute("aria-pressed", String(on)); };
$("#lf").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("#go"), er = $("#lerr"), u = $("#un").value, pw = $("#pw").value;
  b.disabled = true; er.textContent = "";
  try {
    const r = await fetch("/go", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u }) });
    const j = await r.json();
    if (!r.ok) { er.textContent = j.error || "登入失败"; b.disabled = false; return; }
    // 密码由浏览器直接提交到该品牌自己的后台，不经过总汇
    const f = document.createElement("form");
    f.method = "POST"; f.action = j.url + "/login-form";
    for (const [k, v] of [["username", u], ["password", pw]]) { const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; f.appendChild(i); }
    document.body.appendChild(f); f.submit();
  } catch (x) { er.textContent = "网络错误，请重试"; b.disabled = false; }
};
