// Vendored copy of hoops-cliniq-plays/lib/court.js (newest, with disc labels). Do not edit here; edit the source and re-copy.
/*
 * Hoops CliniQ court renderer, shared by the play player (plays/player) and the video creator (plays/video).
 * A plain script (not a module) so it loads from disk, in a page, and through a bundler alike: it sets
 * globalThis.HoopsCourt. Everything here is pure — a play goes in, SVG markup comes out; no DOM, no clock.
 *
 * Coordinates are feet: x across the court 0-50 (left sideline 0), y out from the baseline, rim at (25, 5.25).
 * The court is a US high school (NFHS) court: 84 x 50 ft, so half court ends 42 ft from the baseline.
 * The drawing shows the half court plus the whole center circle, with room out of bounds for an inbounder.
 */
(function () {
  "use strict";

  // ---------- dictionary (generated from play-dna/dictionary.json; the version a play was built with is checked) ----------
  const DICTIONARY_VERSION = "1.5";
  const TERMS = {"pass_release":{"label":"Pass","category":"event"},"catch":{"label":"Catch","category":"event"},"shot_release":{"label":"Shot Release","category":"event"},"made_shot":{"label":"Made Shot","category":"event"},"missed_shot":{"label":"Missed Shot","category":"event"},"free_throw":{"label":"Free Throw","category":"event"},"offensive_rebound":{"label":"Offensive Rebound","category":"event","notation":"solid_arrow"},"defensive_rebound":{"label":"Defensive Rebound","category":"event"},"deflection":{"label":"Deflection","category":"event"},"steal":{"label":"Steal","category":"event"},"blocked_shot":{"label":"Blocked Shot","category":"event"},"turnover":{"label":"Turnover","category":"event"},"out_of_bounds":{"label":"Out of Bounds","category":"event"},"possession_change":{"label":"Possession Change","category":"event"},"dribble":{"label":"Dribble","category":"ball_handling","notation":"zigzag"},"drive":{"label":"Drive","category":"ball_handling","notation":"zigzag"},"crossover":{"label":"Crossover","category":"ball_handling"},"hesitation":{"label":"Hesitation","category":"ball_handling"},"in_and_out":{"label":"In-and-Out Dribble","category":"ball_handling"},"behind_the_back_dribble":{"label":"Behind-the-Back Dribble","category":"ball_handling"},"spin_dribble":{"label":"Spin Dribble","category":"ball_handling"},"snake_dribble":{"label":"Snake Dribble","category":"ball_handling"},"fast_break":{"label":"Fast Break","category":"system","notation":"zigzag"},"pivot":{"label":"Pivot","category":"footwork"},"reverse_pivot":{"label":"Reverse Pivot","category":"footwork"},"jab_step":{"label":"Jab Step","category":"footwork"},"jump_stop":{"label":"Jump Stop","category":"footwork"},"shot_fake":{"label":"Shot Fake","category":"footwork"},"pass":{"label":"Pass","category":"pass","notation":"dashed_arrow"},"entry_pass":{"label":"Entry Pass","category":"pass","notation":"dashed_arrow"},"kick_out":{"label":"Kick-Out","category":"pass","notation":"dashed_arrow"},"swing_pass":{"label":"Swing Pass","category":"pass","notation":"dashed_arrow"},"skip_pass":{"label":"Skip Pass","category":"pass","notation":"dashed_arrow"},"pocket_pass":{"label":"Pocket Pass","category":"pass","notation":"dashed_arrow"},"alley_oop":{"label":"Alley-Oop","category":"pass","notation":"dashed_arrow"},"chest_pass":{"label":"Chest Pass","category":"pass","notation":"dashed_arrow"},"bounce_pass":{"label":"Bounce Pass","category":"pass","notation":"dashed_arrow"},"overhead_pass":{"label":"Overhead Pass","category":"pass","notation":"dashed_arrow"},"push_pass":{"label":"Push Pass","category":"pass","notation":"dashed_arrow"},"wraparound_pass":{"label":"Wraparound Pass","category":"pass","notation":"dashed_arrow"},"curl_pass":{"label":"Curl Pass","category":"pass","notation":"dashed_arrow"},"baseball_pass":{"label":"Baseball Pass","category":"pass","notation":"dashed_arrow"},"behind_the_back_pass":{"label":"Behind-the-Back Pass","category":"pass","notation":"dashed_arrow"},"off_the_dribble_pass":{"label":"Off-the-Dribble Pass","category":"pass","notation":"dashed_arrow"},"shovel_pass":{"label":"Shovel Pass","category":"pass","notation":"dashed_arrow"},"flip_pass":{"label":"Flip Pass","category":"pass","notation":"dashed_arrow"},"handoff":{"label":"Hand-Off","category":"handoff","notation":"double_bar"},"dho":{"label":"Dribble Hand-Off (DHO)","category":"handoff","notation":"double_bar"},"keeper":{"label":"Keeper","category":"handoff"},"cut":{"label":"Cut","category":"cut","notation":"solid_arrow"},"backdoor_cut":{"label":"Backdoor Cut","category":"cut","notation":"solid_arrow"},"relocate":{"label":"Relocation","category":"cut","notation":"solid_arrow"},"v_cut":{"label":"V-Cut","category":"cut","notation":"solid_arrow"},"l_cut":{"label":"L-Cut","category":"cut","notation":"solid_arrow"},"curl_cut":{"label":"Curl Cut","category":"cut","notation":"solid_arrow"},"flare_cut":{"label":"Flare Cut","category":"cut","notation":"solid_arrow"},"flash_cut":{"label":"Flash Cut","category":"cut","notation":"solid_arrow"},"ucla_cut":{"label":"UCLA Cut","category":"cut","notation":"solid_arrow"},"flex_cut":{"label":"Flex Cut","category":"cut","notation":"solid_arrow"},"iverson_cut":{"label":"Iverson Cut","category":"cut","notation":"solid_arrow"},"shallow_cut":{"label":"Shallow Cut","category":"cut","notation":"solid_arrow"},"screen":{"label":"Screen (Pick)","category":"screen","notation":"t_bar"},"ball_screen":{"label":"Ball Screen","category":"screen","notation":"t_bar"},"off_ball_screen":{"label":"Off-Ball Screen","category":"screen","notation":"t_bar"},"down_screen":{"label":"Down Screen","category":"screen","notation":"t_bar"},"back_screen":{"label":"Back Screen","category":"screen","notation":"t_bar"},"cross_screen":{"label":"Cross Screen","category":"screen","notation":"t_bar"},"flare_screen":{"label":"Flare Screen","category":"screen","notation":"t_bar"},"stagger_screen":{"label":"Staggered Screens","category":"screen","notation":"t_bar"},"elevator_screen":{"label":"Elevator Screen","category":"screen","notation":"t_bar"},"drag_screen":{"label":"Drag Screen","category":"screen","notation":"t_bar"},"double_drag":{"label":"Double Drag","category":"screen","notation":"t_bar"},"ghost_screen":{"label":"Ghost Screen","category":"screen","notation":"t_bar"},"roll":{"label":"Roll","category":"screen_followup","notation":"solid_arrow"},"pop":{"label":"Pop","category":"screen_followup","notation":"solid_arrow"},"slip":{"label":"Slip","category":"screen_followup"},"re_screen":{"label":"Re-Screen","category":"screen_followup"},"screen_rejection":{"label":"Screen Rejection","category":"screen_followup"},"split":{"label":"Splitting the Screen","category":"screen_followup"},"seal":{"label":"Seal","category":"post"},"duck_in":{"label":"Duck-In","category":"post"},"face_up":{"label":"Face-Up","category":"post"},"drop_step":{"label":"Drop Step","category":"post"},"spin_move":{"label":"Spin Move","category":"post"},"up_and_under":{"label":"Up-and-Under","category":"post"},"shot":{"label":"Shot","category":"shot_type","notation":"shot_arc"},"jump_shot":{"label":"Jump Shot","category":"shot_type"},"pull_up":{"label":"Pull-Up Jumper","category":"shot_type"},"step_back":{"label":"Step-Back Jumper","category":"shot_type"},"fadeaway":{"label":"Fadeaway","category":"shot_type"},"hook_shot":{"label":"Hook Shot","category":"shot_type"},"floater":{"label":"Floater","category":"shot_type"},"layup":{"label":"Layup","category":"shot_type"},"reverse_layup":{"label":"Reverse Layup","category":"shot_type"},"euro_step":{"label":"Euro Step","category":"shot_type"},"dunk":{"label":"Dunk","category":"shot_type"},"tip_in":{"label":"Tip-In","category":"shot_type"},"restricted_area":{"label":"At the Rim","category":"shot_zone","phrase":"at the rim"},"paint_non_ra":{"label":"In The Paint (Non-RA)","category":"shot_zone"},"mid_range":{"label":"Mid-Range","category":"shot_zone"},"left_corner_3":{"label":"Left Corner 3","category":"shot_zone"},"right_corner_3":{"label":"Right Corner 3","category":"shot_zone"},"above_break_3":{"label":"Above the Break 3","category":"shot_zone"},"closeout":{"label":"Closeout","category":"defense"},"denial":{"label":"Denial","category":"defense"},"post_front":{"label":"Post Fronting","category":"defense"},"help_and_recover":{"label":"Help and Recover","category":"defense"},"rotation":{"label":"Defensive Rotation","category":"defense"},"double_team":{"label":"Double-Team","category":"defense"},"trail_cutter":{"label":"Trailing a Cutter","category":"defense"},"box_out":{"label":"Box Out","category":"defense"},"switch":{"label":"Switch","category":"screen_defense"},"drop":{"label":"Drop Coverage","category":"screen_defense"},"hedge":{"label":"Hedge","category":"screen_defense"},"blitz":{"label":"Blitz","category":"screen_defense"},"ice":{"label":"ICE","category":"screen_defense"},"go_over":{"label":"Going Over","category":"screen_defense"},"go_under":{"label":"Going Under","category":"screen_defense"},"peel_switch":{"label":"Peel Switch","category":"screen_defense"},"tag_roller":{"label":"Tagging the Roller","category":"screen_defense"},"pick_and_roll":{"label":"Pick and Roll","category":"compound","notation":"t_bar"},"pick_and_pop":{"label":"Pick and Pop","category":"compound","notation":"t_bar"},"zoom":{"label":"Zoom Action","category":"compound","notation":"t_bar"},"give_and_go":{"label":"Give-and-Go","category":"compound","notation":"dashed_arrow"},"high_low":{"label":"High-Low","category":"compound"},"screen_the_screener":{"label":"Screen the Screener","category":"compound"},"spain_pnr":{"label":"Spain Pick-and-Roll","category":"compound"},"hammer":{"label":"Hammer Action","category":"compound"},"floppy":{"label":"Floppy Action","category":"compound"},"isolation":{"label":"Isolation (Iso)","category":"play_type"},"transition":{"label":"Transition","category":"play_type"},"pnr_ball_handler":{"label":"Pick & Roll Ball Handler","category":"play_type"},"pnr_roll_man":{"label":"Pick & Roll Roll Man","category":"play_type"},"post_up":{"label":"Post Up","category":"play_type"},"spot_up":{"label":"Spot Up","category":"play_type"},"play_handoff":{"label":"Handoff","category":"play_type"},"play_cut":{"label":"Cut","category":"play_type"},"off_screen":{"label":"Off Screen","category":"play_type"},"putback":{"label":"Putback","category":"play_type"},"man_to_man":{"label":"Man-to-Man Defense","category":"system"},"zone_defense":{"label":"Zone Defense","category":"system"},"motion_offense":{"label":"Motion Offense","category":"system"},"half_court_set":{"label":"Half-Court Set","category":"system"},"unknown":{"label":"Unknown","category":"meta"},"custom":{"label":"Custom","category":"meta"},"corner":{"label":"Corner","category":"court_area","phrase":"{side} corner"},"short_corner":{"label":"Short Corner","category":"court_area","phrase":"{side} short corner"},"low_post":{"label":"Block","category":"court_area","phrase":"{side} block"},"lane":{"label":"Lane","category":"court_area","phrase":"the lane"},"high_post":{"label":"Elbow","category":"court_area","phrase":"{side} elbow"},"wing":{"label":"Wing","category":"court_area","phrase":"{side} wing"},"top_of_key":{"label":"Top of the Key","category":"court_area","phrase":"top of the key"},"deep":{"label":"Deep","category":"court_area","phrase":"deep on the {side}","phrase_middle":"deep, near half court"},"lower_defensive_box":{"label":"Lower Defensive Box","category":"court_area"},"baseline":{"label":"Baseline","category":"court_line"},"sideline":{"label":"Sideline","category":"court_line"},"lane_line":{"label":"Lane Line","category":"court_line"},"foul_line":{"label":"Free-Throw Line","category":"court_line"},"free_throw_circle":{"label":"Free-Throw Circle","category":"court_line"},"three_point_line":{"label":"Three-Point Line","category":"court_line"},"half_court_line":{"label":"Half-Court Line","category":"court_line"},"center_circle":{"label":"Center Circle","category":"court_line"},"hash_mark":{"label":"Hash Mark","category":"court_line"},"no_charge_semicircle":{"label":"No-Charge Semicircle","category":"court_line"},"dunker_spot":{"label":"Dunker Spot","category":"court_area","phrase":"{side} dunker spot"},"nail":{"label":"Nail","category":"court_area","phrase":"the nail"},"slot":{"label":"Slot","category":"court_area","phrase":"{side} slot"}};
  // Court areas, NFHS lane (12 ft), priority order (first match wins where they overlap). restricted_area is a named
  // zone only: high school courts paint no restricted-area arc.
  const AREAS = [{ id: "restricted_area", side: "middle", circle: [25, 5.25, 4] }, { id: "dunker_spot", side: "left", rect: [15, 0, 19, 6] },
    { id: "dunker_spot", side: "right", rect: [31, 0, 35, 6] }, { id: "corner", side: "left", rect: [0, 0, 5, 14] },
    { id: "corner", side: "right", rect: [45, 0, 50, 14] }, { id: "short_corner", side: "left", rect: [5, 0, 15, 14] },
    { id: "short_corner", side: "right", rect: [35, 0, 45, 14] }, { id: "low_post", side: "left", rect: [15, 6, 22, 12] },
    { id: "low_post", side: "right", rect: [28, 6, 35, 12] }, { id: "lane", side: "middle", rect: [19, 0, 31, 19] },
    { id: "high_post", side: "left", rect: [13, 12, 23, 24] }, { id: "high_post", side: "right", rect: [27, 12, 37, 24] },
    { id: "nail", side: "middle", rect: [23, 19, 27, 24] }, { id: "wing", side: "left", rect: [0, 14, 13, 36] },
    { id: "wing", side: "right", rect: [37, 14, 50, 36] }, { id: "slot", side: "left", rect: [13, 24, 20, 36] },
    { id: "slot", side: "right", rect: [30, 24, 37, 36] }, { id: "top_of_key", side: "middle", rect: [20, 24, 30, 36] },
    { id: "deep", side: "left", rect: [0, 36, 17, 42] }, { id: "deep", side: "middle", rect: [17, 36, 33, 42] },
    { id: "deep", side: "right", rect: [33, 36, 50, 42] }];

  // ---------- geometry of the drawing ----------
  const DEPTH = 42; // baseline to the half-court line (NFHS, 84 ft court)
  const BACK = 49; // past half court far enough to show the whole center circle
  // Room out of bounds: 4.5 ft beside the sideline for an inbounder, 6 ft behind the baseline for the floor's sponsor
  // lettering (and the pills that sit over it, clear of the court).
  const VIEW = { x: -4.5, y: -6, w: 59, h: 56.5 };
  const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`;
  // A full-court play (court.length 84) keeps this window size and slides it along the floor with the ball.
  const FULL = 84;
  // NFHS three-point line: a 19'9" semicircle around the rim, with straight legs from the baseline to the rim's depth.
  const ARC = 19.75;
  const LOGO = { x: 25 - 5.7, y: DEPTH - 5.7, size: 11.4 }; // painted in the center circle
  // Muted = not involved with the ball. Dark enough to read on the wood (>= 3:1) and to carry white numbers.
  const C = { off: "#1f5a85", offMuted: "#5d7584", def: "#b83a2e", defMuted: "#a85a4c", ink: "#1e3a32", pass: "#1e3a32",
    shot: "#d5483a", made: "#ef9a3c", line: "#fffaf2", wood: "#d9b285" };
  const AREA_TINT = { restricted_area: "#c96f3b", dunker_spot: "#3f8f8a", corner: "#3e6f8e", short_corner: "#7c5ea8", low_post: "#2f8f6f",
    lane: "#c98a3b", high_post: "#b0485f", nail: "#a0602a", wing: "#4a7fb0", slot: "#6a5aa8", top_of_key: "#8a7a2e", deep: "#6d6d6d" };
  const LABEL_AT = { lane: [25, 14.5], high_post: [16.2, 20.5], restricted_area: null }; // x is for the left side
  const TWO_LINES = new Set(["dunker_spot", "short_corner"]);
  const FONT = "Lato, system-ui, sans-serif";

  const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  const term = (id) => (own(TERMS, id) ? TERMS[id] : { label: String(id), category: "meta" });
  // Every text node and attribute below goes through esc (via tag/attrs): the markup is set with dangerouslySetInnerHTML.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const n2 = (v) => (Math.round(v * 100) / 100).toString();
  const attrs = (a) => Object.entries(a).map(([k, v]) => ` ${k}="${typeof v === "number" ? n2(v) : esc(v)}"`).join("");
  const tag = (name, a, inner) => (inner == null ? `<${name}${attrs(a)}/>` : `<${name}${attrs(a)}>${inner}</${name}>`);
  const num = (id) => (id[0] === "o" ? id.slice(1) : "X" + id.slice(1));
  const areaKey = (a) => `${a.id ?? a.area}|${a.side}`;

  // ---------- reading a play.json (untrusted: shape and types are checked, unknown keys never reach the drawing) ----------
  const isPoint = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  const isArea = (a) => a && typeof a.area === "string" && typeof a.side === "string";
  const str = (v) => (typeof v === "string" && v ? v : null);

  function parsePlay(p) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("Not a play.json: the file is not a JSON object.");
    const fps = p.source?.fps, tracks = p.tracks?.players;
    if (typeof fps !== "number" || !(fps >= 1 && fps <= 240)) throw new Error("source.fps must be a number between 1 and 240.");
    if (!tracks || typeof tracks !== "object" || !Object.keys(tracks).length) throw new Error("Missing tracks.players.");
    const ids = Object.keys(tracks);
    for (const id of ids) {
      if (!/^[od][1-9]$/.test(id)) throw new Error(`Player id "${id}" is not o1-o9 or d1-d9.`);
      const t = tracks[id];
      if (!Array.isArray(t) || !t.length || !t.every(isPoint)) throw new Error(`Track for ${id} is not a list of [x, y] points.`);
    }
    const isPlayer = (id) => typeof id === "string" && ids.includes(id);
    const longest = Math.max(...ids.map((id) => tracks[id].length));
    const frames = Math.min(20000, Number.isFinite(p.source.frames) && p.source.frames > 0 ? Math.min(p.source.frames, longest) : longest);
    const xy = (t) => t.map((q) => [q[0], q[1]]);
    const ball = Array.isArray(p.tracks.ball) && p.tracks.ball.length && p.tracks.ball.every(isPoint)
      ? p.tracks.ball.map((q) => [q[0], q[1], Number.isFinite(q[2]) ? q[2] : 0]) : [];
    const actions = (Array.isArray(p.actions) ? p.actions : []).filter((a) =>
      a && typeof a.type === "string" && isPlayer(a.who) && Number.isFinite(a.frame) && Number.isFinite(a.end) && a.end >= a.frame &&
      Array.isArray(a.path) && a.path.length && a.path.every(isPoint) &&
      (a.with === undefined || isPlayer(a.with)) && (a.zone === undefined || typeof a.zone === "string") &&
      (a.result === undefined || typeof a.result === "string") && (a.route === undefined || (Array.isArray(a.route) && a.route.length > 1 && a.route.every(isPoint))) &&
      (a.parts === undefined || (Array.isArray(a.parts) && a.parts.every((x) => typeof x === "string"))))
      .map((a) => ({
        id: str(a.id) ?? "", type: a.type, who: a.who, with: a.with, frame: a.frame, end: a.end, path: xy(a.path),
        route: a.route && xy(a.route), parts: a.parts, zone: a.zone, result: a.result, lob: a.lob === true,
        finish: str(a.finish) && term(a.finish).category === "shot_type" ? a.finish : undefined,
        distance_ft: Number.isFinite(a.distance_ft) ? a.distance_ft : undefined, confidence: str(a.confidence) ?? "",
        from_area: isArea(a.from_area) ? { area: a.from_area.area, side: a.from_area.side } : null,
        to_area: isArea(a.to_area) ? { area: a.to_area.area, side: a.to_area.side } : null,
      }));
    const areas = {};
    for (const id of ids) {
      const runs = p.tracks.areas?.[id];
      if (Array.isArray(runs)) areas[id] = runs.filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && typeof r[1] === "string" && typeof r[2] === "string");
    }
    return {
      title: str(p.name) ?? "Untitled play",
      dictionary: str(p.dictionary),
      fps, frames,
      players: Object.fromEntries(ids.map((id) => [id, p.players?.[id]?.team === "defense" || (p.players?.[id]?.team !== "offense" && id[0] === "d") ? "defense" : "offense"])),
      // Optional disc labels for a recreated real play ("JB" for Jalen Brunson): one or two capital letters, else the number.
      labels: Object.fromEntries(ids.filter((id) => /^[A-Z]{1,2}$/.test(p.players?.[id]?.label ?? "")).map((id) => [id, p.players[id].label])),
      tracks: Object.fromEntries(ids.map((id) => [id, xy(tracks[id])])),
      ball, actions, areas,
      holder: Array.from({ length: frames }, (_, f) => (isPlayer(p.tracks.holder?.[f]) ? p.tracks.holder[f] : null)),
      // Sorted by time, each keeping its index in the file: commentary line n belongs to moment n as written.
      moments: (Array.isArray(p.moments) ? p.moments : []).map((m, i) => ({ m, i }))
        .filter(({ m }) => m && Number.isFinite(m.frame) && m.frame >= 0 && m.frame < frames && typeof m.label === "string")
        .map(({ m, i }) => ({ frame: m.frame, label: m.label, i })).sort((a, b) => a.frame - b.frame),
      rim: isPoint(p.court?.rim) ? { x: p.court.rim[0], y: p.court.rim[1] } : { x: 25, y: 5.25 },
      length: p.court?.length === FULL ? FULL : DEPTH,
      accuracy: Number.isFinite(p.accuracy?.court_error_ft?.p90) ? p.accuracy.court_error_ft : null,
    };
  }

  /** Same key as tracker/label.py fingerprint(): Python json.dumps spacing, sha256, first 16 hex chars. */
  async function fingerprint(p) {
    if (!Array.isArray(p.actions) || !Array.isArray(p.moments)) return "invalid";
    // A null or malformed entry can't match what label.py hashed: the labels are treated as stale, not as a crash.
    if (!p.actions.every((a) => a && typeof a === "object") || !p.moments.every((m) => m && typeof m === "object")) return "invalid";
    // Python separates items with ", "; ids and types never contain commas, so a plain replace matches it.
    const key = JSON.stringify([p.actions.map((a) => [a.id, a.type, a.frame]), p.moments.map((m) => m.frame)]).replace(/,/g, ", ");
    const bytes = new TextEncoder().encode(key);
    // crypto.subtle only exists on https and localhost; a page opened over the LAN uses the small sha256 below.
    const hash = globalThis.crypto?.subtle ? new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)) : sha256(bytes);
    return [...hash].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  /** SHA-256 (FIPS 180-4) for when crypto.subtle is unavailable. */
  function sha256(data) {
    const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
      0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
      0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138,
      0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624,
      0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f,
      0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
    const hs = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const n = data.length, blocks = Math.ceil((n + 9) / 64), msg = new Uint8Array(blocks * 64);
    msg.set(data);
    msg[n] = 0x80;
    const view = new DataView(msg.buffer);
    view.setUint32(msg.length - 8, Math.floor((n * 8) / 2 ** 32));
    view.setUint32(msg.length - 4, (n * 8) >>> 0);
    const w = new Uint32Array(64), rot = (x, r) => (x >>> r) | (x << (32 - r));
    for (let b = 0; b < blocks; b++) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(b * 64 + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, bb, c, d, e, f, g, h] = hs;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        [h, g, f, e, d, c, bb, a] = [g, f, e, (d + t1) >>> 0, c, bb, a, (t1 + t2) >>> 0];
      }
      [a, bb, c, d, e, f, g, h].forEach((v, i) => (hs[i] = (hs[i] + v) >>> 0));
    }
    const out = new Uint8Array(32), outView = new DataView(out.buffer);
    hs.forEach((v, i) => outView.setUint32(i * 4, v));
    return out;
  }

  /**
   * labels.json is untrusted too. Returns { labels, note }: labels is null when missing, or when written for another
   * version of the play (lines, verdicts and moments would point at the wrong things), and the note says why.
   */
  async function parseLabels(p, raw, clip) {
    if (!raw || typeof raw !== "object") return { labels: null, note: "" };
    const fp = await fingerprint(p);
    if (fp && raw.play_fingerprint && fp !== raw.play_fingerprint) {
      return { labels: null, note: "labels.json was written for a different version of this play (its fingerprint doesn't match), so its commentary and video verdicts are hidden. Re-run label.py." };
    }
    const label = (l) => (l && typeof l.id === "string" ? { id: l.id, custom_label: str(l.custom_label) ?? "", confidence: str(l.confidence) ?? "", why: str(l.why) ?? "" } : null);
    const duration = clip.frames / clip.fps;
    return {
      note: "",
      labels: {
        lines: Array.isArray(raw.lines) && raw.lines.every((l) => typeof l === "string") ? raw.lines : [],
        hook: str(raw.hook),
        verified_name: str(raw.verified_name),
        verdicts: (Array.isArray(raw.verdicts) ? raw.verdicts : [])
          .filter((v) => v && typeof v.action === "string" && ["confirmed", "rejected", "unclear"].includes(v.verdict))
          .map((v) => ({ action: v.action, verdict: v.verdict, corrected_type: str(v.corrected_type) ?? "none", why: str(v.why) ?? "" })),
        // Seen on video only: an attacker (1-5) or defender (X1-X5) at a time inside the play; anything else is dropped.
        extras: (Array.isArray(raw.extra_actions) ? raw.extra_actions : []).filter((x) => x && typeof x.type === "string" &&
          typeof x.who === "string" && /^X?[1-5]$/.test(x.who) && Number.isFinite(x.time_s) && x.time_s >= 0 && x.time_s <= duration),
        ...Object.fromEntries(["set_name", "play_type", "shot_type", "base_defense", "screen_defense"].map((k) => [k, label(raw[k])])),
      },
    };
  }

  /**
   * The video check edits the tracker's reads: a rejected guess is not drawn, a correction renames an action into another
   * drawable one. A measured (high-confidence) action is only disputed, never removed — same rule as label.py.
   * Compound actions (pick and roll, zoom) are drawn through their parts.
   */
  function applyVerdicts(clip, labels) {
    const verdict = Object.fromEntries((labels?.verdicts ?? []).map((v) => [v.action, v]));
    const shown = clip.actions.map((a) => {
      const v = own(verdict, a.id) ? verdict[a.id] : null;
      const better = v && v.verdict === "confirmed" && v.corrected_type !== "none" && term(v.corrected_type).notation && term(a.type).notation;
      return better ? { ...a, type: v.corrected_type } : a;
    });
    const verdictOf = (a) => (own(verdict, a.id) ? verdict[a.id] : null);
    const removed = (a) => verdictOf(a)?.verdict === "rejected" && a.confidence !== "high";
    const notes = shown.filter((a) => !a.parts && term(a.type).notation && !removed(a)).map((a) => ({
      ...a, kind: term(a.type).notation, t0: a.frame, t1: a.end, made: a.result === "made_shot",
    }));
    return { shown, notes, removed, verdictOf };
  }

  // ---------- words ----------
  function areaText(a) {
    const t = term(a.area);
    const phrase = a.side === "middle" && t.phrase_middle ? t.phrase_middle : t.phrase || t.label.toLowerCase();
    return phrase.replace("{side}", a.side);
  }
  /** Where a shot came from. A three's zone already says it; a two's zone spans 20 ft, so add the distance. */
  function shotSpot(a) {
    if (!a.zone) return term("shot").label;
    const zone = term(a.zone).label;
    return a.zone.endsWith("_3") || !Number.isFinite(a.distance_ft) ? zone : `${zone} · ${Math.round(a.distance_ft)} ft`;
  }
  /** One feed line in dictionary terms, with court areas: "Kick-Out · 1 (the lane) → 5 (top of the key)". */
  function describe(a) {
    const from = a.from_area ? areaText(a.from_area) : null, to = a.to_area ? areaText(a.to_area) : null;
    if (a.type === "shot") return `${num(a.who)}${from ? " · " + from : ""} · ${shotSpot(a)}${a.result ? " · " + term(a.result).label : ""}`;
    if (a.with) return `${term(a.type).label} · ${num(a.who)}${from ? ` (${from})` : ""} → ${num(a.with)}${to ? ` (${to})` : ""}`;
    return `${term(a.type).label} · ${num(a.who)}${from ? ` · ${from}${to && to !== from ? " → " + to : ""}` : ""}`;
  }
  /** A finish at the rim (layup, dunk, tip) is not a shot from range: no arc is drawn for it. */
  const atRim = (n) => Number.isFinite(n.distance_ft) ? n.distance_ft <= 4.5 : n.zone === "restricted_area";

  // ---------- geometry helpers ----------
  const lerp = (a, b, u) => a + (b - a) * u;
  function at(track, src) {
    const i = Math.min(track.length - 1, Math.max(0, Math.floor(src)));
    const j = Math.min(track.length - 1, i + 1), f = src - i;
    return track[i].map((v, k) => lerp(v, track[j][k], f));
  }
  const len = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  /** First `u` (0-1) of a polyline, by length. */
  function partial(pts, u) {
    if (u >= 1) return pts;
    let left = len(pts) * Math.max(0, u);
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seg >= left) { out.push([lerp(a[0], b[0], left / (seg || 1)), lerp(a[1], b[1], left / (seg || 1))]); return out; }
      out.push(b); left -= seg;
    }
    return out;
  }
  /** Stop a line short of its end so the arrowhead clears the disc it points at. */
  function trimEnd(pts, cut) {
    pts = pts.map((p) => p.slice());
    while (pts.length > 1 && cut > 0) {
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seg > cut) { pts[pts.length - 1] = [b[0] - (b[0] - a[0]) * cut / seg, b[1] - (b[1] - a[1]) * cut / seg]; cut = 0; }
      else { pts.pop(); cut -= seg; }
    }
    return pts;
  }
  /** Coaching-diagram dribble: the route drawn as a zigzag, straight for the last stretch so the arrow reads. */
  function zigzag(pts, amp = 0.42, step = 0.75) {
    const total = len(pts);
    if (total < 1.5) return pts;
    const out = [];
    let i = 0, acc = 0, k = 0;
    for (let d = 0; d <= total - 1.2; d += step, k++) {
      while (i < pts.length - 2 && acc + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) < d) {
        acc += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); i++;
      }
      const [a, b] = [pts[i], pts[i + 1]];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const u = Math.min(1, (d - acc) / seg);
      const nx = -(b[1] - a[1]) / seg, ny = (b[0] - a[0]) / seg;
      const s = k === 0 ? 0 : (k % 2 ? amp : -amp);
      out.push([lerp(a[0], b[0], u) + nx * s, lerp(a[1], b[1], u) + ny * s]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  /** A lob drawn as a coaching diagram does: an arched pass line. */
  function arch(a, b, bend = 0.22) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend;
    const out = [];
    for (let s = 0; s <= 1.0001; s += 0.05) out.push([(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * cx + s * s * b[0], (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * cy + s * s * b[1]]);
    return out;
  }
  const pts = (list) => list.map((p) => n2(p[0]) + "," + n2(p[1])).join(" ");

  // ---------- static layers ----------
  /** Wood floor (and the center-circle logo when logoHref is given). */
  function floorMarkup({ logoHref = null, length = DEPTH } = {}) {
    const full = length === FULL;
    const marker = (k, c) => `<marker id="head-${k}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 Z" fill="${c}"/></marker>`;
    return `<defs><pattern id="planks" width="2.6" height="60" patternUnits="userSpaceOnUse">` +
      `<rect width="1.3" height="60" fill="#e9c69a"/><rect x="1.3" width="1.3" height="60" fill="#e4bf91"/><rect x="1.27" width="0.03" height="60" fill="#c9a074" opacity=".35"/></pattern>` +
      `<filter id="disc-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0.18" stdDeviation="0.18" flood-color="#2a1d10" flood-opacity=".28"/></filter>` +
      marker("off", C.off) + marker("pass", C.pass) + marker("ink", C.ink) + `</defs>` +
      tag("rect", { x: VIEW.x, y: VIEW.y, width: VIEW.w, height: full ? FULL - 2 * VIEW.y : VIEW.h, fill: C.wood }) +
      tag("rect", { x: 0, y: 0, width: 50, height: full ? FULL : BACK, fill: "url(#planks)" }) +
      // Painted behind the baseline like a sponsor: white, faded.
      tag("text", { x: 25, y: -3.1, "text-anchor": "middle", "dominant-baseline": "central", fill: "#ffffff", opacity: 0.5,
        "font-size": 2.4, "font-weight": 900, "letter-spacing": 0.35, "font-family": FONT }, "HOOPS CLINIQ") +
      (full ? tag("text", { x: 25, y: FULL + 3.1, "text-anchor": "middle", "dominant-baseline": "central", fill: "#ffffff", opacity: 0.5,
        "font-size": 2.4, "font-weight": 900, "letter-spacing": 0.35, "font-family": FONT }, "HOOPS CLINIQ") : "") +
      (logoHref ? tag("image", { href: logoHref, x: LOGO.x, y: LOGO.y, width: LOGO.size, height: LOGO.size, opacity: 0.92 }) : "");
  }
  /** Court lines, NFHS dimensions: 12 ft lane, free-throw line at 19 ft, 19'9" arc, no restricted-area arc. */
  function linesMarkup(length = DEPTH) {
    const half = halfLines();
    return length === FULL ? half + `<g transform="matrix(1 0 0 -1 0 ${FULL})">${half}</g>` : half;
  }
  function halfLines() {
    const paths = [
      `M 0 0 H 50 V ${DEPTH} H 0 Z`,
      `M 19 ${DEPTH} A 6 6 0 0 1 31 ${DEPTH} A 6 6 0 0 1 19 ${DEPTH}`,
      `M 0 ${DEPTH} V ${BACK}`, `M 50 ${DEPTH} V ${BACK}`,
      "M 19 0 V 19 H 31 V 0", "M 19 19 A 6 6 0 0 0 31 19",
      `M ${n2(25 - ARC)} 0 V 5.25 A ${ARC} ${ARC} 0 0 0 ${n2(25 + ARC)} 5.25 V 0`,
      "M 0 28 H 3", "M 47 28 H 50",
      ...[11, 14, 17].flatMap((y) => [`M 18.35 ${y} H 19`, `M 31 ${y} H 31.65`]),
    ];
    return `<g fill="none" stroke="${C.line}" stroke-width="0.17">${paths.map((d) => tag("path", { d })).join("")}` +
      tag("path", { d: "M 19 19 A 6 6 0 0 1 31 19", "stroke-dasharray": "1.1 0.9" }) + `</g>` +
      tag("rect", { x: 18.35, y: 7, width: 0.65, height: 1, fill: C.line }) + tag("rect", { x: 31, y: 7, width: 0.65, height: 1, fill: C.line }) +
      tag("line", { x1: 22, y1: 4, x2: 28, y2: 4, stroke: C.line, "stroke-width": 0.32, "stroke-linecap": "round" }) +
      tag("line", { x1: 25, y1: 4, x2: 25, y2: 4.5, stroke: "#e8622c", "stroke-width": 0.16 }) +
      tag("circle", { cx: 25, cy: 5.25, r: 0.75, fill: "none", stroke: "#e8622c", "stroke-width": 0.2 });
  }
  const areaShape = (a, extra) => (a.circle ? tag("circle", { cx: a.circle[0], cy: a.circle[1], r: a.circle[2], ...extra })
    : tag("rect", { x: a.rect[0], y: a.rect[1], width: a.rect[2] - a.rect[0], height: a.rect[3] - a.rect[1], ...extra }));
  /** Named areas: tints, labels, and the dashed outline of one highlighted area (where the ball is). */
  function areasMarkup({ fills = true, labels = true, highlight = null, highlightFill = false } = {}) {
    let out = "";
    // Opaque shapes in one translucent group: overlaps don't double up, and the first-priority area (drawn last) wins.
    if (fills) out += `<g opacity="0.2">${[...AREAS].reverse().map((a) => areaShape(a, { fill: AREA_TINT[a.id] || "#777" })).join("")}</g>`;
    if (labels) {
      out += `<g font-family="${FONT}" font-weight="900" font-size="0.95" text-anchor="middle" fill="#3b2a18" opacity="0.8" letter-spacing="0.05">`;
      for (const a of AREAS) {
        if (a.circle || LABEL_AT[a.id] === null || (a.id === "deep" && a.side === "middle")) continue; // the logo sits mid-court
        const fixed = LABEL_AT[a.id];
        const p = fixed ? [a.side === "right" ? 50 - fixed[0] : fixed[0], fixed[1]] : [(a.rect[0] + a.rect[2]) / 2, (a.rect[1] + a.rect[3]) / 2];
        const name = term(a.id).label.toUpperCase();
        const lines = TWO_LINES.has(a.id) ? name.split(" ") : [name];
        out += tag("text", { x: p[0], y: p[1], ...(a.id === "dunker_spot" ? { "font-size": 0.78 } : {}) },
          lines.map((line, n) => tag("tspan", { x: p[0], dy: n === 0 ? -(lines.length - 1) * 0.55 : 1.1 }, esc(line))).join(""));
      }
      out += `</g>`;
    }
    if (highlight) {
      const a = AREAS.find((x) => areaKey(x) === highlight);
      if (a) {
        if (highlightFill) out += areaShape(a, { fill: C.made, opacity: 0.28 }); // the ball's area, in the accent orange
        out += areaShape(a, { fill: "none", stroke: C.made, "stroke-width": 0.35, "stroke-dasharray": "0.8 0.5" });
      }
    }
    return out;
  }
  function areaAt(clip, pid, f) {
    const runs = clip.areas[pid];
    if (!Array.isArray(runs) || !runs.length) return null;
    let run = runs[0];
    for (const r of runs) if (r[0] <= f) run = r;
    return { area: run[1], side: run[2] };
  }

  // ---------- one frame ----------
  function noteMarkup(n, f, history) {
    const span = Math.max(1, n.t1 - n.t0);
    const u = (f - n.t0) / span;
    if (u < 0) return "";
    const done = u >= 1;
    if (done && !history && f > n.t1 + 20) return "";
    const p = Math.min(1, u);
    let out = "";
    if (n.kind === "zigzag") {
      const q = trimEnd(partial(n.path, p), 1.9);
      if (q.length > 1) out = tag("polyline", { points: pts(zigzag(q)), stroke: C.off, "stroke-width": 0.2, "marker-end": "url(#head-off)" });
    } else if (n.kind === "solid_arrow") {
      const strong = n.type !== "relocate";
      const q = trimEnd(partial(n.path, p), 1.9);
      if (q.length > 1) out = tag("polyline", { points: pts(q), stroke: C.off, "stroke-width": strong ? 0.24 : 0.17, "marker-end": "url(#head-off)", opacity: strong ? 1 : 0.75 });
    } else if (n.kind === "dashed_arrow") {
      const [a, b] = [n.path[0], n.path[n.path.length - 1]];
      const line = n.type === "alley_oop" || n.lob ? arch(a, b) : n.path; // lobs are drawn arched
      const q = trimEnd(partial(line, p), 1.9);
      if (q.length > 1) out = tag("polyline", { points: pts(q), stroke: C.pass, "stroke-width": 0.2, "stroke-dasharray": "0.9 0.6", "marker-end": "url(#head-pass)" });
    } else if (n.kind === "double_bar" && n.path.length > 1) {
      // Hand-off: two short parallel bars across the line between the players, at the exchange point.
      const [a, b] = n.path, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
      for (const o of [-0.3, 0.3]) out += tag("line", { x1: mx + ux * o - uy * 0.9, y1: my + uy * o + ux * 0.9, x2: mx + ux * o + uy * 0.9, y2: my + uy * o - ux * 0.9, stroke: C.pass, "stroke-width": 0.24 });
    } else if (n.kind === "t_bar" && n.route) {
      // Screen, standard notation: the screener's route as a solid line ending in a bar across it.
      const q = partial(n.route, p);
      if (len(n.route) < 0.3) {
        out = barToward(n.route[0], n.path[n.path.length - 1]); // a screen set without moving: just the bar
      } else if (len(q) > 0.3) {
        const [a, b] = [q[q.length - 2], q[q.length - 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
        out = tag("polyline", { points: pts(q), stroke: C.ink, "stroke-width": 0.22 }) +
          tag("line", { x1: b[0] - uy * 1.2, y1: b[1] + ux * 1.2, x2: b[0] + uy * 1.2, y2: b[1] - ux * 1.2, stroke: C.ink, "stroke-width": 0.32 });
      }
    } else if (n.kind === "t_bar" && n.path.length > 1) {
      // Tracker screens carry only [screener, mover]: a short stem from the screener ending in a bar.
      const [s, m] = n.path, d = Math.hypot(m[0] - s[0], m[1] - s[1]) || 1, ux = (m[0] - s[0]) / d, uy = (m[1] - s[1]) / d;
      const bx = s[0] + ux * 1.9, by = s[1] + uy * 1.9;
      out = tag("line", { x1: s[0] + ux * 1.6, y1: s[1] + uy * 1.6, x2: bx, y2: by, stroke: C.ink, "stroke-width": 0.24 }) +
        tag("line", { x1: bx - uy * 1.2, y1: by + ux * 1.2, x2: bx + uy * 1.2, y2: by - ux * 1.2, stroke: C.ink, "stroke-width": 0.3 });
    } else if (n.kind === "shot_arc") {
      // Shot from range: dotted arc to the rim. Every shot ends with a ring on the rim: orange made, red missed.
      if (!atRim(n)) {
        const [a] = n.path, rim = n.rim;
        const curve = [];
        const mx = (a[0] + rim.x) / 2, my = (a[1] + rim.y) / 2 - 3;
        for (let s = 0; s <= 1.0001; s += 0.05) curve.push([(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * mx + s * s * rim.x, (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * my + s * s * rim.y]);
        out = tag("polyline", { points: pts(partial(curve, p)), stroke: C.shot, "stroke-width": 0.2, "stroke-dasharray": "0.25 0.45" });
      }
      if (done) out += tag("circle", { cx: n.rim.x, cy: n.rim.y, r: 1.5, fill: "none", stroke: n.made ? C.made : C.shot, "stroke-width": 0.32 });
    }
    if (!out) return "";
    return done && f > n.t1 + 20 ? `<g opacity="0.38">${out}</g>` : out;
  }
  function barToward(s, m) {
    const d = Math.hypot(m[0] - s[0], m[1] - s[1]) || 1, ux = (m[0] - s[0]) / d, uy = (m[1] - s[1]) / d;
    const bx = s[0] + ux * 1.9, by = s[1] + uy * 1.9;
    return tag("line", { x1: s[0] + ux * 1.6, y1: s[1] + uy * 1.6, x2: bx, y2: by, stroke: C.ink, "stroke-width": 0.24 }) +
      tag("line", { x1: bx - uy * 1.2, y1: by + ux * 1.2, x2: bx + uy * 1.2, y2: by - ux * 1.2, stroke: C.ink, "stroke-width": 0.32 });
  }
  function pieceMarkup(id, x, y, focused, hasBall, label = null) {
    const off = id[0] === "o";
    const fill = off ? (focused ? C.off : C.offMuted) : focused ? C.def : C.defMuted;
    return `<g transform="translate(${n2(x)} ${n2(y)})" filter="url(#disc-shadow)">` +
      // Ringed: the ball handler, and the defender guarding the ball.
      ((off ? hasBall : focused) ? tag("circle", { r: 2.1, fill: "none", stroke: C.ink, "stroke-width": 0.28 }) : "") +
      tag("circle", { r: 1.55, fill, stroke: C.line, "stroke-width": 0.2 }) +
      tag("text", { "text-anchor": "middle", "dominant-baseline": "central", fill: C.line, "font-size": label ? 1.25 : off ? 1.65 : 1.45, "font-weight": 900, "font-family": FONT }, esc(label ?? num(id))) + `</g>`;
  }
  function ballMarkup(x, y, z) {
    const r = 0.78, s = 1 + z * 0.045, lift = z * 0.14;
    return tag("ellipse", { cx: x + z * 0.05, cy: y + 0.35, rx: r * 0.95, ry: r * 0.6, fill: "#2a1d10", opacity: Math.max(0.08, 0.28 - z * 0.012) }) +
      `<g transform="translate(${n2(x)} ${n2(y - lift)}) scale(${s.toFixed(3)})">` + tag("circle", { r, fill: "#ea7a2c", stroke: "#4a2814", "stroke-width": 0.09 }) +
      `<g fill="none" stroke="#4a2814" stroke-width="0.07"><line x1="0" y1="${-r}" x2="0" y2="${r}"/><line x1="${-r}" y1="0" x2="${r}" y2="0"/>` +
      `<path d="M ${n2(-r * 0.62)} ${n2(-r * 0.78)} Q ${n2(-r * 0.2)} 0 ${n2(-r * 0.62)} ${n2(r * 0.78)}"/><path d="M ${n2(r * 0.62)} ${n2(-r * 0.78)} Q ${n2(r * 0.2)} 0 ${n2(r * 0.62)} ${n2(r * 0.78)}"/></g></g>`;
  }

  /**
   * Everything that moves, for source frame `src` (fractional frames interpolate).
   * opts: { notation: draw notes and tags (true), history: keep finished actions faded (true),
   *         areas: { fills, labels } or null, highlightBall: outline the ball's area (true), highlightFill (false) }
   * Returns { areas, dynamic, f, ballOwner, here, touch } — areas goes under the court lines, dynamic over them.
   */
  function frame(clip, notes, src, opts = {}) {
    const { notation = true, history = true, areas = null, highlightBall = true, highlightFill = false } = opts;
    const f = Math.round(src);
    const view = viewAt(clip, src);
    const ids = Object.keys(clip.players);
    const posCache = {};
    const pos = (id) => (posCache[id] ??= at(clip.tracks[id], src));
    // Focus: who has the ball (or last touched it) and the defender closest to them.
    const live = notes.filter((n) => n.t0 <= f && f <= n.t1);
    const touch = clip.holder[f] ?? live.find((n) => n.kind === "dashed_arrow")?.with ??
      [...notes].reverse().find((n) => n.t0 <= f && (n.kind === "shot_arc" || n.kind === "dashed_arrow"))?.who ?? null;
    const focused = new Set([touch]);
    const defenders = ids.filter((i) => clip.players[i] === "defense");
    if (touch && defenders.length) {
      const tp = pos(touch);
      const dist = (i) => Math.hypot(pos(i)[0] - tp[0], pos(i)[1] - tp[1]);
      focused.add(defenders.reduce((a, b) => (dist(a) <= dist(b) ? a : b)));
    }
    const ballOwner = clip.holder[f];
    const here = ballOwner ? areaAt(clip, ballOwner, f) : null;

    let dynamic = "";
    // Lines are strokes only: without fill="none" a polyline is filled black.
    if (notation) dynamic += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${notes.map((n) => noteMarkup({ ...n, rim: clip.rim }, f, history)).join("")}</g>`;
    // Draw order = stacking: defense under offense so numbers stay readable, the on-ball pair on top of its team.
    const layer = (id) => (id[0] === "o" ? 2 : 0) + (focused.has(id) ? 1 : 0);
    for (const id of [...ids].sort((a, b) => layer(a) - layer(b))) {
      const [x, y] = pos(id);
      dynamic += pieceMarkup(id, x, y, focused.has(id), ballOwner === id, clip.labels?.[id] ?? null);
    }
    if (clip.ball.length) {
      const [bx, by, bz] = at(clip.ball, src);
      dynamic += ballMarkup(bx, by, bz);
    }
    if (notation) {
      // Tags name what is happening now, above the player doing it, clear of every disc and of each other.
      const discs = ids.map((id) => ({ x: pos(id)[0], y: pos(id)[1], w: 3.2, h: 3.2 }));
      const placed = [];
      const place = (x, y, text, tone) => {
        const w = 1.5 + text.length * 1.07, th = 2.6; // 1.5 ft type: readable on a phone-sized court
        x = Math.min(view.x + view.w - w / 2, Math.max(view.x + w / 2, x));
        const hits = (b, yy) => Math.abs(b.x - x) < (b.w + w) / 2 + 0.15 && Math.abs(b.y - yy) < (b.h + th) / 2 + 0.15;
        if (placed.some((b) => b.text === text && hits(b, y))) return; // two screeners in one action: one tag says it
        const ys = [y, y - 2.9, y - 5.8, y + 6.4, y - 8.7];
        const inside = (yy) => yy - th / 2 > view.y + 0.2; // never cut off by the top edge
        const free = ys.find((yy) => inside(yy) && !placed.some((b) => hits(b, yy)) && !discs.some((b) => hits(b, yy)));
        const yy = free ?? ys.find((v) => inside(v) && !placed.some((b) => hits(b, v))) ?? Math.max(y, view.y + th / 2 + 0.2);
        placed.push({ x, y: yy, w, h: th, text });
        const fill = { dark: C.ink, orange: C.made, red: C.def }[tone];
        dynamic += `<g transform="translate(${n2(x)} ${n2(yy)})">` + tag("rect", { x: -w / 2, y: -th / 2, width: w, height: th, rx: th / 2, fill, stroke: C.line, "stroke-width": 0.16 }) +
          tag("text", { "text-anchor": "middle", "dominant-baseline": "central", fill: tone === "orange" ? C.ink : C.line, "font-size": 1.5, "font-weight": 900, "letter-spacing": 0.06, "font-family": FONT }, esc(text)) + `</g>`;
      };
      const shown = new Set();
      for (const n of live) {
        if (shown.has(n.who)) continue;
        shown.add(n.who);
        const p = pos(n.who);
        const text = n.kind === "shot_arc" ? (atRim(n) ? term(n.finish ?? "layup").label : shotSpot(n).replace(" (Non-RA)", "")) : term(n.type).label.replace(/ \(.*\)$/, "");
        place(p[0], Math.max(1.4, p[1] - 3), text.toUpperCase(), n.kind === "shot_arc" ? "red" : "dark");
      }
      const shot = notes.find((n) => n.kind === "shot_arc");
      if (shot && f >= shot.t1 && f <= shot.t1 + 45) place(clip.rim.x, 1.4, shot.made ? "BUCKET" : "MISS", shot.made ? "orange" : "red");
    }
    const highlight = highlightBall && here ? areaKey({ id: here.area, side: here.side }) : null;
    return { areas: areas || highlight ? areasMarkup({ ...(areas ?? { fills: false, labels: false }), highlight, highlightFill }) : "", dynamic, f, ballOwner, here, touch,
      view, viewBox: `${n2(view.x)} ${n2(view.y)} ${n2(view.w)} ${n2(view.h)}` };
  }

  /**
   * The window onto the floor at source frame `src`. Half court: always VIEW. Full court: VIEW's size, its top edge
   * 41 ft above the ball (so the play coming up the floor has room ahead of it), held at the half-court framing once
   * the ball is in the frontcourt, and eased (two passes of a 1 s moving average) so the camera glides.
   */
  const cameras = new WeakMap();
  function viewAt(clip, src) {
    if (clip.length !== FULL) return VIEW;
    let cam = cameras.get(clip);
    if (!cam) {
      const offense = Object.keys(clip.players).filter((id) => clip.players[id] === "offense");
      const ballY = (f) => clip.ball[f]?.[1] ?? offense.reduce((s, id) => s + at(clip.tracks[id], f)[1], 0) / (offense.length || 1);
      const lo = VIEW.y, hi = FULL - VIEW.y - VIEW.h;
      cam = Array.from({ length: clip.frames }, (_, f) => Math.min(hi, Math.max(lo, ballY(f) - 41)));
      for (let pass = 0; pass < 2; pass++) {
        const k = Math.round(clip.fps / 2);
        cam = cam.map((_, f) => {
          const a = Math.max(0, f - k), b = Math.min(cam.length - 1, f + k);
          let s = 0;
          for (let i = a; i <= b; i++) s += cam[i];
          return s / (b - a + 1);
        });
      }
      cameras.set(clip, cam);
    }
    const i = Math.min(cam.length - 1, Math.max(0, src)), lo = Math.floor(i), hi = Math.min(cam.length - 1, lo + 1);
    return { ...VIEW, y: cam[lo] + (cam[hi] - cam[lo]) * (i - lo) };
  }

  globalThis.HoopsCourt = {
    DICTIONARY_VERSION, TERMS, AREAS, VIEW, VIEWBOX, LOGO, C, DEPTH, FULL, viewAt,
    term, esc, num, areaText, shotSpot, describe, parsePlay, parseLabels, fingerprint, applyVerdicts,
    floorMarkup, linesMarkup, areasMarkup, frame, zigzag, pts,
  };
})();
