// 小男孩角色的參數藍圖（Y 軸向上、面向 +Z、腳底 y=0、身高 2.3 單位）
// 建模順序：1 頭部 → 2 上半身 → 3 下半身 → 4 四肢（每個關節可動）→ 5 五官 → 6 冒險套裝
// 手持物品（球、刀、劍、槍、特效）不在角色裡，見 props.js；角色只提供「掛點」。
//
// 比例依原畫量測（身高 505px → 2.3）：頭頂 2.30、下巴 1.73、肩 1.69、衣襬 0.76、
// 褲管 0.37、膝 0.30、腳踝 0.10。頭寬 0.47、肩寬含袖 0.78、腰寬 0.52。
//
// 左右：角色面向 +Z（面向鏡頭），所以角色的「左」在 +X、「右」在 -X。
(function (root) {
  const PI = Math.PI;
  const OFF = [0.0001, 0.0001, 0.0001]; // 隱藏用縮放（表情切換、球、特效）
  const ON = [1, 1, 1];

  // ---- 零件建構器（stage = 建模步驟） -------------------------------------
  let STAGE = 1;
  const E = (p, s, r, m) => ({ t: 'ell', p, s, r: r || [0, 0, 0], m, stage: STAGE });
  const T = (p, R, tube, m, o = {}) => ({ t: 'torus', p, R, tube, arc: o.arc || PI * 2, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const C = (p, rt, rb, h, m, o = {}) => ({ t: 'cyl', p, rt, rb, h, seg: o.seg || 32, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const B = (p, size, m, o = {}) => ({ t: 'box', p, size, bevel: o.bevel ?? 0.01, r: o.r || [0, 0, 0], s: [1, 1, 1], m, stage: STAGE });
  // SH：殼；o.cut = 一圈各方位的下緣角度（髮際線形狀），沒有就用鋸齒
  const SH = (p, R, base, amp, n, th, m, o = {}) => ({ t: 'shell', p, R, base, amp, n, th, cut: o.cut, pw: o.pw, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const ST = (p, points, ro, ri, depth, m, o = {}) => ({ t: 'star', p, points, ro, ri, depth, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const L = (p, pts, m, o = {}) => ({ t: 'lathe', p, pts, phiStart: o.phiStart || 0, phiLength: o.phiLength || PI * 2, th: 0.02, clip: o.clip, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], m, stage: STAGE });
  const G = (p, c, o = {}) => ({ t: 'g', p, r: o.r || [0, 0, 0], s: o.s || [1, 1, 1], c: [c].flat(Infinity), id: o.id });

  // 左右鏡射：x 取負、尤拉角 y/z 取負、名稱 L ↔ R 互換
  const swapLR = (id) => (id.endsWith('L') ? id.slice(0, -1) + 'R' : id.endsWith('R') ? id.slice(0, -1) + 'L' : id);
  function mirror(node) {
    const q = JSON.parse(JSON.stringify(node));
    (function f(n) {
      n.p = [-n.p[0], n.p[1], n.p[2]];
      n.r = [n.r[0], -n.r[1], -n.r[2]];
      if (n.id) n.id = swapLR(n.id);
      if (n.c) n.c.forEach(f);
    })(q);
    return q;
  }
  const sym = (node) => [node, mirror(node)];
  // 關節：at = 世界座標樞紐；s0 = 靜止縮放
  const AT = {};
  const LOCALP = {}; // 各關節在父層裡的局部位置（AnimationClip 的 position 軌道用這個）
  const joint = (id, at, parts, s0) => {
    AT[id] = at;
    if (/[LR]$/.test(id)) AT[swapLR(id)] = [-at[0], at[1], at[2]];
    return G(at, [G([-at[0], -at[1], -at[2]], parts)], { id, s: s0 });
  };
  // A→B 的圓柱（任意方向）
  function seg(A, Bp, ra, rb, m) {
    const d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]];
    const len = Math.hypot(...d);
    const u = d.map((v) => v / len);
    return C([(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2], rb, ra, len, m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] });
  }
  const add = (a, b) => a.map((v, i) => v + b[i]);

  // 身形比例（以原建模座標為基準再換算）
  const HEM = 0.8;                                   // 上衣下襬高度（不動）
  const TORSO_K = 2 / 3;                             // 上衣長度縮成 2/3
  const sq = (y) => +(HEM + (y - HEM) * TORSO_K).toFixed(4); // 軀幹上的高度換算
  const DY_HEAD = sq(1.655) - 1.655;                 // 頭、脖子、衣領往下移的量
  const ARM_K = 0.85;                                // 手臂長度比例
  const ay = (y) => +(1.55 + (y - 1.55) * ARM_K).toFixed(4); // 手臂上的高度換算（以肩為準）
  const DY_ARM = sq(1.55) - 1.55;                    // 肩膀往下移的量
  const shift = (node, dy) => { node.p = [node.p[0], node.p[1] + dy, node.p[2]]; return node; };

  // ---- 骨架樞紐（世界座標；L 在 +X，R 由鏡射產生） ------------------------
  const LX = 0.145;                                  // 髖關節左右間距（兩腿稍微分開，與原畫一致）
  const SK = {
    root: [0, 0, 0], hips: [0, 0.66, 0], chest: [0, 0.82, 0], head: [0, 1.7, 0],
    upperArmL: [0.29, 1.55, 0], forearmL: [0.345, ay(1.27), 0], handL: [0.36, ay(0.97), 0.01],
    thighL: [LX, 0.6, 0], shinL: [LX, 0.32, 0], footL: [LX, 0.11, 0],
  };
  const GRIP_L = [0.365, ay(0.895), 0.03]; // 左手握點（建模座標；右手為 x 取負）
  const MUZZLE = [0, -0.21, 0.065];    // 預設槍口相對握點的位置（換槍時可調）

  // ===== 1. 頭部（頭蓋、臉頰下巴、耳朵、頭髮） =============================
  // 髮際線高度：從正前方（0°）往側邊每 15°，左右對稱，餘弦內插成平順曲線。照原畫量測：
  //   前額一字平（約離頭頂 1/3）→ 太陽穴微降 → 耳前留一小撮鬢角（到耳朵中段）→ 繞過耳上
  //   → 耳後往下 → 後頸中央最低，整圈呈「U」字
  const HAIR_SIDE = [2.185, 2.185, 2.18, 2.16, 2.105, 1.99, 2.065, 2.035, 1.95, 1.875, 1.83, 1.805, 1.8];
  const HAIR_CUT = [...HAIR_SIDE, ...HAIR_SIDE.slice(1, -1).reverse()];
  const HEAD_C = 2.03, HEAD_PW = 0.78, HEAD_W = 1.06; // HEAD_W：頭殼左右加寬（額頭較寬） // 頭蓋中心高度、超橢圓指數（< 1 = 頭頂較平、較飽滿）
  const supSin = (t) => Math.pow(Math.abs(Math.sin(t)), HEAD_PW);
  const supCos = (t) => Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), HEAD_PW);
  // 頭部輪廓（半徑, 高度）：小下巴、飽滿臉頰、頭蓋上半貼合橢球（讓頭髮服貼）
  const HEAD_PROFILE = [[0.0, 1.73], [0.07, 1.74], [0.12, 1.76], [0.16, 1.79], [0.19, 1.83], [0.21, 1.88], [0.225, 1.94], [0.233, 2.0]];
  for (let i = 0; i <= 16; i++) { // 頭蓋：赤道 (r 0.236) 到頭頂 (y 2.29)
    const t = (PI / 2) * (1 - i / 16);
    HEAD_PROFILE.push([+(0.236 * supSin(t)).toFixed(4), +(HEAD_C + 0.26 * supCos(t)).toFixed(4)]);
  }
  const HAIR = (p, off, th, m, cut) => ({ t: 'hair', p, profile: HEAD_PROFILE, off, th, cut, r: [0, 0, 0], s: [HEAD_W, 1, 1.03], m, stage: STAGE });
  function headBase() {
    STAGE = 1;
    return [
      L([0, 0, -0.005], HEAD_PROFILE, 'skin', { s: [HEAD_W, 1, 1.03] }), // 頭：下巴→臉頰→頭蓋一體成形
      // 耳朵：比髮緣更往外突出（原畫耳朵明顯露在頭髮外側）
      sym(G([0.262, 1.975, -0.012], [
        E([0, 0, 0], [0.03, 0.074, 0.05], 0, 'skin'),
        E([0.01, -0.004, 0.01], [0.014, 0.048, 0.03], 0, 'skinShade'),
        E([0.005, -0.056, 0.005], [0.022, 0.022, 0.024], 0, 'skin'),   // 耳垂
      ], { r: [0, -0.42, 0.06] })),
      // 頭髮：沿頭形長出（緊貼臉與後腦），髮際線以高度表裁出乾淨平順的邊；外層一層半透明短毛柔化髮緣
      HAIR([0, 0, -0.005], 0.012, 0.009, 'hair', HAIR_CUT),
      HAIR([0, 0, -0.005], 0.0165, 0.004, 'hairFuzz', HAIR_CUT.map((y) => y - 0.006)),
    ];
  }

  // ===== 2. 上半身（POLO 衫：深藍身、淺藍斜切、領子、門襟、校徽、下襬） ======
  // 上衣輪廓（半徑, 高度），由下襬往上到領口；前後深度 = 半徑 × 0.7
  const SHIRT = [[0.272, 0.8], [0.265, 0.9], [0.258, 1.05], [0.26, 1.25], [0.268, 1.42], [0.27, 1.5], [0.262, 1.56], [0.225, 1.605], [0.15, 1.64], [0.085, 1.655]].map(([r, y]) => [r, sq(y)]);
  // 斜切平面：通過右腋下與左腰兩點，保留上方
  const YOKE = (() => {
    const a = [-0.27, sq(1.42)], b = [0.27, sq(1.02)];
    const nx = -(b[1] - a[1]), ny = b[0] - a[0], len = Math.hypot(nx, ny);
    const n = [nx / len, ny / len, 0];
    return { n, d: n[0] * a[0] + n[1] * a[1] };
  })();
  const uo = (n) => { [n].flat(Infinity).forEach(function f(x) { x.uo = 1; (x.c || []).forEach(f); }); return n; }; // 只屬於制服的零件（換裝時隱藏）
  function upperBody() {
    STAGE = 2;
    const badge = G([0.13, sq(1.42), 0.162], [
      C([0, 0, 0], 0.05, 0.05, 0.01, 'white', { r: [PI / 2, 0, 0] }),
      E([0, 0.018, 0.007], [0.028, 0.015, 0.005], 0, 'badgeSun'),
      E([-0.01, -0.004, 0.008], [0.032, 0.013, 0.005], 0, 'badgeHill'),
      E([0, -0.022, 0.008], [0.036, 0.009, 0.005], 0, 'badgeSea'),
    ], { r: [0, 0.45, 0] });
    return [
      C([0, 1.68 + DY_HEAD, 0], 0.056, 0.06, 0.16, 'skin'),                    // 脖子（衣領到下巴之間露出）
      L([0, 0, 0], SHIRT, 'shirt', { s: [1, 1, 0.68] }),                                         // 上衣筒身
      L([0, 0, 0], SHIRT.map(([r, y]) => [r + 0.004, y]), 'shirtLight', { s: [1, 1, 0.68], clip: YOKE }), // 淺藍斜切
      T([0, 0.805, 0], 0.272, 0.01, 'shirt', { r: [PI / 2, 0, 0], s: [1, 0.68, 1] }),
      uo(L([0, DY_HEAD, 0.0], [[0.1, 1.625], [0.085, 1.66], [0.076, 1.68]], 'shirt', { s: [1, 1, 0.95] })),  // 立領（低，露出脖子）
      uo(sym(B([0.05, 1.615 + DY_HEAD, 0.1], [0.078, 0.012, 0.062], 'shirt', { r: [-0.9, 0.35, 0.55], bevel: 0.006 }))), // 翻領
      uo(B([0, sq(1.5), 0.184], [0.048, 0.1, 0.016], 'shirt', { bevel: 0.007 })),     // 門襟
      uo([1.535, 1.475].map((y) => C([0, sq(y), 0.194], 0.011, 0.011, 0.007, 'buttonW', { r: [PI / 2, 0, 0] }))),
      uo(badge),                                                                      // 左胸校徽（+X）
    ];
  }

  // ===== 3. 下半身（短褲骨盆＋腰部內襯） ====================================
  // 腰部內襯用衣服顏色、跟著髖部：上半身扭轉時，衣襬與褲頭之間不會露出空隙
  function lowerBody() {
    STAGE = 3;
    return [
      L([0, 0, 0], [[0, 0.555], [0.14, 0.562], [0.245, 0.59], [0.27, 0.64], [0.27, 0.74], [0.268, 0.76]], 'shorts', { s: [1, 1, 0.66] }),
      L([0, 0, 0], [[0.268, 0.758], [0.262, 0.83], [0.24, 0.9]], 'shirt', { s: [1, 1, 0.66] }),   // 褲頭（衣襬裡面）用衣服的藍色：走動時衣襬掀開也不會露出灰色   // 短褲褲身：直筒、褲頭平（藏在上衣下襬裡）
      E([0, 0.87, 0], [0.245, 0.12, 0.17], 0, 'shirt'),
    ];
  }

  // ===== 4. 四肢（肩→肘→腕→手、髖→膝→踝→鞋），以左側建模再鏡射 ===========
  // 袖子（上臂上的旋轉體）：由肩頭圓頂往下到袖口，略微外擴；grow = 整體加厚（披風袖套用）
  const SLEEVE_TOP = [0.285, 1.56, 0], SLEEVE_END = [0.331, ay(1.34), 0];
  function sleeve(grow, m) {
    const d = [SLEEVE_TOP[0] - SLEEVE_END[0], SLEEVE_TOP[1] - SLEEVE_END[1], 0];
    const len = Math.hypot(d[0], d[1]), u = [d[0] / len, d[1] / len, 0];
    const pts = [[0.1, -len], [0.095, -len * 0.5], [0.092, -0.01], [0.085, 0.03], [0.066, 0.056], [0.036, 0.071], [0.001, 0.076]]
      .map(([r, y]) => [r + grow, y + (y > 0 ? grow : 0)]);
    return L(SLEEVE_TOP, pts, m, { r: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] });
  }
  // 冒險套裝的披風袖套：跟著上臂轉動，手臂抬起時披風像搭在手臂上，袖子不會從披風穿出來；站直時整個藏在披風裡
  function capeShoulder() {
    const s0 = STAGE; STAGE = 6;
    const n = joint('outfitCapeArmL', SK.upperArmL, [sleeve(0.014, 'red')]);
    STAGE = s0;
    return n;
  }
  function arm() {
    STAGE = 4;
    const g = GRIP_L;
    return joint('upperArmL', SK.upperArmL, [
      sleeve(0, 'shirt'),                                                       // 袖子：圓肩＋袖筒一體，袖口開放（不加環）
      seg([0.32, ay(1.45), 0], [0.345, ay(1.27), 0], 0.053, 0.049, 'skin'),
      E([0.345, ay(1.27), 0], [0.049, 0.049, 0.049], 0, 'skin'),
      joint('forearmL', SK.forearmL, [
        seg([0.345, ay(1.27), 0], [0.36, ay(0.97), 0.01], 0.047, 0.04, 'skin'),
        E([0.36, ay(0.97), 0.01], [0.04, 0.04, 0.04], 0, 'skin'),
        joint('handL', SK.handL, [
          // 拳頭：手掌握成圓拳（握點穿過拳心，長柄會從拇指側與小指側伸出），拇指壓在前上方
          E([0.367, ay(0.97) - 0.062, 0.028], [0.047, 0.056, 0.052], [0, 0, 0.05], 'skin'),
          E([0.38, ay(0.97) - 0.088, 0.03], [0.036, 0.024, 0.048], [0, 0, 0.1], 'skin'),          // 指節
          E([0.338, ay(0.97) - 0.05, 0.062], [0.019, 0.034, 0.02], [0.45, 0, 0.25], 'skin'),     // 拇指
          // 掛點：手持物品（props.js）掛在這裡；特效掛點在預設槍口位置
          joint('propL', g, []),
          joint('fxL', add(g, MUZZLE), [], OFF),
        ]),
      ]),
      capeShoulder(),
    ]);
  }
  // ol(node, t)：卡通黑色輪廓線（外擴 t 公尺的背面殼）
  const ol = (n, t = 0.006) => { n.ol = t; return n; };
  function leg() {
    STAGE = 4;
    // 灰色鞋帶：貼在鞋面上（依鞋面橢球算高度與傾斜），每段一橫＋交叉，最後打個小結
    const shoeY = (z) => 0.065 + 0.065 * Math.sqrt(Math.max(0, 1 - ((z - 0.045) / 0.13) ** 2));
    const shoeTilt = (z) => Math.atan2(-(shoeY(z + 0.001) - shoeY(z - 0.001)), 0.002);
    const lace = (x, z, w, rz) => B([x, shoeY(z) + 0.004, z], [w, 0.006, 0.008], 'lace', { r: [-shoeTilt(z), 0, rz], bevel: 0.003 });
    const laces = [0.035, 0.065, 0.095].flatMap((z) => [lace(LX, z, 0.046, 0), lace(LX, z + 0.015, 0.05, 0.55), lace(LX, z + 0.015, 0.05, -0.55)]);
    laces.push(E([LX, shoeY(0.02) + 0.008, 0.02], [0.014, 0.009, 0.01], 0, 'lace'),   // 蝴蝶結
      ...[-1, 1].map((k) => E([LX + k * 0.02, shoeY(0.02) + 0.01, 0.02], [0.02, 0.007, 0.009], [0, 0, k * 0.4], 'lace')));
    return joint('thighL', SK.thighL, [
      seg([LX - 0.003, 0.66, 0], [LX, 0.47, 0], 0.13, 0.132, 'shorts'),     // 短褲褲管：直筒、停在膝蓋上方
      seg([LX, 0.5, 0], [LX, 0.32, 0], 0.08, 0.072, 'skin'),
      E([LX, 0.32, 0], [0.07, 0.07, 0.07], 0, 'skin'),
      joint('shinL', SK.shinL, [
        seg([LX, 0.32, 0], [LX, 0.12, 0], 0.068, 0.052, 'skin'),
        E([LX, 0.12, 0], [0.052, 0.052, 0.052], 0, 'skin'),
        joint('footL', SK.footL, [
          ol(E([LX, 0.065, 0.045], [0.075, 0.065, 0.13], 0, 'shoe')),
          ol(C([LX, 0.02, 0.045], 0.078, 0.078, 0.04, 'sole', { s: [1, 1, 1.7] })),
          T([LX, 0.118, -0.008], 0.052, 0.011, 'shoe', { r: [PI / 2 - 0.2, 0, 0] }),
          laces,
        ]),
      ]),
    ]);
  }

  // ===== 5. 五官（細長笑眼、細眉、小鼻、露齒笑、下巴的痣） =================
  function face() {
    STAGE = 5;
    const eyeAt = [0.085, 1.973, 0.219], ry = 0.38;   // 眼睛略低（眉毛與頭髮間距較寬，接近原畫）
    const eyeL = [
      joint('eyeOpenL', eyeAt, [G(eyeAt, [
        E([0, 0, 0], [0.034, 0.019, 0.012], 0, 'eye'),
        T([0, -0.004, 0.006], 0.036, 0.006, 'line', { arc: PI * 0.8 }),   // 上眼皮
        E([0.009, 0.005, 0.01], [0.007, 0.007, 0.004], 0, 'white'),
      ], { r: [0, ry, 0] })]),
      joint('eyeHappyL', eyeAt, [T(add(eyeAt, [0, -0.01, 0]), 0.032, 0.008, 'line', { arc: PI * 0.75, r: [0, ry, 0] })], OFF),
      joint('eyeSadL', eyeAt, [T(add(eyeAt, [0, -0.012, 0]), 0.032, 0.008, 'line', { arc: PI * 0.65, r: [0, ry, -0.35] })], OFF),
      joint('eyeShutL', eyeAt, [T(eyeAt, 0.028, 0.008, 'line', { arc: PI * 0.7, r: [0, ry, PI] })], OFF),
      joint('browL', [0.09, 2.045, 0.229], [E([0.09, 2.045, 0.229], [0.042, 0.0105, 0.009], [0, ry, -0.08], 'brow')]),
    ];
    const mAt = [0, 1.835, 0.197];
    return [
      eyeL, eyeL.map(mirror),
      E([0, 1.915, 0.226], [0.03, 0.022, 0.022], 0, 'skinShade'),                  // 鼻子
      sym(E([0.012, 1.903, 0.24], [0.007, 0.005, 0.004], 0, 'nostril')),
      sym(E([0.13, 1.885, 0.171], [0.04, 0.024, 0.012], [0, 0.65, 0], 'blush')),
      E([-0.012, 1.778, 0.145], [0.006, 0.006, 0.003], [-0.8, 0, 0], 'mole'),       // 下巴的痣（角色右側）
      joint('mouthSmile', mAt, [E(mAt, [0.05, 0.02, 0.01], 0, 'mouth'), E(add(mAt, [0, 0.008, 0.005]), [0.04, 0.008, 0.006], 0, 'white'), E(add(mAt, [0, -0.009, 0.005]), [0.024, 0.008, 0.006], 0, 'tongue')]),
      joint('mouthGrin', mAt, [E(add(mAt, [0, -0.006, 0]), [0.06, 0.036, 0.012], 0, 'mouth'), E(add(mAt, [0, 0.018, 0.007]), [0.047, 0.009, 0.007], 0, 'white'), E(add(mAt, [0, -0.022, 0.007]), [0.034, 0.012, 0.007], 0, 'tongue')], OFF),
      joint('mouthSad', mAt, [T(add(mAt, [0, -0.018, 0]), 0.03, 0.007, 'line', { arc: PI * 0.7 })], OFF),
      joint('mouthO', mAt, [E(mAt, [0.022, 0.028, 0.01], 0, 'mouth')], OFF),
      joint('mouthLine', mAt, [T(add(mAt, [0, 0.055, 0]), 0.062, 0.007, 'line', { arc: 0.55, r: [0, 0, PI] })], OFF),
    ];
  }

  // ===== 6. 冒險套裝（參考小飛：皮革飛行帽＋紅色小披風） ====================
  function outfitHat() {
    STAGE = 6;
    const tilt = -0.25, c = [0, 2.03, -0.012], s = [0.28, 0.305, 0.295], base = 1.3;
    const ringY = Math.cos(base) * s[1], ringR = Math.sin(base);
    const sherpa = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * 2 * PI;
      sherpa.push(E([ringR * s[0] * Math.sin(a), ringY, ringR * s[2] * Math.cos(a)], [0.034, 0.03, 0.03], [0, a, 0], 'cream'));
    }
    const seams = [-0.5, 0, 0.5].map((a) => {
      const out = [];
      for (let t = 0.12; t < base; t += 0.1)
        out.push(G([s[0] * Math.sin(t) * Math.sin(a), s[1] * Math.cos(t), s[2] * Math.sin(t) * Math.cos(a)], [E([0, 0, 0], [0.005, 0.015, 0.004], [t + PI / 2, 0, 0], 'thread')], { r: [0, a, 0] }));
      return out;
    });
    const lens = G([0.07, 0, 0], [
      C([0, 0, -0.012], 0.058, 0.058, 0.026, 'leatherDark', { r: [PI / 2, 0, 0] }),
      C([0, 0, 0.004], 0.045, 0.045, 0.022, 'glass', { r: [PI / 2, 0, 0] }),
      T([0, 0, 0.01], 0.048, 0.012, 'glassRim'),
    ]);
    const wing = G([0.25, 0.15, 0.0], [
      E([0.05, 0.035, 0], [0.068, 0.03, 0.017], [0, 0, 0.55], 'white'),
      E([0.072, 0.0, 0], [0.08, 0.027, 0.017], [0, 0, 0.15], 'white'),
      E([0.055, -0.035, 0], [0.06, 0.025, 0.017], [0, 0, -0.25], 'white'),
    ], { r: [0, 0.35, 0] });
    // 耳罩：扁平貼著耳朵，下緣一顆金色釦子
    const flap = G([0.248, -0.075, 0.01], [E([0, 0, 0], [0.02, 0.085, 0.06], 0, 'leather'), E([0.016, -0.06, 0.018], [0.013, 0.013, 0.008], [0, 0.4, 0], 'gold')], { r: [0, 0.1, 0.06] });
    return joint('outfitHat', SK.head, [G(c, [
      SH([0, 0, 0], 1, base, 0, 1, 0.02, 'leather', { s }),
      seams,
      T([0, ringY, 0], ringR * s[0], 0.021, 'cream', { r: [PI / 2, 0, 0], s: [1, s[2] / s[0], 1] }),
      sherpa,
      G([0, 0.22, 0.2], [sym(lens), B([0, 0, -0.008], [0.05, 0.02, 0.02], 'leatherDark'), ST([0, -0.06, 0.016], 5, 0.03, 0.014, 0.01, 'gold')], { r: [-0.8, 0, 0] }),
      sym(wing), sym(flap),
      E([0, 0.315, 0], [0.04, 0.04, 0.04], 0, 'yellow'),
    ], { r: [tilt, 0, 0] })]);
  }
  function outfitCape() {
    STAGE = 6;
    const phi0 = 0.45, phiLen = 2 * PI - 0.9, zs = 0.7;
    const prof = [[0.11, 1.665], [0.2, 1.688], [0.3, 1.683], [0.39, 1.62], [0.455, 1.49], [0.485, 1.36]];
    const trim = [];
    for (let k = 0; k < 26; k++) {
      const f = phi0 + phiLen * (k / 25);
      trim.push(E([0.497 * Math.sin(f), 1.36, 0.497 * zs * Math.cos(f)], [0.04, 0.027, 0.03], [0, f, 0], 'cream'));
    }
    [phi0, phi0 + phiLen].forEach((f) => prof.forEach(([r, y]) => trim.push(E([(r + 0.012) * Math.sin(f), y, (r + 0.012) * zs * Math.cos(f)], [0.03, 0.03, 0.03], 0, 'cream'))));
    const pompom = (x) => G([x, 1.37, 0.26], [C([0, 0.01, 0], 0.004, 0.004, 0.045, 'cream'), E([0, -0.026, 0], [0.025, 0.025, 0.025], 0, 'white')]);
    const wingBadge = (a) => G([0.475 * Math.sin(a), 1.44, 0.475 * zs * Math.cos(a)], [
      E([0, 0, 0], [0.02, 0.02, 0.011], 0, 'gold'),
      sym(E([0.036, 0.005, 0], [0.036, 0.014, 0.007], [0, 0, 0.25], 'cream')),
    ], { r: [-0.5, a, 0] });
    return shift(joint('outfitCape', SK.chest, [
      L([0, 0, 0], prof, 'red', { phiStart: phi0, phiLength: phiLen, s: [1, 1, zs] }),
      trim,
      T([0, 1.645, 0], 0.095, 0.034, 'red', { r: [PI / 2 + 0.2, 0, 0] }),
      T([0, 1.62, 0.01], 0.11, 0.02, 'cream', { r: [PI / 2 + 0.25, 0, 0] }),
      [-0.16, -0.07, 0.07, 0.16].map(pompom),
      G([0, 1.585, 0.16], [C([0, 0, 0], 0.04, 0.04, 0.012, 'gold', { r: [PI / 2, 0, 0] }), B([0, 0, 0.009], [0.048, 0.011, 0.004], 'goldDark'), B([0, 0.005, 0.009], [0.011, 0.038, 0.004], 'goldDark')], { r: [0.25, 0, 0] }),
      wingBadge(1.65), wingBadge(-1.65), wingBadge(PI),
    ]), DY_HEAD);
  }

  // ===== 7. 鹹蛋超人 COSPLAY（面罩推到頭頂當帽子戴、露出臉；衣褲改銀紅緊身衣由材質切換） ======
  function ultraHead() {
    STAGE = 6;
    const c = [0, 2.03, -0.01], s = [0.276, 0.296, 0.285], base = 1.16;
    const fin = [];
    for (let t = 1.0; t >= -1.15; t -= 0.075) {   // 冠脊：從額頭上方沿正中線越過頭頂到後腦
      const h = 0.03 + 0.022 * Math.cos(t * 1.1);
      fin.push(B([0, s[1] * Math.cos(t) + h * 0.45, s[2] * Math.sin(t)], [0.024, h, 0.034], 'ultraSilver', { r: [t, 0, 0], bevel: 0.008 }));
    }
    const eye = G([0.085, 0.17, 0.228], [
      E([0, 0, 0], [0.066, 0.036, 0.022], 0, 'ultraEye'),
      T([0, 0, -0.004], 0.066, 0.006, 'ultraSilver', { s: [1, 0.55, 1] }),
    ], { r: [-0.5, 0.36, 0.28] });
    return joint('outfitUltraHead', SK.head, [G(c, [
      SH([0, 0, 0], 1, base, 0, 1, 0.02, 'ultraSilver', { s }),
      T([0, s[1] * Math.cos(base), 0], s[0] * Math.sin(base), 0.014, 'ultraRed', { r: [PI / 2, 0, 0], s: [1, s[2] / s[0], 1] }),
      fin, sym(eye),
      sym(E([0.268, 0.06, 0.02], [0.016, 0.05, 0.03], [0, 0, 0.25], 'ultraSilver')),   // 兩側耳翼
    ])]);
  }
  function ultraBody() {
    STAGE = 6;
    const y = sq(1.45);
    return joint('outfitUltraBody', SK.chest, [
      C([0, y, 0.178], 0.05, 0.05, 0.016, 'ultraSilver', { r: [PI / 2, 0, 0] }),         // 彩色計時器：銀框
      E([0, y, 0.188], [0.036, 0.036, 0.016], 0, 'ultraTimer'),                          // 藍色燈
      E([0, y + 0.012, 0.2], [0.012, 0.008, 0.004], 0, 'white'),                         // 反光
    ]);
  }

  // ===== 8. 遊戲用造型：冒險服（黃色探險背心＋後背包）、小飯團圍巾 =====================
  function explorerVest() {
    STAGE = 6;
    const prof = SHIRT.filter(([, y]) => y > 0.85 && y < 1.34).map(([r, y]) => [r + 0.02, y]);
    const strap = (x) => [B([x, sq(1.5), 0.17], [0.05, 0.2, 0.014], 'leatherDark', { r: [-0.2, 0, 0], bevel: 0.006 }), B([x, sq(1.5), -0.17], [0.05, 0.2, 0.014], 'leatherDark', { r: [0.2, 0, 0], bevel: 0.006 }), B([x, 1.33, 0], [0.05, 0.016, 0.22], 'leatherDark', { bevel: 0.006 })];
    return joint('outfitVest', SK.chest, [
      L([0, 0, 0], prof, 'vest', { phiStart: 0.42, phiLength: 2 * PI - 0.84, s: [1, 1, 0.7] }),          // 前開的黃色背心
      [-1, 1].map((k) => B([k * 0.14, sq(1.18), 0.19], [0.07, 0.06, 0.02], 'vestPocket', { r: [0, k * 0.3, 0], bevel: 0.008 })),   // 胸前口袋
      strap(0.14), strap(-0.14),
      B([0, sq(1.25), -0.25], [0.3, 0.3, 0.13], 'leather', { bevel: 0.05 }),                             // 後背包
      B([0, sq(1.4), -0.27], [0.3, 0.1, 0.14], 'leatherDark', { bevel: 0.04 }),                          // 背包蓋
      C([0, sq(1.37), -0.33], 0.018, 0.018, 0.01, 'gold', { r: [PI / 2, 0, 0] }),                         // 釦子
    ]);
  }
  function riceScarf() {
    STAGE = 6;
    const y = 1.36;
    return joint('outfitScarf', SK.chest, [
      T([0, y, 0.0], 0.1, 0.034, 'scarf', { r: [PI / 2 + 0.12, 0, 0], s: [1.08, 1, 1] }),
      B([0.06, y - 0.09, 0.115], [0.07, 0.15, 0.024], 'scarf', { r: [0.15, 0, -0.18], bevel: 0.01 }),     // 垂下的圍巾尾
      B([0.1, y - 0.07, 0.1], [0.06, 0.12, 0.022], 'scarfDark', { r: [0.1, 0, -0.5], bevel: 0.01 }),
    ]);
  }

  // ---- 組裝 ----------------------------------------------------------------
  function build() {
    const hb = headBase(), ub = upperBody(), lb = lowerBody();
    const armL = shift(arm(), DY_ARM), legL = leg();
    const fc = face();
    const hat = outfitHat(), cape = outfitCape(), uHead = ultraHead(), uBody = ultraBody(), vest = explorerVest(), scarf = riceScarf();
    STAGE = 7;
    const g = GRIP_L;
    const ballSocket = joint('ball', [-g[0], g[1] + DY_ARM - 0.01, 0.08], [], OFF); // 球的掛點（掛在根節點，可飛出去）
    const head = shift(joint('head', SK.head, [hb, fc, hat, uHead]), DY_HEAD);
    const chest = joint('chest', SK.chest, [ub, armL, mirror(armL), head, cape, uBody, vest, scarf]);
    const hips = joint('hips', SK.hips, [lb, legL, mirror(legL), chest]);
    const tree = [joint('root', SK.root, [hips, ballSocket])];
    recomputeAT(tree);
    return tree;
  }
  // 依最終節點樹重算各關節的世界座標（頭、手臂整組移動後，子關節位置跟著更新）
  function rotXYZ([a, b, c], [x, y, z]) {
    const x1 = x * Math.cos(c) - y * Math.sin(c), y1 = x * Math.sin(c) + y * Math.cos(c);
    const x2 = x1 * Math.cos(b) + z * Math.sin(b), z2 = -x1 * Math.sin(b) + z * Math.cos(b);
    return [x2, y1 * Math.cos(a) - z2 * Math.sin(a), y1 * Math.sin(a) + z2 * Math.cos(a)];
  }
  function recomputeAT(nodes) {
    const walk = (n, toWorld) => {
      const local = (v) => toWorld(add(rotXYZ(n.r, v.map((x, i) => x * (n.s || [1, 1, 1])[i])), n.p));
      if (n.id) { AT[n.id] = local([0, 0, 0]).map((v) => +v.toFixed(5)); LOCALP[n.id] = n.p.slice(); }
      (n.c || []).forEach((c) => walk(c, local));
    };
    nodes.forEach((n) => walk(n, (v) => v));
    Object.keys(SK).forEach((k) => { if (AT[k]) SK[k] = AT[k]; });
  }

  // ---- 材質 ----------------------------------------------------------------
  const MATERIALS = {
    skin: { c: '#F4D2B8', rough: 0.55, sss: 0.4 },
    skinShade: { c: '#EEC2A6', rough: 0.55, sss: 0.4 },
    nostril: { c: '#C98E78', rough: 0.7 },
    blush: { c: '#F2B1A6', rough: 0.85 },
    mole: { c: '#4A3026', rough: 0.7 },
    hair: { c: '#110E0C', rough: 0.8, fabric: 1.6, sheenColor: '#2B2724' },
    hairFuzz: { c: '#110E0C', rough: 0.9, fabric: 1.2, opacity: 0.6, sheenColor: '#110E0C' },
    hairSwirl: { c: '#3A332E', rough: 0.8 },
    eye: { c: '#20140F', rough: 0.15, coat: 1 },
    white: { c: '#FAFAF7', rough: 0.4 },
    line: { c: '#3A2820', rough: 0.6 },
    brow: { c: '#2A201B', rough: 0.8 },
    mouth: { c: '#8A3530', rough: 0.5 },
    tongue: { c: '#E07A78', rough: 0.4 },
    shirt: { c: '#1D6FC4', fabric: 1 },
    shirtLight: { c: '#5BB3E8', fabric: 1 },
    buttonW: { c: '#E8EEF4', rough: 0.3, coat: 0.6 },
    badgeSun: { c: '#F2A53A', rough: 0.6 },
    badgeHill: { c: '#4EA65A', rough: 0.6 },
    badgeSea: { c: '#2F6FB8', rough: 0.6 },
    shorts: { c: '#9A9C9E', fabric: 1 },
    shoe: { c: '#F4F4F2', rough: 0.45, coat: 0.3 },
    sole: { c: '#E3E1DC', rough: 0.7 },
    lace: { c: '#8E8E8E', rough: 0.8 },
    leather: { c: '#6A452F', fabric: 0.8 },
    leatherDark: { c: '#4C3123', fabric: 0.8 },
    cream: { c: '#F3EBDB', fabric: 1 },
    red: { c: '#C0413A', fabric: 1 },
    yellow: { c: '#E2B13E', fabric: 1 },
    thread: { c: '#F5EEE2', rough: 0.8 },
    glass: { c: '#A9D1EA', rough: 0.1, coat: 1, trans: 0.4 },
    glassRim: { c: '#9DBBD6', rough: 0.5 },
    gold: { c: '#D9AE4C', rough: 0.3, metal: 0.95 },
    goldDark: { c: '#A57A28', rough: 0.4, metal: 0.9 },
    vest: { c: '#F2C230', fabric: 1 },
    vestPocket: { c: '#D9A21E', fabric: 1 },
    scarf: { c: '#7FD3C4', fabric: 1 },
    scarfDark: { c: '#5DB8A8', fabric: 1 },
    ultraSilver: { c: '#C8CDD4', rough: 0.28, metal: 0.55, coat: 0.6 },
    ultraRed: { c: '#C9252E', rough: 0.35, coat: 0.5 },
    ultraEye: { c: '#FFF3B8', rough: 0.15, coat: 1, emit: 0.55 },
    ultraTimer: { c: '#3FB6F2', rough: 0.1, coat: 1, emit: 0.9 },
  };

  const CHARACTER = { id: 'kid', name: '小男孩', materials: MATERIALS, parts: build() };
  const STAGES = [
    { n: 1, name: '頭部' }, { n: 2, name: '上半身' }, { n: 3, name: '下半身' }, { n: 4, name: '四肢' },
    { n: 5, name: '五官' }, { n: 6, name: '冒險套裝' },
  ];
  // 掛點：名稱 → 說明（props.js 的物品掛到這些節點上）
  const SOCKETS = {
    propR: '右手持物', propL: '左手持物', ball: '球（可離手飛出）', fxR: '右手特效（槍口）', fxL: '左手特效（槍口）',
  };
  const CAMERA = { focal: 82, sensor: 36, pos: [0, 1.3, 7.4], target: [0, 1.0, 0] };
  const VIEWS = [
    { id: 'front', name: '正面', rotY: 0 },
    { id: 'q', name: '斜側', rotY: 0.7 },
    { id: 'side', name: '側面', rotY: PI / 2 },
    { id: 'back', name: '背面', rotY: PI },
  ];

  const HEAD_TOP = 2.29 + DY_HEAD, HEAD_MID = HEAD_C + DY_HEAD;
  // 碰撞體（節點 node 的靜止世界座標，隨該節點一起動）：武器穿透檢查用，兩套服裝取聯集
  //   sph 球、cap 膠囊（a→b, r）、ell 橢球、ecyl 橢圓柱（rx, rz, 半高 hh）
  const DYH = DY_HEAD, X = (v) => [-v[0], v[1], v[2]];
  const COLLIDERS = [
    { name: '頭', node: 'head', kind: 'sph', c: [0, HEAD_C + DYH, 0], r: 0.3 },                 // 含帽子
    { name: '下巴', node: 'head', kind: 'sph', c: [0, 1.9 + DYH, 0.03], r: 0.215 },
    { name: '帽頂', node: 'head', kind: 'sph', c: [0, HEAD_C + DYH + 0.3, 0], r: 0.08 },
    { name: '左帽翼', node: 'head', kind: 'sph', c: [0.34, HEAD_C + DYH + 0.15, 0], r: 0.1 },
    { name: '右帽翼', node: 'head', kind: 'sph', c: [-0.34, HEAD_C + DYH + 0.15, 0], r: 0.1 },
    { name: '脖子', node: 'chest', kind: 'cap', a: [0, 1.33 + 0.0, 0], b: [0, 1.47, 0], r: 0.075 },
    { name: '軀幹', node: 'chest', kind: 'ecyl', c: [0, 1.1, 0], rx: 0.3, rz: 0.21, hh: 0.31 },
    // 披風是上窄下寬的鐘形：分三層，只有最下面一圈裙襬比軀幹寬
    { name: '披風裙襬', node: 'chest', kind: 'ecyl', c: [0, 1.135, 0], rx: 0.49, rz: 0.345, hh: 0.065, gap: 0.5 },   // gap：正前方開口的半角（弧度）
    { name: '披風中段', node: 'chest', kind: 'ecyl', c: [0, 1.25, 0], rx: 0.42, rz: 0.29, hh: 0.06, gap: 0.5 },
    { name: '骨盆', node: 'hips', kind: 'ell', c: [0, 0.7, 0], rad: [0.27, 0.16, 0.19] },
  ];
  for (const sd of ['L', 'R']) {
    const x = sd === 'L' ? 1 : -1, ua = AT['upperArm' + sd], fa = AT['forearm' + sd], hd = AT['hand' + sd];
    COLLIDERS.push(
      { name: sd + '大腿', node: 'thigh' + sd, kind: 'cap', a: [x * LX, 0.66, 0], b: [x * LX, 0.45, 0], r: 0.14 },
      { name: sd + '膝', node: 'thigh' + sd, kind: 'cap', a: [x * LX, 0.45, 0], b: [x * LX, 0.32, 0], r: 0.08 },
      { name: sd + '小腿', node: 'shin' + sd, kind: 'cap', a: [x * LX, 0.32, 0], b: [x * LX, 0.12, 0], r: 0.07 },
      { name: sd + '腳', node: 'foot' + sd, kind: 'cap', a: [x * LX, 0.065, -0.05], b: [x * LX, 0.065, 0.15], r: 0.075 },
      { name: sd + '上臂', node: 'upperArm' + sd, kind: 'cap', a: ua, b: fa, r: 0.1 },
      { name: sd + '前臂', node: 'forearm' + sd, kind: 'cap', a: fa, b: hd, r: 0.058 },
      { name: sd + '手', node: 'hand' + sd, kind: 'sph', c: [hd[0], hd[1] - 0.07, hd[2] + 0.02], r: 0.07 },
    );
  }
  const CONTACT = {
    colliders: COLLIDERS,
    foot: { L: [[LX, 0, -0.085], [LX, 0, 0.175]], R: [[-LX, 0, -0.085], [-LX, 0, 0.175]] },
    body: [['head', [0, HEAD_TOP, 0]], ['head', [0, HEAD_MID, -0.26]], ['head', [0, HEAD_MID, 0.24]], ['chest', [0, sq(1.4), -0.18]], ['chest', [0, 1.0, -0.18]],
      ['hips', [0, 0.59, -0.12]], ['shinL', [LX, 0.32, 0.07]], ['shinR', [-LX, 0.32, 0.07]]],
    butt: ['hips', [0, 0.57, -0.06]],
    gripR: [-GRIP_L[0], GRIP_L[1] + DY_ARM, GRIP_L[2]], gripL: [GRIP_L[0], GRIP_L[1] + DY_ARM, GRIP_L[2]],
  };
  root.__KID_PARTS__ = { SK, AT, LOCALP, GRIP_L, MUZZLE, OFF, ON, PI, CONTACT };
  // 服裝：nodes = 該套裝才顯示的節點；swap = 材質替換（頭部以外的皮膚＝緊身衣）；uo 零件（制服配件）在其他套裝隱藏
  const OUTFITS = [
    { id: 'uniform', name: '制服', nodes: [] },
    { id: 'adventure', name: '冒險套裝', nodes: ['outfitHat', 'outfitCape', 'outfitCapeArmL', 'outfitCapeArmR'] },
    { id: 'explorer', name: '冒險服（背心）', nodes: ['outfitVest'] },
    { id: 'scarf', name: '小飯團圍巾', nodes: ['outfitScarf'] },
    { id: 'ultra', name: '鹹蛋超人', nodes: ['outfitUltraHead', 'outfitUltraBody'], hideUniform: true,
      swap: { shirt: 'ultraSilver', shirtLight: 'ultraRed', shorts: 'ultraRed', skin: 'ultraSilver', shoe: 'ultraSilver', sole: 'ultraRed' } },
  ];
  const api = { CHARACTER, STAGES, SOCKETS, CAMERA, VIEWS, SK, AT, MUZZLE, OUTFITS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KID_BLUEPRINT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
