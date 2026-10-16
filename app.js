/* GR INFRA TYRE CARE - frontend. No secrets here: only the public Supabase URL + anon key (config.js).
   Real security is enforced by database policies (supabase/schema.sql), not by this file. */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CFG = window.GRTC_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
let sb = LIVE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
let DEFECTS = [], lang = localStorage.getItem("grtc_lang") || "en";
let ME = { id: "demo-user", name: "Demo User", role: "site_engineer", site_id: "S1" };

/* ---------- translations (UI labels only; ITTAC defect text stays in the manual's English) ---------- */
const TX = {
  hi: { home: "होम", library: "दोष संदर्भ", finder: "लक्षण से खोजें", inspect: "टायर निरीक्षण", actions: "कार्रवाई", cost: "टायर लागत व जीवन", dash: "डैशबोर्ड",
    search: "नाम, कोड या लक्षण खोजें", save: "सेव करें", draft: "ड्राफ्ट सेव करें", appearance: "दिखावट", causes: "संभावित कारण", tyre: "टायर", vehicle: "वाहन", driver: "ड्राइवर", operation: "संचालन", page: "मूल पृष्ठ",
    saved: "सेव हो गया ✔", required: "ज़रूरी जानकारी भरें", critical: "सुरक्षा-गंभीर: उपयोग रोकें और सक्षम व्यक्ति से जाँच कराएँ", login: "लॉगिन", logout: "लॉगआउट" }
};
const t = (k, en) => (lang === "hi" && TX.hi[k]) || en;

/* ---------- data layer: Supabase when configured, otherwise browser-only DEMO storage ---------- */
const store = {
  async list(tb) {
    if (LIVE) { const { data, error } = await sb.from(tb).select("*").order("created_at", { ascending: false }); if (error) throw error; return data; }
    return JSON.parse(localStorage.getItem("grtc_" + tb) || "[]");
  },
  async insert(tb, row) {
    if (LIVE) { const { data, error } = await sb.from(tb).insert(row).select().single(); if (error) throw error; return data; }
    const all = await this.list(tb); row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }; all.unshift(row);
    localStorage.setItem("grtc_" + tb, JSON.stringify(all)); return row;
  },
  async update(tb, id, patch) {
    if (LIVE) { const { data, error } = await sb.from(tb).update(patch).eq("id", id).select().single(); if (error) throw error; return data; }
    const all = await this.list(tb); const r = all.find((x) => x.id === id); Object.assign(r, patch);
    localStorage.setItem("grtc_" + tb, JSON.stringify(all)); return r;
  },
  async uploadPhoto(file, siteId) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Only JPG / PNG / WEBP photos are allowed");
    if (file.size > 5 * 1024 * 1024) throw new Error("Photo is larger than 5 MB");
    if (!LIVE) return "demo-only:" + file.name; // demo mode does not keep image files
    const path = `${siteId}/${ME.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await sb.storage.from("inspection-photos").upload(path, file, { contentType: file.type });
    if (error) throw error; return path;
  },
};

/* ---------- helpers ---------- */
function toast(msg, err) { const e = $("#toast"); e.textContent = msg; e.className = err ? "err" : ""; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => (e.style.display = "none"), 4500); }
const fmt = (n, d = 2) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: d }));
const byCode = (c) => DEFECTS.find((d) => d.code === c);
// PROPOSAL (needs GR Infra approval): a defect is "safety-critical" for screening if the ITTAC Tyre action says to remove/replace it
// or to consult the manufacturer. This only prompts competent assessment; it never declares anything safe.
const isCritical = (d) => /remove|replace|consult/i.test(d.tyre_action);
const SYMPTOMS = [
  ["Bulge / swelling", /bulge/i], ["Cut / injury", /\bcut|injur|score|scoring/i], ["Cracks", /crack/i], ["Separation / peeling", /separat|detach|unwrap/i],
  ["Uneven / irregular wear", /wear|worn|feather|sink|spot/i], ["Rubber pieces missing", /chip|chunk|flak|missing/i], ["Burst", /burst/i],
  ["Heat damage / scorching", /heat|burn|scorch/i], ["Bead area damage", /bead/i], ["Rim contact / rim damage", /\brim\b/i], ["Valve / tube problem", /valve|splice|tube/i], ["Chemical / oil damage", /chemical|oil/i],
];
const AREAS = ["Tread", "Sidewall", "Bead", "Carcass", "Tubes", "Flaps"];
const TYPE_LABEL = (c) => (c.startsWith("TBB") ? "TBB (bias truck/bus)" : c.startsWith("TBR") ? "TBR (radial truck/bus)" : c.startsWith("T ") ? "Tube" : "Flap");

/* ---------- shell ---------- */
const VIEWS = { library, finder, inspect, actions, tyres, dash };
const NAV = [["library", "📖", "library", "Defect Reference"], ["finder", "👁️", "finder", "Find by Symptom"], ["inspect", "📝", "inspect", "Tyre Inspection"],
  ["actions", "✅", "actions", "Actions"], ["tyres", "💰", "cost", "Tyre Cost & Life"], ["dash", "📊", "dash", "Dashboard"]];
const ROLE_VIEWS = { helper_driver: ["library", "finder", "inspect", "actions"], inspector: ["library", "finder", "inspect", "actions", "tyres"],
  site_engineer: Object.keys(VIEWS), pe_manager: Object.keys(VIEWS), central_admin: Object.keys(VIEWS), senior_mgmt: ["library", "finder", "dash", "actions", "tyres"] };
const ROLES = { helper_driver: "Helper / Driver", inspector: "Mechanic / Inspector", site_engineer: "Site P&E Engineer", pe_manager: "P&E Manager", central_admin: "Central P&E Administrator", senior_mgmt: "Senior Management" };
const canWrite = (what) => ({ inspect: ["helper_driver", "inspector", "site_engineer", "pe_manager", "central_admin"], actions: ["site_engineer", "pe_manager", "central_admin"], tyres: ["inspector", "site_engineer", "pe_manager", "central_admin"] }[what] || []).includes(ME.role);

function home() {
  const ok = ROLE_VIEWS[ME.role];
  $("#app").innerHTML = `<nav>${NAV.filter((n) => ok.includes(n[0])).map((n) => `<button data-go="${n[0]}"><span>${n[1]}</span>${esc(t(n[2], n[3]))}</button>`).join("")}</nav>
  <main><div class="banner info">ITTAC defect text is shown as published (First Edition, May 2014). It is a reference guide, not a safety clearance. For final determination of a failure, consult the tyre manufacturer.</div></main>`;
  document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
}
function go(v) { $("#app").innerHTML = `<main><p>Loading…</p></main>`; VIEWS[v]().catch((e) => { $("#app").innerHTML = `<main><div class="banner crit">Could not load: ${esc(e.message)}</div></main>`; }); window.scrollTo(0, 0); }
function renderMode() {
  $("#modeBanner").innerHTML = LIVE ? "" : `<div class="banner warn" style="margin:0;border-radius:0">DEMO MODE — records are stored only in this browser and are NOT shared across devices. Role selector below is a preview only; real access control needs the Supabase setup (docs/SETUP.md).
  &nbsp; Role preview: <select id="roleSel" style="width:auto;display:inline">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === ME.role ? "selected" : ""}>${v}</option>`).join("")}</select></div>`;
  const rs = $("#roleSel"); if (rs) rs.onchange = () => { ME.role = rs.value; home(); };
}

/* ---------- 1. defect library ---------- */
function defectCard(d, open) {
  const crit = isCritical(d);
  return `<div class="card"><details ${open ? "open" : ""}><summary><span class="tag">${esc(d.code)}</span>${esc(d.name)} ${crit ? '<span class="tag amber">Assess before further use</span>' : ""}</summary>
  <p><span class="tag">${esc(d.area)}</span><span class="tag">${esc(TYPE_LABEL(d.code))}</span><span class="tag">${esc(t("page", "Source page"))} ${d.page}</span></p>
  <dl><dt>${t("appearance", "Appearance")}</dt><dd>${esc(d.appearance)}</dd><dt>${t("causes", "Possible causes")}</dt><dd>${esc(d.possible_causes)}</dd>
  <dt>${t("tyre", "Tyre action")}</dt><dd>${esc(d.tyre_action)}</dd><dt>${t("vehicle", "Vehicle action")}</dt><dd>${esc(d.vehicle_action)}</dd>
  <dt>${t("driver", "Driver action")}</dt><dd>${esc(d.driver_action)}</dd><dt>${t("operation", "Operation-related action")}</dt><dd>${esc(d.operation_action)}</dd></dl>
  <figure style="margin:10px 0"><img loading="lazy" alt="ITTAC reference photograph: ${esc(d.name)}" style="width:100%;max-width:820px;border-radius:10px;border:1px solid var(--line)" src="${esc((window.GRTC_IMGS && window.GRTC_IMGS[d.code]) || "img/" + d.code.replace(" ", "_") + ".jpg")}"><figcaption><small>Photograph: ITTAC Tyre Condition Analysis Guide (Commercial Tyres), 1st Ed., May 2014, page ${d.page}. © Indian Tyre Technical Advisory Committee; used with permission.</small></figcaption></figure>
  <p><button class="btn sm alt" data-manual="${d.page}">Open manual page ${d.page}</button> <small class="missing">Listed causes are <i>possible</i> causes, not confirmed root causes. Final determination: consult the tyre manufacturer.</small></p>
  </details></div>`;
}
async function library() {
  let area = "", q = "";
  const draw = () => {
    const ql = q.toLowerCase();
    const r = DEFECTS.filter((d) => (!area || d.area === area) && (!ql || [d.name, d.code, d.appearance, d.possible_causes].join(" ").toLowerCase().includes(ql)));
    $("#res").innerHTML = `<p>${r.length} of ${DEFECTS.length}</p>` + r.map((d) => defectCard(d)).join("");
  };
  $("#app").innerHTML = `<main><h2>📖 ${t("library", "Tyre Defect Reference")}</h2><div class="card"><label>Location of your copy of the ITTAC manual PDF (web link, or file path on this computer/shared drive)</label><input id="mp" placeholder="e.g. C:\\Docs\\ITTAC_MANUAL.pdf or https://..." value="${esc(localStorage.getItem("grtc_manual") || "")}"><small>Saved on this device only. Used by the "Open manual page" buttons.</small></div><div class="card"><input id="q" type="search" placeholder="${esc(t("search", "Search name, ITTAC code or symptom"))}" aria-label="search">
   <div class="chips" style="margin-top:10px"><button class="chip on" data-a="">All</button>${AREAS.map((a) => `<button class="chip" data-a="${a}">${a}</button>`).join("")}</div></div><div id="res"></div></main>`;
  $("#q").oninput = (e) => { q = e.target.value; draw(); };
  document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => { area = b.dataset.a; document.querySelectorAll("[data-a]").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
  draw();
}
async function finder() {
  const sel = new Set();
  const draw = () => {
    const r = sel.size ? DEFECTS.filter((d) => [...sel].some((i) => SYMPTOMS[i][1].test(d.appearance))) : [];
    $("#res").innerHTML = sel.size ? `<div class="banner info">${r.length} possible matches, matched on the manual's "Appearance" text. Confirm by comparing with the full entry; consult the tyre manufacturer for final determination.</div>` + r.map((d) => defectCard(d)).join("") : "";
  };
  $("#app").innerHTML = `<main><h2>👁️ ${t("finder", "What do you see?")}</h2><div class="card"><div class="chips">${SYMPTOMS.map((s, i) => `<button class="chip" data-s="${i}">${s[0]}</button>`).join("")}</div></div><div id="res"></div></main>`;
  document.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => { const i = +b.dataset.s; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle("on"); draw(); }));
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-manual]"); if (!b) return;
  let u = (localStorage.getItem("grtc_manual") || "").trim();
  if (!u) return toast("Enter the location of your copy of the manual at the top of the Defect Reference page first", true);
  if (/^[A-Za-z]:[\\/]/.test(u)) u = "file:///" + u.replace(/\\/g, "/");
  window.open(encodeURI(u).replace(/%25/g, "%") + "#page=" + b.dataset.manual, "_blank", "noopener");
});
document.addEventListener("input", (e) => { if (e.target.id === "mp") localStorage.setItem("grtc_manual", e.target.value); });

/* ---------- 2. inspection ---------- */
const POSITIONS = ["Front Left", "Front Right", "Rear Left Outer", "Rear Left Inner", "Rear Right Outer", "Rear Right Inner", "Spare", "Other"];
async function sitesList() { return LIVE ? (await sb.from("sites").select("id,name")).data || [] : [{ id: "S1", name: "Demo Site A" }, { id: "S2", name: "Demo Site B" }]; }
async function inspect() {
  if (!canWrite("inspect")) return ($("#app").innerHTML = `<main><div class="banner warn">Your role cannot create inspections.</div></main>`);
  const sites = await sitesList(); const now = new Date(); const local = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  $("#app").innerHTML = `<main><h2>📝 ${t("inspect", "Tyre Inspection")}</h2><form id="f" class="card" novalidate>
  <div class="grid">
   <div><label>Project</label><input name="project" placeholder="e.g. project name"></div>
   <div><label>Site *</label><select name="site_id">${sites.map((s) => `<option value="${esc(s.id)}" ${s.id === ME.site_id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
   <div><label>Vehicle number *</label><input name="vehicle_no" autocapitalize="characters"></div>
   <div><label>Equipment type</label><select name="equipment_type"><option>Dumper / Tipper</option><option>Truck / Trailer</option><option>Transit Mixer</option><option>Loader / Excavator</option><option>Bus / Light vehicle</option><option>Other</option></select></div>
   <div><label>Tyre serial number (if available)</label><input name="tyre_serial"></div>
   <div><label>Tyre position *</label><select name="tyre_position">${POSITIONS.map((p) => `<option>${p}</option>`).join("")}</select></div>
   <div><label>Axle</label><select name="axle"><option>Front</option><option>Rear 1</option><option>Rear 2</option><option>Rear 3</option><option>Trailer</option><option>Spare</option></select></div>
   <div><label>Date & time *</label><input type="datetime-local" name="inspected_at" value="${local}"></div>
   <div><label>Odometer (km)</label><input type="number" min="0" step="any" name="odometer_km" inputmode="decimal"></div>
   <div><label>Operating hours</label><input type="number" min="0" step="any" name="operating_hours" inputmode="decimal"></div>
   <div><label>Tread depth</label><div style="display:flex;gap:6px"><input type="number" min="0" step="any" name="tread_depth" inputmode="decimal"><select name="tread_unit" style="width:90px"><option>mm</option><option>32nd in</option></select></div></div>
   <div><label>Inflation pressure</label><div style="display:flex;gap:6px"><input type="number" min="0" step="any" name="pressure" inputmode="decimal"><select name="pressure_unit" style="width:90px"><option>psi</option><option>bar</option><option>kPa</option></select></div></div>
   <div><label>Defect area</label><select name="defect_area"><option value="">— no defect seen —</option>${AREAS.map((a) => `<option>${a}</option>`).join("")}</select></div>
   <div><label>Defect (ITTAC code)</label><select name="defect_code"><option value="">—</option></select></div>
  </div>
  <div id="critBox"></div>
  <label>Photographs (JPG/PNG/WEBP, max 5 MB each)</label><input type="file" name="photos" accept="image/*" capture="environment" multiple>
  <label>Notes</label><textarea name="notes" rows="2"></textarea>
  <fieldset class="card"><legend><b>Corrective action (if a defect was found)</b></legend><div class="grid">
   <div><label>Priority</label><select name="priority"><option value="">—</option><option>critical</option><option>high</option><option selected>medium</option><option>low</option></select></div>
   <div><label>Action owner (name)</label><input name="owner_name"></div>
   <div><label>Due date</label><input type="date" name="due_date"></div></div>
   <label>Corrective action</label><textarea name="corrective_action" rows="2"></textarea></fieldset>
  <p><button class="btn" type="submit">✔ ${t("save", "Save inspection")}</button> <button class="btn alt" type="button" id="draftBtn">${t("draft", "Save draft")}</button></p></form></main>`;
  const f = $("#f"), area = f.defect_area, code = f.defect_code;
  area.onchange = () => { code.innerHTML = `<option value="">—</option>` + DEFECTS.filter((d) => d.area === area.value).map((d) => `<option value="${esc(d.code)}">${esc(d.code)} — ${esc(d.name)}</option>`).join(""); crit(); };
  const crit = () => { const d = byCode(code.value); $("#critBox").innerHTML = d && isCritical(d) ? `<div class="banner crit">⚠ ${esc(t("critical", "SAFETY-CRITICAL SCREENING: ITTAC action is “" + d.tyre_action + "”. Keep the tyre out of service until a competent person has assessed it. This app never declares a damaged tyre safe."))}</div>` : ""; };
  code.onchange = crit;
  const save = async (status) => {
    const v = Object.fromEntries(new FormData(f)); const errs = [];
    if (!v.vehicle_no.trim()) errs.push("Vehicle number is required");
    if (status === "submitted") {
      if (!v.inspected_at) errs.push("Date & time is required");
      if (v.defect_code && !v.corrective_action.trim()) errs.push("Describe the corrective action for the defect");
      if (v.defect_code && !v.due_date) errs.push("Choose a due date for the corrective action");
      if (v.defect_code && !v.owner_name.trim()) errs.push("Enter the action owner");
    }
    if (errs.length) return toast(t("required", "Please fix: ") + errs.join("; "), true);
    try {
      const files = [...f.photos.files]; const paths = []; for (const fl of files) paths.push(await store.uploadPhoto(fl, v.site_id));
      const d = byCode(v.defect_code); const num = (x) => (x === "" ? null : Number(x));
      const row = { status, project: v.project, site_id: v.site_id, vehicle_no: v.vehicle_no.trim().toUpperCase(), equipment_type: v.equipment_type, tyre_serial: v.tyre_serial, tyre_position: v.tyre_position, axle: v.axle,
        inspected_at: new Date(v.inspected_at || Date.now()).toISOString(), odometer_km: num(v.odometer_km), operating_hours: num(v.operating_hours), tread_depth: num(v.tread_depth), tread_unit: v.tread_unit, pressure: num(v.pressure), pressure_unit: v.pressure_unit,
        defect_area: v.defect_area || null, defect_code: v.defect_code || null, defect_name: d ? d.name : null, safety_critical: !!(d && isCritical(d)), notes: v.notes, photo_paths: paths };
      if (!LIVE) row.inspector_id = ME.id; if (!LIVE) row.inspector_name = ME.name;
      const ins = await store.insert("inspections", row);
      if (status === "submitted" && d && canWrite("actions") ) {
        await store.insert("actions", { inspection_id: ins.id, site_id: v.site_id, priority: v.priority || "medium", corrective_action: v.corrective_action, owner_name: v.owner_name, due_date: v.due_date });
      } else if (status === "submitted" && d) { toast("Inspection saved. Your role cannot create actions — a Site Engineer will assign one.", false); return home(); }
      toast(`${t("saved", "Saved ✔")} (${status === "draft" ? "draft" : "inspection"} ${ins.id.slice(0, 8)})`); home();
    } catch (e) { toast("Could not save: " + e.message, true); }
  };
  f.onsubmit = (e) => { e.preventDefault(); save("submitted"); }; $("#draftBtn").onclick = () => save("draft");
}

/* ---------- 3. actions ---------- */
async function actions() {
  const [acts, insp] = await Promise.all([store.list("actions"), store.list("inspections")]);
  const repeats = Calc.findRepeatDefects(insp); const im = Object.fromEntries(insp.map((i) => [i.id, i]));
  const rows = acts.map((a) => ({ a, i: im[a.inspection_id] || {}, s: Calc.actionStatus(a) }));
  const pill = (s) => ({ open: '<span class="tag">Open</span>', overdue: '<span class="tag red">Overdue</span>', closed_unverified: '<span class="tag amber">Closed – awaiting verification</span>', closed_verified: '<span class="tag green">Closed & verified</span>' }[s]);
  $("#app").innerHTML = `<main><h2>✅ ${t("actions", "Defect actions")}</h2>${rows.length ? "" : '<div class="card">No actions yet.</div>'}` + rows.map(({ a, i, s }) => `<div class="card">
   ${pill(s)} <span class="tag ${a.priority === "critical" ? "red" : ""}">${esc(a.priority)}</span>${i.safety_critical ? '<span class="tag red">Safety-critical screening</span>' : ""}${repeats.has(a.inspection_id) ? '<span class="tag amber">REPEAT DEFECT</span>' : ""}
   <p><b>${esc(i.vehicle_no)}</b> • ${esc(i.tyre_position)} • ${esc(i.defect_code || "")} ${esc(i.defect_name || "")}</p>
   <p>${esc(a.corrective_action)}<br><small>Owner: ${esc(a.owner_name || a.owner_id || "—")} • Due: ${esc(a.due_date)}</small></p>
   ${a.closed_at ? `<p><small>Closure: ${esc(a.closure_notes || "—")}${a.verified_by ? " • verified" : ""}</small></p>` : ""}
   ${canWrite("actions") && !a.closed_at ? `<input placeholder="Closure evidence / notes" id="cn${a.id}"><button class="btn sm" data-close="${a.id}" style="margin-top:6px">Close action</button>` : ""}
   ${canWrite("actions") && a.closed_at && !a.verified_by ? `<button class="btn sm alt" data-verify="${a.id}">Verify closure</button>` : ""}</div>`).join("") + "</main>";
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = async () => { const n = $("#cn" + b.dataset.close).value.trim(); if (!n) return toast("Enter closure evidence/notes first", true);
    try { await store.update("actions", b.dataset.close, { closed_at: new Date().toISOString(), closure_notes: n }); toast("Action closed — awaiting verification"); actions(); } catch (e) { toast(e.message, true); } }));
  document.querySelectorAll("[data-verify]").forEach((b) => (b.onclick = async () => { try { await store.update("actions", b.dataset.verify, { verified_by: LIVE ? ME.id : ME.name, verified_at: new Date().toISOString() }); toast("Closure verified"); actions(); } catch (e) { toast(e.message, true); } }));
}

/* ---------- 4. tyre cost & life ---------- */
const REASONS = [["worn_out", "Normal wear-out"], ["damage", "Damage"], ["separation", "Separation"], ["burst", "Burst"], ["cut", "Cut"], ["bulge", "Bulge"], ["abnormal_wear", "Abnormal wear"], ["other_premature", "Other (premature)"], ["other", "Other"]];
async function tyres() {
  const list = await store.list("tyres"); const sites = await sitesList(); const sn = Object.fromEntries(sites.map((s) => [s.id, s.name]));
  const body = list.map((x) => { const c = Calc.costPerUnit(x); const l = Calc.achievedLife(x); return `<tr><td>${esc(x.serial_no || "—")}</td><td>${esc(sn[x.site_id] || x.site_id)}</td><td>${fmt(x.purchase_cost, 0)}</td><td>${fmt(l.km, 0)} km / ${fmt(l.hours, 0)} h</td><td>${fmt(c.per_km)}</td><td>${fmt(c.per_hour)}</td><td>${esc(x.removal_reason || (x.removed_on ? "reason missing" : "in service"))}</td><td class="missing">${esc(c.missing.join("; "))}</td></tr>`; }).join("");
  $("#app").innerHTML = `<main><h2>💰 ${t("cost", "Tyre Cost & Life")}</h2>
  ${canWrite("tyres") ? `<form id="tf" class="card"><div class="grid">
   <div><label>Site *</label><select name="site_id">${sites.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div>
   <div><label>Tyre serial no.</label><input name="serial_no"></div><div><label>Size / brand</label><input name="size"></div>
   <div><label>Purchase date</label><input type="date" name="purchase_date"></div><div><label>Purchase cost (₹) *</label><input type="number" min="0" step="any" name="purchase_cost"></div>
   <div><label>Vehicle no.</label><input name="vehicle_no"></div><div><label>Fitment date</label><input type="date" name="fit_date"></div>
   <div><label>Fitment km</label><input type="number" min="0" step="any" name="fit_km"></div><div><label>Fitment hours</label><input type="number" min="0" step="any" name="fit_hours"></div>
   <div><label>Removal date</label><input type="date" name="removed_on"></div><div><label>Removal km</label><input type="number" min="0" step="any" name="remove_km"></div><div><label>Removal hours</label><input type="number" min="0" step="any" name="remove_hours"></div>
   <div><label>Removal reason</label><select name="removal_reason"><option value="">—</option>${REASONS.map((r) => `<option value="${r[0]}">${r[1]}</option>`).join("")}</select></div>
   <div><label>Repair / retread cost so far (₹)</label><input type="number" min="0" step="any" name="events_cost"></div>
   <div><label>Disposal value (₹)</label><input type="number" min="0" step="any" name="disposal_value"></div></div>
   <p><button class="btn" type="submit">Save tyre record</button></p></form>` : ""}
  <div class="card scroll"><table><tr><th>Serial</th><th>Site</th><th>Purchase ₹</th><th>Achieved life</th><th>₹/km</th><th>₹/hour</th><th>Status/reason</th><th>Missing data</th></tr>${body || '<tr><td colspan="8">No tyre records.</td></tr>'}</table>
  <p class="missing">Method: total cost = purchase + repair/retread costs − disposal value; ₹/km = total cost ÷ (removal km − fitment km); ₹/hour likewise with hours. Blank (—) means data is missing; nothing is estimated.</p></div></main>`;
  const tf = $("#tf"); if (tf) tf.onsubmit = async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(tf)); const n = (x) => (x === "" || x === undefined ? null : Number(x)); const d = (x) => x || null;
    if (n(v.purchase_cost) === null) return toast("Purchase cost is required", true);
    if (n(v.remove_km) !== null && n(v.fit_km) !== null && n(v.remove_km) < n(v.fit_km)) return toast("Removal km cannot be less than fitment km", true);
    if (n(v.remove_hours) !== null && n(v.fit_hours) !== null && n(v.remove_hours) < n(v.fit_hours)) return toast("Removal hours cannot be less than fitment hours", true);
    try { const row = { site_id: v.site_id, serial_no: v.serial_no, size: v.size, purchase_date: d(v.purchase_date), purchase_cost: n(v.purchase_cost), vehicle_no: v.vehicle_no.toUpperCase(), fit_date: d(v.fit_date), fit_km: n(v.fit_km), fit_hours: n(v.fit_hours), removed_on: d(v.removed_on), remove_km: n(v.remove_km), remove_hours: n(v.remove_hours), removal_reason: v.removal_reason || null, disposal_value: n(v.disposal_value) };
      if (!LIVE) row.events = n(v.events_cost) ? [{ kind: "repair/retread", cost: n(v.events_cost) }] : [];
      const tr = await store.insert("tyres", row);
      if (LIVE && n(v.events_cost)) await store.insert("tyre_events", { tyre_id: tr.id, kind: "other", event_date: new Date().toISOString().slice(0, 10), cost: n(v.events_cost) });
      toast("Tyre record saved ✔"); tyres(); } catch (er) { toast("Could not save: " + er.message, true); } };
}

/* ---------- 5. dashboard ---------- */
async function dash() {
  const [insp, acts, ty, sites, veh] = await Promise.all([store.list("inspections"), store.list("actions"), store.list("tyres"), sitesList(), store.list("vehicles").catch(() => [])]);
  const draw = () => {
    const fromV = $("#df").value, toV = $("#dt").value, siteV = $("#ds").value, vehV = $("#dv").value.trim().toUpperCase();
    const inRange = (d) => (!fromV || d >= fromV) && (!toV || d <= toV + "T23:59:59");
    const I = insp.filter((i) => i.status !== "draft" && inRange(i.inspected_at || "") && (!siteV || i.site_id === siteV) && (!vehV || i.vehicle_no === vehV));
    const ids = new Set(I.map((i) => i.id)); const A = acts.filter((a) => ids.has(a.inspection_id));
    const T = ty.filter((x) => (!siteV || x.site_id === siteV) && (!vehV || x.vehicle_no === vehV));
    const rep = Calc.findRepeatDefects(I); const defects = I.filter((i) => i.defect_code);
    const closed = A.filter((a) => a.closed_at).length, verified = A.filter((a) => a.verified_by).length, over = A.filter((a) => Calc.actionStatus(a) === "overdue").length;
    const pr = Calc.prematureRemovalRate(T); const comp = Calc.compliance((veh.filter((v) => !siteV || v.site_id === siteV)).map((v) => v.vehicle_no), I);
    const skipped = T.filter((x) => { const l = Calc.achievedLife(x); return Calc.tyreTotalCost(x).value === null || (l.km === null && l.hours === null); }).length;
    const kmT = T.filter((x) => Calc.costPerUnit(x).per_km !== null), hrT = T.filter((x) => Calc.costPerUnit(x).per_hour !== null);
    const perKm = kmT.length ? kmT.reduce((s, x) => s + Calc.tyreTotalCost(x).value, 0) / kmT.reduce((s, x) => s + Calc.achievedLife(x).km, 0) : null;
    const perHr = hrT.length ? hrT.reduce((s, x) => s + Calc.tyreTotalCost(x).value, 0) / hrT.reduce((s, x) => s + Calc.achievedLife(x).hours, 0) : null;
    const lives = T.map((x) => Calc.achievedLife(x).km).filter((v) => v !== null); const avgLife = lives.length ? lives.reduce((a, b) => a + b, 0) / lives.length : null;
    const bySite = sites.map((s) => { const ts = T.filter((x) => x.site_id === s.id); const known = ts.map((x) => Calc.tyreTotalCost(x).value).filter((v) => v !== null);
      return `<tr><td>${esc(s.name)}</td><td>${I.filter((i) => i.site_id === s.id).length}</td><td>${ts.length}</td><td>${fmt(known.reduce((a, b) => a + b, 0), 0)}</td><td class="missing">${ts.length - known.length ? ts.length - known.length + " tyre(s) without purchase cost" : ""}</td></tr>`; }).join("");
    $("#dres").innerHTML = `<div class="card"><h3>Actual measured performance</h3><div class="kpi">
     <div><b>${I.length}</b><small>Inspections in selection</small></div><div><b>${defects.length}</b><small>Inspections with a defect</small></div>
     <div><b>${comp.value === null ? "—" : fmt(comp.value * 100, 0) + "%"}</b><small>Vehicle inspection compliance${comp.value === null ? " (needs vehicle register)" : ""}</small></div>
     <div><b>${rep.size}</b><small>Inspections in repeat-defect groups</small></div>
     <div><b>${pr.rate === null ? "—" : fmt(pr.rate * 100, 0) + "%"}</b><small>Premature removal rate (${pr.with_reason} removed tyres with a reason; ${pr.missing} missing)</small></div>
     <div><b>${fmt(avgLife, 0)}</b><small>Average achieved tyre life (km), ${lives.length} tyres with data</small></div>
     <div><b>${fmt(perKm)}</b><small>₹ per km (${kmT.length} tyres with complete data)</small></div><div><b>${fmt(perHr)}</b><small>₹ per operating hour (${hrT.length} tyres)</small></div>
     <div><b>${A.length ? fmt((closed / A.length) * 100, 0) + "%" : "—"}</b><small>Actions closed (${verified} verified, ${over} overdue)</small></div></div>
     <p class="missing">Tyres excluded from cost/life figures for missing data: ${skipped}. Dashes mean data is missing — nothing is estimated.</p></div>
     <div class="card scroll"><h3>Site-wise</h3><table><tr><th>Site</th><th>Inspections</th><th>Tyres</th><th>Tyre expenditure ₹ (known)</th><th>Data gaps</th></tr>${bySite}</table></div>
     <div class="card"><h3>Proposed targets (NOT approved, NOT measured)</h3><p>No KPI thresholds are built in. Targets such as inspection frequency, minimum tread depth or cost/km goals must be proposed and approved by GR Infra P&E management before being entered here. Until then this section is intentionally empty.</p></div>`;
  };
  $("#app").innerHTML = `<main><h2>📊 ${t("dash", "Management Dashboard")}</h2><div class="card grid">
   <div><label>From</label><input type="date" id="df"></div><div><label>To</label><input type="date" id="dt"></div>
   <div><label>Site (Pan-India = all)</label><select id="ds"><option value="">All sites (Pan-India)</option>${sites.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div>
   <div><label>Vehicle no.</label><input id="dv" placeholder="optional"></div></div><div id="dres"></div></main>`;
  ["df", "dt", "ds", "dv"].forEach((id) => ($("#" + id).oninput = draw)); draw();
}

/* ---------- boot ---------- */
async function login() {
  $("#app").innerHTML = `<main><div class="card"><h2>${t("login", "Login")}</h2><label>Email</label><input id="em" type="email" autocomplete="username"><label>Password</label><input id="pw" type="password" autocomplete="current-password"><p><button class="btn" id="lb">${t("login", "Login")}</button></p><div id="le"></div></div></main>`;
  $("#lb").onclick = async () => { const { error } = await sb.auth.signInWithPassword({ email: $("#em").value, password: $("#pw").value }); if (error) $("#le").innerHTML = `<div class="banner crit">${esc(error.message)}</div>`; else boot(); };
}
async function boot() {
  document.documentElement.lang = lang; $("#langBtn").textContent = lang === "en" ? "हिंदी" : "English";
  if (!DEFECTS.length) { try { DEFECTS = window.GRTC_DEFECTS || await (await fetch("defects.json")).json(); } catch (e) { $("#app").innerHTML = `<main><div class="banner crit">Could not load defects.json: ${esc(e.message)}</div></main>`; return; } }
  renderMode();
  if (LIVE) {
    const { data: s } = await sb.auth.getSession(); if (!s.session) return login();
    const { data: p, error } = await sb.from("profiles").select("*").eq("id", s.session.user.id).single();
    if (error || !p || !p.active) { $("#app").innerHTML = `<main><div class="banner crit">Your account has no active profile. Ask the Central P&E Administrator.</div></main>`; return; }
    ME = { id: p.id, name: p.full_name, role: p.role, site_id: p.site_id };
    $("#whoami").innerHTML = `${esc(p.full_name)} <button class="btn alt sm" id="lo" style="background:#fff">${t("logout", "Logout")}</button>`; $("#lo").onclick = async () => { await sb.auth.signOut(); boot(); };
  }
  home();
}
$("#homeBtn").onclick = () => home();
$("#langBtn").onclick = () => { lang = lang === "en" ? "hi" : "en"; localStorage.setItem("grtc_lang", lang); boot(); };
boot();
