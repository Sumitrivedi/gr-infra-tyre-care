/* GR INFRA TYRE CARE - transparent KPI calculations (pure functions, unit-tested).
   Rule: if required data is missing, return {value:null, missing:[...]} - never guess. */
(function (root) {
  const num = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

  // Total cost of a tyre = purchase + repairs + retreads - disposal credit (all entered by user).
  function tyreTotalCost(t) {
    const missing = [];
    const purchase = num(t.purchase_cost);
    if (purchase === null) missing.push("purchase_cost");
    const extra = (t.events || []).reduce((s, e) => s + (num(e.cost) || 0), 0);
    const credit = num(t.disposal_value) || 0;
    return { value: purchase === null ? null : purchase + extra - credit, missing };
  }

  // Achieved life uses fitment & removal readings. km and hours are kept separate.
  function achievedLife(t) {
    const out = { km: null, hours: null, missing: [] };
    const fk = num(t.fit_km), rk = num(t.remove_km), fh = num(t.fit_hours), rh = num(t.remove_hours);
    if (fk !== null && rk !== null && rk >= fk) out.km = rk - fk;
    if (fh !== null && rh !== null && rh >= fh) out.hours = rh - fh;
    if (out.km === null && out.hours === null) out.missing.push("fitment+removal km or hours (removal must be >= fitment)");
    return out;
  }

  function costPerUnit(t) {
    const c = tyreTotalCost(t), l = achievedLife(t);
    const missing = [...c.missing, ...l.missing];
    return {
      per_km: c.value !== null && l.km > 0 ? c.value / l.km : null,
      per_hour: c.value !== null && l.hours > 0 ? c.value / l.hours : null,
      missing,
    };
  }

  // Premature removal: ONLY computed when the user entered a removal reason for each removed tyre.
  // "Premature" = reason category is one of PREMATURE_REASONS (a proposal - see docs; needs GR Infra approval).
  const PREMATURE_REASONS = ["damage", "separation", "burst", "cut", "bulge", "abnormal_wear", "other_premature"];
  function prematureRemovalRate(tyres) {
    const removed = tyres.filter((t) => t.removed_on);
    const known = removed.filter((t) => t.removal_reason);
    const prem = known.filter((t) => PREMATURE_REASONS.includes(t.removal_reason)).length;
    return { rate: known.length ? prem / known.length : null, removed: removed.length, with_reason: known.length,
             missing: removed.length - known.length };
  }

  // Repeat defect: same vehicle + tyre position + defect code at least twice within windowDays.
  function findRepeatDefects(inspections, windowDays = 90) {
    const groups = {};
    inspections.filter((i) => i.defect_code).forEach((i) => {
      const k = [i.vehicle_no, i.tyre_position, i.defect_code].join("|");
      (groups[k] = groups[k] || []).push(i);
    });
    const repeats = new Set();
    Object.values(groups).forEach((g) => {
      g.sort((a, b) => new Date(a.inspected_at) - new Date(b.inspected_at));
      for (let i = 1; i < g.length; i++) {
        if ((new Date(g[i].inspected_at) - new Date(g[i - 1].inspected_at)) / 864e5 <= windowDays) {
          repeats.add(g[i].id); repeats.add(g[i - 1].id);
        }
      }
    });
    return repeats;
  }

  function actionStatus(a, today = new Date()) {
    if (a.closed_at) return a.verified_by ? "closed_verified" : "closed_unverified";
    if (a.due_date && new Date(a.due_date) < new Date(today.toISOString().slice(0, 10))) return "overdue";
    return "open";
  }

  // Inspection compliance = inspected vehicles / vehicles in register, in period. Needs the register.
  function compliance(vehicles, inspections) {
    if (!vehicles.length) return { value: null, missing: ["vehicle register is empty"] };
    const seen = new Set(inspections.map((i) => i.vehicle_no));
    return { value: vehicles.filter((v) => seen.has(v)).length / vehicles.length, missing: [] };
  }

  const api = { tyreTotalCost, achievedLife, costPerUnit, prematureRemovalRate, findRepeatDefects, actionStatus, compliance, PREMATURE_REASONS };
  if (typeof module !== "undefined") module.exports = api; else root.Calc = api;
})(typeof window !== "undefined" ? window : globalThis);
