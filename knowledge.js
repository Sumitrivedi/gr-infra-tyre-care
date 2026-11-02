"use strict";
/* Shared knowledge base. Stage data supplied by GR Infra (indicative scale). ITTAC refs = real ITTAC code + manual page. */
window.KB=(function(){
/* ============ KNOWLEDGE BASE (stage data supplied by GR Infra; indicative) ============ */
const SECTORS=[["ham","HAM / EPC / BOT","🛣️"],["tot","TOT Highway","🚧"],["mine","Mining","⛏️"],["metro","Metro & Railway","🚇"],["bridge","Bridges","🌉"],["tunnel","Tunnels","🕳️"],["hr","High-Rise","🏙️"],["tl","Transmission Line","⚡"],["buy","Purchase / Yard Storage","📦"]];
const S=(sec,stage,terrain,fail,score,label,badge,doit,avoid)=>({sec,stage,terrain,fail,score,label,badge,doit,avoid});
const STAGES=[
S("ham","Stage 1: Clearing, Grubbing & Earthwork","Loose soil, unpaved cuts, sharp roots","Tread slip, sidewall pinching",8,"High","High","Walk around tyres every shift; remove roots and stakes from haul paths; check sidewalls for pinch marks.","Don't turn sharply against banks or cut edges; don't run through stumps and roots."),
S("ham","Stage 2: GSB & WMM Laying","Sharp crushed stone, aggregate layer","Tread chunking, puncture, severe cutting",10,"Peak Wear","Peak","Inspect before every shift and after any heavy impact; pick out embedded stones; keep loads and speeds controlled on loose stone.","Don't spin wheels on loose aggregate; don't continue after a cut shows cords or belts."),
S("ham","Stage 3: DBM & Asphalt Concrete Paving","Hot bitumen, smooth paved surface","Thermal expansion, low abrasive wear",2,"Low","Low","Check pressures when tyres are cold; keep tyres clear of fresh hot bitumen; watch for heat build-up.","Don't park tyres on hot, fresh asphalt; don't set pressures on hot tyres."),
S("tot","Stage 1: Operational Maintenance & Tolling","Fully paved, stabilized highway asphalt","Uniform high-speed friction wear",1,"Baseline Low","Low","Routine pressure and tread checks; rotate and align on schedule.","Don't ignore slow, even wear; it still ends in a worn-out tyre."),
S("mine","Stage 1: Box Cut & OB Blasting","Sharp blasted rock, ungraded rock face","Carcass penetration, sidewall impact cuts",10,"Critical Peak","Critical","Inspect before every shift and after any impact; keep spotters and a clean-up crew on the face; stop work on any deep cut.","Don't drive over loose blasted rock; don't run a tyre with a suspected carcass cut."),
S("mine","Stage 2: Haul Road Stabilisation & Bench","Compacted earth, graded gravel roads","Internal heat separation, TKPH limit",6,"Moderate","Moderate","Track load, speed and cycle length against the tyre maker's TKPH rating; keep haul roads graded and drained.","Don't overload or overspeed; don't extend long hauls without a heat check."),
S("mine","Stage 3: Ore Extraction & Transport","Established haulage routes","Steady tread wear, heat generation",4,"Moderate-Low","Moderate","Monitor wear and temperature trends per tyre position; rotate as the tyre maker advises.","Don't let pressure drift unchecked; don't mix badly mismatched tyres on one axle."),
S("metro","Stage 1: Sub-grade & Ballast Hauling","Sharp railway ballast, loose earth","Tread chipping, sharp aggregate punctures",8,"High","High","Check tread and sidewalls every shift; clear ballast from loading and tipping areas.","Don't drive over spilled ballast; don't ignore small chips that open into cuts."),
S("metro","Stage 2: Viaduct & Girder Launching","Cast yards, temporary compaction beds","Heavy static load deflection, shoulder scrub",6,"Moderate","Moderate","Check pressure against load before heavy lifts or moves; keep beds level and compacted.","Don't leave tyres under heavy static load for long on soft beds; don't turn sharply when loaded."),
S("metro","Stage 3: Track Laying & Operations","Flat paved/rail track beds","Negligible surface wear",1,"Low","Low","Routine checks and correct pressures.","Don't skip routine checks because the surface looks easy."),
S("bridge","Stage 1: Piling & Foundation Works","Muddy pits, wet slurry, soft soils","High-torque wheel spin, mud suction wear",7,"High","High","Use matted or stabilised access; clean mud from tyres and rims; check for heat after long spin.","Don't rock or spin wheels to escape mud; don't drive into slurry pits blind."),
S("bridge","Stage 2: Superstructure & Launching","Unpaved riverbeds, rocky access paths","Sidewall gouging, load fatigue",5,"Moderate","Moderate","Inspect sidewalls after every riverbed or rocky run; keep pressure right for the load.","Don't scrape sidewalls on rocks or edges; don't carry overload on soft ground."),
S("tunnel","Stage 1: Ramp Excavation & Portal Cut","Steep unpaved ramps, wet uncompacted soil","Traction slip, heavy drive axle wear",8,"High","High","Keep ramps shaped and drained; check drive-axle tyres closely for tearing and uneven wear.","Don't spin on wet ramps; don't ride the brakes down slopes."),
S("tunnel","Stage 2: Underground Muck Hauling","Wet slurry, loose rock, tight concrete curves","Sidewall scrubbing, rebar cut, shoulder tear",9,"Near Peak","Peak","Inspect every shift; sweep rebar and loose rock; mark tight curves and keep sidewall clearance.","Don't scrub sidewalls on walls or kerbs; don't drive over protruding rebar."),
S("tunnel","Stage 3: Invert & Concrete Lining","Smooth concrete deck floor","Low-friction stable rolling wear",2,"Low","Low","Routine pressure and wear checks.","Don't let routine checks lapse on easy stages."),
S("hr","Stage 1: Deep Basement Excavation","Steep exit ramps, loose earth, wet mud","Heavy torque spin, tread tearing",7,"High","High","Keep exit ramps compacted and clean; check tread blocks for tearing after wet days.","Don't spin to climb; don't overload on steep wet ramps."),
S("hr","Stage 2: Superstructure & RMC Supply","Urban asphalt roads, messy site entry","Gravel cuts, urban stop-and-go wear",3,"Low-Moderate","Low","Wash and clear site entry; check tyres for cuts after gravel and debris.","Don't carry gravel out onto roads on the tyres; don't ignore stop-and-go heat."),
S("tl","Stage 1: Tower Excavation & Access","Cross-country, off-road, rocky terrain","Thorn puncture, rock sidewall cuts",8,"High","High","Check for thorns and cuts at every stop; carry a proper repair and recovery plan.","Don't drive over thorn scrub or rock edges when a route exists."),
S("tl","Stage 2: Stringing & Maintenance","Dirt tracks, unpaved farm lanes","Light abrasive wear",3,"Low","Low","Routine checks; inspect after rough lanes.","Don't ignore small cuts that pick up dirt and water."),
S("buy","Stage 1: Yard Storage & Staging","Open-air storage, concrete yard","UV/ozone crack degradation",1,"Static Degradation","Low","Store tyres out of sun and away from ozone sources, stacked or racked as the maker advises; use oldest stock first.","Don't leave tyres in direct sun or near electric motors and welding.")
];
const COL={Low:"var(--low)",Moderate:"var(--mod)",High:"var(--high)",Peak:"var(--peak)",Critical:"var(--crit)"};
/* ITTAC references are real entries from the ITTAC guide (code, manual page). */
const PROBLEMS={
 puncture:{label:"Puncture / penetration",kw:/puncture|penetrat|thorn/i,ref:[["TBB 1-D",13],["TBR 1-F",47],["TBR 1-K",52]],
  care:["Remove the object only if trained to; mark the spot and take the tyre out of service until assessed.","Send cuts that reach the casing to a certified repair facility or the tyre maker; ITTAC says to consult them on repairability, otherwise replace.","Fix the cause: clear sharp debris from haul paths and loading areas."],
  spec:["Ask your supplier about cut-resistant tread compounds and construction suited to your surface.","Check that the tyre type matches the application (on/off-road service)."],
  safety:"Never keep running a tyre with a cut that exposes cords or belts, or that has air loss."},
 sidewall:{label:"Sidewall cut / impact",kw:/sidewall|gouge|pinch|scrub|rebar/i,ref:[["TBB 2-C",26],["TBR 2-C",55]],
  care:["Inspect both sidewalls every shift; mark and record every cut with a photo.","Take any sidewall cut that reaches the casing out of service; consult the tyre maker or a certified repair centre.","Protect sidewalls: widen tight curves, remove edges and protruding steel from the path."],
  spec:["Ask about sidewall-protected or rock-service constructions for rock, tunnel and rebar exposure."],
  safety:"A sidewall cut that reaches the casing can fail suddenly. Stop use until a competent person has assessed it."},
 chunking:{label:"Tread chunking / chipping",kw:/chunk|chip|flak|cutting/i,ref:[["TBB 1-F",15],["TBR 1-H",49]],
  care:["Reduce speed and wheel spin on loose stone; ITTAC links chunking to high speed on rough roads and spinning over objects.","Check lift-axle clearances and dual matching, as listed in the ITTAC actions.","Where chunking keeps recurring, consult the tyre maker on tyre selection."],
  spec:["Ask about chip-and-cut resistant tread designs and compounds for your stage."],
  safety:"Deep chunking that exposes belts or plies needs assessment before further use."},
 heat:{label:"Heat build-up / separation",kw:/heat|separat|tkph|thermal/i,ref:[["TBB 1-A",10],["TBR 1-A",42],["TBR 3-F",66]],
  care:["Keep pressure correct for the load; ITTAC lists overload, underinflation and over-speed as possible causes of heat build-up.","Bulges at shoulder or crown: take the tyre out of service and consult the tyre manufacturer, as ITTAC advises.","Review load, speed and cycle length; on mining haul roads compare against the tyre maker's TKPH rating."],
  spec:["Ask the supplier for the tyre's TKPH/TMPH rating and match it to your duty cycle.","Confirm load and speed ratings suit the application."],
  safety:"A bulge or separation can lead to a sudden burst. Remove from service and keep people clear until assessed."},
 mud:{label:"Mud suction / wheel spin",kw:/mud|spin|torque|slip|suction|traction/i,ref:[["TBR 1-C",44],["TBB 1-K",20]],
  care:["Stabilise access with matting or aggregate; avoid rocking or spinning the wheels.","Clean mud off tyres and rims; check for tearing at tread blocks and shoulders after wet days.","Closest ITTAC entries: spin cuts and rib tearing, both linked to wheel spinning."],
  spec:["Ask about traction tread patterns suited to soft, wet ground, and about chain or recovery options for the worst sections."],
  safety:"Keep people clear of spinning wheels; flung stones and torn rubber are a hazard."},
 uv:{label:"UV / ozone cracking",kw:/uv|ozone|crack|storage|degrad/i,ref:[["TBB 2-B",25]],
  care:["Store tyres out of direct sunlight and away from ozone sources such as electric motors and welding.","Use oldest stock first and record purchase dates.","Inspect cracked sidewalls; ITTAC lists over-ageing and improper storage as possible causes and says to consult the tyre maker."],
  spec:["Ask the supplier about storage guidance and shelf-life for the tyre type."],
  safety:"Radial sidewall cracking: have a competent person assess before the tyre goes into service."},
 wear:{label:"Uneven / abnormal wear",kw:/wear|uneven|misalign|feather|spot/i,ref:[["TBB 1-I",18],["TBR 1-J",51]],
  care:["Check alignment, bearings and bushings; ITTAC lists these under misalignment wear.","Rotate tyres regularly and check pressures.","Record wear patterns by position to spot repeat problems."],
  spec:["Consult the tyre maker on rotation and tyre selection for the duty."],
  safety:"If the tread wear indicator is reached or cords show, remove from service."},
 bead:{label:"Bead / rim damage",kw:/bead|rim/i,ref:[["TBB 3-B",32],["TBR 3-E",65]],
  care:["Check rim condition and size before fitting; avoid damaged or wrong-size rims.","Use proper mounting tools and procedure.","Maintain recommended inflation and load."],
  spec:["Match tyre and rim size and type; ask the supplier about rim/bead compatibility."],
  safety:"Mounting and inflating tyres is dangerous. Use trained people and your approved safety procedure."},
 unsure:{label:"Not sure / general check",kw:/$^/,ref:[],
  care:["Do a full walk-around: tread, both sidewalls, bead area, valve and pressure.","Photograph anything unusual and use the Defect Reference in the app to match it.","When in doubt, take the tyre out of service and ask a competent person."],
  spec:["Share your stage, terrain and duty with your tyre supplier to confirm the tyre type."],
  safety:"If you see a bulge, exposed cords, or hear air escaping, stop and keep people clear."}
};
const TERRAINS=["Dry / loose","Wet / muddy","Rocky / sharp","Paved / smooth","Mixed conditions"];
const EQUIP=["Tipper / dumper","Haul truck (mining)","Transit mixer","Loader / excavator","Trailer / low-bed","Light vehicle / other","Skip"];
const FREQ={Critical:"Before every shift, after any impact or heavy load event, and at each shift change. Record every cut.",Peak:"Before every shift and after any impact. Quick walk-around at each break.",High:"Every shift (pre-start walk-around), plus a detailed check weekly.",Moderate:"Daily walk-around and a detailed check every week.",Low:"Routine weekly check, and a daily glance at pressure and obvious damage."};

return {SECTORS,STAGES,PROBLEMS,TERRAINS,EQUIP,FREQ,COL};
})();
