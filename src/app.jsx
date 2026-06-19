/* =============================================================================
 *  앱 본체 — BRO FITNESS 단독 / 밝고 고급스러운 톤 + 강한 오렌지 포인트
 *  내용 수정은 src/content.js 에서, 디자인/구조 수정은 이 파일에서.
 * ========================================================================== */
const { useState, useEffect, useRef } = React;
const C = window.CONTENT;

/* ---------- 라우팅 (해시 기반, 빌드 없이 동작) ---------- */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const on = () => { setHash(window.location.hash || "#/"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash.replace(/^#/, "");
}
const go = (path) => { window.location.hash = path; };

/* ---------- 스크롤 등장 애니메이션 ---------- */
function Reveal({ children, className = "", delay = 0, as: Tag = "div", ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { el.style.animationDelay = delay + "ms"; el.classList.add("in"); io.unobserve(el); }
      });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={"reveal " + className} {...rest}>{children}</Tag>;
}

/* ---------- 안전 이미지 (로드 실패 시 플레이스홀더) ---------- */
function Img({ src, alt, className, dark }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div className={(className || "") + " flex items-center justify-center " + (dark ? "bg-char2 text-white/30" : "bg-ivory text-taupe/40")}>
        <span className="text-xs tracking-wider2">PHOTO</span>
      </div>
    );
  }
  return <img src={src} alt={alt || ""} loading="lazy" onError={() => setErr(true)} className={className} />;
}

/* ---------- 공통 버튼 ---------- */
function Btn({ children, onClick, href, variant = "bro", size = "md", className = "" }) {
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-base" };
  const variants = {
    bro:     "bg-bro hover:bg-broDark text-white shadow-lg shadow-bro/25",       // 주황 (기본)
    dark:    "bg-ink hover:bg-char2 text-white",                                  // 검정 포인트
    outline: "border border-ink/15 hover:border-bro hover:text-bro text-ink",    // 밝은 배경용
    light:   "bg-white text-ink hover:bg-white/90",                              // 어두운/오렌지 배경용
    ghost:   "border border-white/45 text-white hover:bg-white hover:text-ink",  // 오렌지 배경 위 보조
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

/* ---------- 작은 부품 ---------- */
function Eyebrow({ children, light }) {
  return (
    <p className={`inline-flex items-center gap-2.5 font-display tracking-wider2 text-sm mb-3 ${light ? "text-white/90" : "text-bro"}`}>
      <span className={`h-px w-7 ${light ? "bg-white/45" : "bg-bro/45"}`} />
      {children}
    </p>
  );
}
function SectionTitle({ children, className = "" }) {
  return <h2 className={`text-3xl md:text-5xl font-bold leading-[1.12] tracking-tight whitespace-pre-line ${className}`}>{children}</h2>;
}
/* 브랜드 심볼 마크 — 실제 BRO FITNESS 로고 (헤더 대체/푸터/칼럼 공용) */
function BrandMark({ className = "h-8 w-8" }) {
  return <img src="img/logo-bro.png" alt="BRO FITNESS" className={`object-contain ${className}`} />;
}
/* 로고 */
function Logo({ onClick, light }) {
  if (C.brand.logo) return <img src={C.brand.logo} alt="BRO FITNESS" onClick={onClick} className="h-11 cursor-pointer" />;
  return (
    <button onClick={onClick} className="group flex items-center gap-2 select-none">
      <BrandMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl tracking-wide text-bro leading-none">BRO</span>
        <span className={`font-display text-lg tracking-wider2 leading-none ${light ? "text-white" : "text-ink"}`}>FITNESS</span>
      </span>
    </button>
  );
}

/* ===========================================================================
 *  헤더 (밝은 톤)
 * ======================================================================== */
function Header({ route }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on(); window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [route]);

  const links = [
    { label: "브랜드 소개", path: "/about" },
    { label: "요금제", path: "/pricing" },
    { label: "프로그램", path: "/programs" },
    { label: "지점 소개", path: "/branches" },
    { label: "트레이너", path: "/trainers" },
    { label: "칼럼", path: "/column" },
    { label: "채용", path: "/careers" },
  ];

  // 칼럼 상세(다크 시네마틱 히어로)에서는 스크롤 전 내비를 흰색으로
  const darkTop = route.startsWith("/column/") && !scrolled;

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-cream/90 backdrop-blur border-b border-ink/5 shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-8xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Logo onClick={() => go("/")} />

        <nav className={`hidden lg:flex items-center gap-8 text-sm font-semibold ${darkTop ? "text-white/85" : "text-ink/80"}`}>
          {links.map((l) =>
            l.children ? (
              <div key={l.label} className="relative group">
                <button
                  className={`flex items-center gap-1 transition-colors hover:text-bro ${route.startsWith(l.match) ? "text-bro" : ""}`}>
                  {l.label}
                  <span className="text-[9px] mt-0.5 transition-transform duration-200 group-hover:rotate-180">▼</span>
                </button>
                {/* 호버 드롭다운 (pt-3 가 버튼↔패널 사이 hover 다리 역할) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                  <div className="bg-cream rounded-2xl shadow-xl ring-1 ring-ink/10 p-2 min-w-[170px]">
                    {l.children.map((c) => (
                      <button key={c.path} onClick={() => go(c.path)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-bro/10 hover:text-bro ${route === c.path ? "text-bro bg-bro/5" : "text-ink/80"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button key={l.path} onClick={() => go(l.path)}
                className={`relative transition-colors hover:text-bro ${route === l.path ? "text-bro" : ""}`}>
                {l.label}
              </button>
            )
          )}
          <Btn size="sm" variant="bro" onClick={() => go("/booking")}>예약·상담</Btn>
        </nav>

        <button className="lg:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="메뉴">
          <div className="w-6 space-y-1.5">
            <span className={`block h-0.5 ${darkTop ? "bg-white" : "bg-ink"} transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 ${darkTop ? "bg-white" : "bg-ink"} ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 ${darkTop ? "bg-white" : "bg-ink"} transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-cream border-t border-ink/5">
          <div className="px-5 py-4 flex flex-col gap-1">
            {links.map((l) =>
              l.children ? (
                <div key={l.label}>
                  <div className="py-3 px-2 font-semibold text-ink">{l.label}</div>
                  <div className="pl-3 flex flex-col border-l border-ink/10 ml-2">
                    {l.children.map((c) => (
                      <button key={c.path} onClick={() => go(c.path)} className="text-left py-2.5 px-3 rounded-lg hover:bg-ink/5 text-ink/75 text-sm">{c.label}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <button key={l.path} onClick={() => go(l.path)} className="text-left py-3 px-2 rounded-lg hover:bg-ink/5 font-semibold text-ink">{l.label}</button>
              )
            )}
            <Btn className="mt-2 w-full" variant="bro" onClick={() => go("/booking")}>예약·상담 신청</Btn>
          </div>
        </div>
      )}
    </header>
  );
}

/* ===========================================================================
 *  플로팅 CTA (모바일 우선 · 검정 바 + 오렌지 포인트)
 * ======================================================================== */
function FloatingCTA({ route }) {
  if (route === "/booking") return null;
  const branchMatch = route.match(/^\/branch(?:es)?\/(\w+)/);
  const branch = C.branches.find((b) => b.id === (branchMatch ? branchMatch[1] : "yongam")) || C.branches[0];
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:bottom-5 lg:inset-x-auto lg:right-5">
      <div className="lg:rounded-2xl lg:shadow-2xl overflow-hidden flex divide-x divide-white/15 bg-ink/95 backdrop-blur">
        <button onClick={() => go("/booking")} className="flex-1 lg:flex-none lg:w-36 py-3.5 lg:px-4 text-white text-sm font-bold bg-bro hover:bg-broDark">무료체험 예약</button>
        {branch.kakao ? (
          <a href={branch.kakao} target="_blank" rel="noopener noreferrer" className="flex-1 lg:flex-none lg:w-28 py-3.5 lg:px-4 text-center text-white text-sm font-medium hover:bg-white/10">상담 문의</a>
        ) : (
          <button onClick={() => go("/booking")} className="flex-1 lg:flex-none lg:w-28 py-3.5 lg:px-4 text-white text-sm font-medium hover:bg-white/10">상담 문의</button>
        )}
        <a href={branch.naver} target="_blank" rel="noopener noreferrer" className="flex-1 lg:flex-none lg:w-32 py-3.5 lg:px-4 text-center text-sm font-medium text-[#03C75A] hover:bg-white/10">N 플레이스</a>
      </div>
    </div>
  );
}

/* ===========================================================================
 *  메인(홈)
 * ======================================================================== */
function Home() {
  return (
    <main className="bg-cream text-ink">
      {/* 히어로 — 밝은 스플릿 */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 lg:grid lg:grid-cols-12">
          <div className="hidden lg:block lg:col-span-7" />
          <div className="lg:col-span-5 h-full">
            <Img src={C.hero.image} dark className="w-full h-full object-cover" alt="브로피트니스" />
          </div>
        </div>
        {/* 밝은 그라데이션으로 사진 위를 덮어 좌측을 화사하게 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/95 lg:via-cream/85 to-cream/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-cream/60 to-transparent lg:hidden" />
        {/* 시각 디테일: 좌측 텍스트 뒤 따뜻한 글로우 + 미세 도트 */}
        <div className="orb bg-bro/15 w-[36rem] h-[36rem] -top-44 -left-40" />
        <div className="absolute inset-y-0 left-0 w-1/2 bg-grid opacity-50 [mask-image:linear-gradient(to_right,black,transparent)]" />

        <div className="relative max-w-8xl mx-auto px-5 lg:px-8 w-full">
          <Reveal className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-ink text-white text-xs font-semibold rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-bro" /> 청주 용암 · 금천 · 복대
            </div>
            <p className="font-display text-bro tracking-wider2 text-base md:text-lg mb-4">{C.hero.subEn}</p>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight whitespace-pre-line mb-6">{C.hero.title}</h1>
            <p className="text-ink/60 text-lg max-w-md mb-9">{C.hero.desc}</p>
            <div className="flex flex-wrap gap-3 mb-12">
              <Btn size="lg" variant="bro" onClick={() => go("/booking")}>무료체험 예약하기</Btn>
              <Btn size="lg" variant="outline" onClick={() => go("/pricing")}>요금 보기 →</Btn>
            </div>
            {/* 핵심 지표 */}
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {C.hero.stats.map((s, i) => (
                <div key={i}>
                  <p className="text-3xl font-bold tracking-tight">{s.num}<span className="text-bro text-lg ml-1">{s.unit}</span></p>
                  <p className="text-ink/50 text-sm mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 핵심 3블록 */}
      <section className="relative overflow-hidden py-20 lg:py-28 bg-ivory">
        <div className="orb bg-bro/10 w-[32rem] h-[32rem] -top-32 -right-32" />
        <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="text-center mb-14 max-w-2xl mx-auto">
            <Eyebrow>WHY BRO FITNESS</Eyebrow>
            <SectionTitle>{"헬스장 말고,\n운동 구독 서비스"}</SectionTitle>
            <p className="text-ink/55 mt-4 text-lg">넷플릭스처럼 한 달 단위로. 부담은 빼고 습관만 남기세요.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {C.broPoints.map((p, i) => (
              <Reveal key={i} delay={i * 90}
                className={`group rounded-3xl p-8 transition-all duration-300 ${p.dark
                  ? "bg-ink text-white shadow-xl shadow-ink/25 ring-1 ring-white/10"
                  : "bg-white text-ink ring-1 ring-ink/[0.06] shadow-sm hover:shadow-2xl hover:shadow-ink/10 hover:-translate-y-1.5 hover:ring-bro/25"}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold mb-5 transition-transform duration-300 group-hover:scale-110 ${p.dark ? "bg-bro text-white shadow-lg shadow-bro/30" : "bg-bro/12 text-bro"}`}>{p.icon}</div>
                <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                <p className={p.dark ? "text-white/70 leading-relaxed" : "text-ink/55 leading-relaxed"}>{p.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 브랜드 철학 매니페스토 — 걷어낸 4가지 */}
      <Manifesto />

      {/* 프로그램 미리보기 */}
      <ProgramsPreview />

      {/* 시설 갤러리 */}
      <Gallery />

      {/* 공감 체크리스트 (Pain Point) */}
      <PainPoints />

      {/* 요금 하이라이트 — 요금제 페이지의 금액 카드(월 구독 + 반값 행사) */}
      <section className="py-20 lg:py-28 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="text-center mb-10 lg:mb-12">
            <Eyebrow>MEMBERSHIP</Eyebrow>
            <SectionTitle>{"이번 달부터, 34,900원"}</SectionTitle>
            <p className="text-ink/55 mt-3 text-lg">복잡한 약정 없이 한 달 단위 구독. 마음에 안 들면 그냥 멈추면 됩니다.</p>
          </Reveal>

          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-5">
            {/* 메인 요금 카드 — 검정 + 오렌지 */}
            <Reveal className="lg:col-span-3 bg-ink text-white rounded-3xl p-8 lg:p-10 relative overflow-hidden ring-1 ring-white/10">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-bro to-transparent" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-bro/25 rounded-full blur-3xl" />
              <div className="relative">
                <p className="font-display text-bro text-lg tracking-wide mb-1">{C.pricing.main.name}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-6xl md:text-7xl font-bold tracking-tight text-bro">{C.pricing.main.price}</span>
                  <span className="text-white/60 mb-2 text-lg">{C.pricing.main.unit}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-7">
                  {C.pricing.main.badges.map((b, i) => (
                    <span key={i} className="text-xs font-semibold bg-white/10 text-white px-3 py-1.5 rounded-full">{b}</span>
                  ))}
                </div>
                <ul className="space-y-3 mb-8">
                  {C.pricing.main.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/85"><span className="text-bro">✓</span>{f}</li>
                  ))}
                </ul>
                <Btn size="lg" variant="bro" className="w-full" onClick={() => go("/booking")}>{C.pricing.main.cta}</Btn>
              </div>
            </Reveal>

            {/* 프로모 카드 — 풀 오렌지 */}
            <Reveal delay={120} className="lg:col-span-2 bg-gradient-to-br from-bro to-broDark text-white rounded-3xl p-8 flex flex-col">
              <span className="self-start text-xs font-bold bg-white text-bro px-3 py-1.5 rounded-full mb-5 animate-pulse">{C.pricing.promo.tag}</span>
              <h3 className="text-2xl font-bold leading-snug mb-3">{C.pricing.promo.title}</h3>
              <p className="text-white/85 leading-relaxed mb-6 flex-1">{C.pricing.promo.desc}</p>
              <Btn size="lg" variant="light" className="w-full" onClick={() => go("/booking")}>{C.pricing.promo.cta}</Btn>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 가격 투명성 선언 (오렌지 밴드) */}
      <Transparency />

      {/* 구독 vs 등록 비교 */}
      <CompareHome />

      {/* 시작 4단계 */}
      <Process data={C.process} />

      {/* 지점 미리보기 */}
      <BranchPreview />

      {/* 트레이너 미리보기 */}
      <TrainersPreview />

      {/* 눈치 제로 선언 (3-No 약속) */}
      <ZeroPressure />

      {/* 후기 */}
      <section className="py-20 lg:py-28 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="mb-12 text-center max-w-2xl mx-auto">
            <Eyebrow>REAL VOICES</Eyebrow>
            <SectionTitle>{"먼저 다녀본 사람들의 말"}</SectionTitle>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {C.reviews.map((r, i) => (
              <Reveal key={i} delay={i * 80} className="relative bg-white rounded-3xl p-7 ring-1 ring-ink/[0.06] shadow-sm hover:shadow-xl hover:shadow-ink/10 hover:-translate-y-1 transition-all duration-300">
                <span className="absolute top-4 right-6 font-display text-6xl leading-none text-bro/10 select-none">”</span>
                <div className="text-bro text-xl mb-3 tracking-wide">★★★★★</div>
                <p className="relative text-ink/75 leading-relaxed mb-5">“{r.text}”</p>
                <p className="text-sm text-ink/40">{r.name} · {r.branch}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 브랜드 스토리 한 토막 */}
      <StoryTeaser />

      {/* 자주 묻는 질문 */}
      <FAQ data={C.faq} bg="bg-cream" />

      {/* 앱 다운로드 */}
      <AppSection />

      {/* 마무리 CTA */}
      <CTABand />
    </main>
  );
}

/* 지점 미리보기 (홈/지점 공용) */
function BranchPreview() {
  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <Eyebrow>BRANCHES · 청주</Eyebrow>
            <SectionTitle>{"가까운 지점에서 시작하세요"}</SectionTitle>
          </div>
          <p className="text-ink/40">용암 · 금천 · 복대 — 3개 지점</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {C.branches.map((b, i) => (
            <Reveal key={b.id} delay={i * 90} className="group rounded-3xl overflow-hidden bg-white ring-1 ring-ink/[0.06] shadow-sm hover:shadow-2xl hover:shadow-ink/10 hover:-translate-y-1 transition-all duration-300">
              <div className="relative h-52 overflow-hidden cursor-pointer" onClick={() => go("/branch/" + b.id)}>
                <Img src={b.images[0]} dark className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <p className="absolute bottom-4 left-5 font-display text-2xl tracking-wide text-white">{b.name}</p>
              </div>
              <div className="p-6">
                <p className="text-ink/55 text-sm mb-4 leading-relaxed">{b.desc}</p>
                <div className="flex gap-2">
                  <Btn size="sm" variant="bro" onClick={() => go("/branch/" + b.id)}>지점 보기</Btn>
                  <Btn size="sm" variant="outline" href={b.naver}>N 플레이스</Btn>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 앱 다운로드 섹션 — 풀 오렌지 */
function AppSection() {
  return null; // 전용 앱/스토어 미운영 — 섹션 숨김
  const qr = C.app.qr || `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(C.app.qrTarget)}`;
  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-gradient-to-br from-bro to-broDark text-white">
      <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      <div className="orb bg-white/10 w-[28rem] h-[28rem] -bottom-40 -left-32" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <Eyebrow light>{C.app.eyebrow}</Eyebrow>
          <SectionTitle className="mb-4">{C.app.title}</SectionTitle>
          <p className="text-white/85 text-lg mb-8 max-w-md">{C.app.desc}</p>
          <div className="flex flex-wrap gap-3">
            <Btn variant="light" size="lg" href={C.brand.appStore}> App Store</Btn>
            <Btn variant="light" size="lg" href={C.brand.playStore}>▶ Google Play</Btn>
          </div>
        </Reveal>
        <Reveal delay={120} className="flex justify-center lg:justify-end">
          <div className="bg-white rounded-3xl p-6 text-center shadow-2xl">
            <img src={qr} alt="앱 설치 QR" className="w-44 h-44 mx-auto" />
            <p className="text-ink text-sm font-semibold mt-3">QR 스캔 후 바로 설치</p>
            <p className="text-taupe text-xs mt-1">비대면 결제 · 구독 관리</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===========================================================================
 *  추가 공통 섹션들 (페이지 분량 보강)
 * ======================================================================== */

/* 시작/여정 단계 — 번호 카드 그리드 (steps: {no, title|t, desc|d}) */
function Process({ data, bg = "bg-ivory" }) {
  if (!data) return null;
  return (
    <section className={`relative overflow-hidden py-20 lg:py-28 ${bg}`}>
      <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <SectionTitle>{data.title}</SectionTitle>
          {data.desc && <p className="text-ink/55 mt-4 text-lg">{data.desc}</p>}
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.steps.map((s, i) => (
            <Reveal key={i} delay={i * 80} className="group relative bg-white rounded-3xl p-7 ring-1 ring-ink/[0.06] shadow-sm hover:shadow-xl hover:shadow-ink/10 hover:-translate-y-1.5 transition-all duration-300">
              <span className="font-display text-5xl text-bro/20 leading-none group-hover:text-bro/40 transition-colors">{s.no}</span>
              <h3 className="text-lg font-bold mt-3 mb-2">{s.title || s.t}</h3>
              <p className="text-ink/55 text-sm leading-relaxed">{s.desc || s.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* FAQ 아코디언 */
function FAQ({ data, bg = "bg-cream" }) {
  if (!data) return null;
  const [open, setOpen] = useState(0);
  return (
    <section className={`py-20 lg:py-28 ${bg}`}>
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center mb-12">
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <SectionTitle>{data.title}</SectionTitle>
          {data.desc && <p className="text-ink/55 mt-4 text-lg">{data.desc}</p>}
        </Reveal>
        <div className="space-y-3">
          {data.items.map((it, i) => {
            const active = open === i;
            return (
              <Reveal key={i} delay={i * 50} className={`rounded-2xl bg-white ring-1 transition-all duration-200 ${active ? "ring-bro/30 shadow-lg" : "ring-ink/[0.06] hover:ring-ink/15"}`}>
                <button onClick={() => setOpen(active ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left p-5 lg:p-6">
                  <span className="font-bold text-ink">{it.q}</span>
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-lg font-light transition-all duration-300 ${active ? "bg-bro text-white rotate-45" : "bg-ink/5 text-ink/50"}`}>+</span>
                </button>
                <div className={`grid transition-all duration-300 ${active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 lg:px-6 pb-5 lg:pb-6 text-ink/60 leading-relaxed">{it.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* 숫자 스탯 밴드 (검정) */
function StatBand({ stats }) {
  if (!stats) return null;
  return (
    <section className="py-14 lg:py-20 bg-ink text-white">
      <div className="max-w-8xl mx-auto px-5 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 70} className="text-center">
            <p className="font-bold tracking-tight leading-none">
              <span className="text-4xl md:text-5xl text-bro">{s.num}</span>
              <span className="text-xl text-white/70 ml-1">{s.unit}</span>
            </p>
            <p className="text-white/55 text-sm mt-2">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* 아이콘 포함내역 그리드 */
function IncludesGrid({ data }) {
  if (!data) return null;
  return (
    <section className="py-16 lg:py-24 bg-cream">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center mb-12 max-w-2xl mx-auto">
          <Eyebrow>{data.eyebrow}</Eyebrow>
          <SectionTitle>{data.title}</SectionTitle>
          {data.desc && <p className="text-ink/55 mt-4 text-lg">{data.desc}</p>}
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((it, i) => (
            <Reveal key={i} delay={i * 60} className="flex items-start gap-4 bg-white rounded-2xl p-6 ring-1 ring-ink/[0.06] hover:ring-bro/25 hover:shadow-lg transition-all duration-300">
              <span className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-bro/[0.12] ring-1 ring-bro/15 flex items-center justify-center">
                {it.img
                  ? <img src={it.img} alt="" className="w-12 h-12 object-contain drop-shadow-[0_8px_12px_rgba(226,84,10,0.28)]" loading="lazy" />
                  : <span className="text-3xl">{it.icon}</span>}
              </span>
              <div>
                <h3 className="font-bold mb-1">{it.t}</h3>
                <p className="text-ink/55 text-sm leading-relaxed">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 최종 CTA 밴드 (검정 + 오렌지) */
function CTABand() {
  const c = C.cta;
  if (!c) return null;
  return (
    <section className="py-16 lg:py-24 bg-cream">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-ink text-white px-7 py-14 lg:p-16 text-center ring-1 ring-white/10">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-bro to-transparent" />
          <div className="orb bg-bro/25 w-[30rem] h-[30rem] -top-40 left-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <Eyebrow light>{c.eyebrow}</Eyebrow>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 whitespace-pre-line leading-tight">{c.title}</h2>
            <p className="text-white/65 text-lg max-w-md mx-auto mb-9">{c.desc}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Btn size="lg" variant="bro" onClick={() => go("/booking")}>{c.primary}</Btn>
              <Btn size="lg" variant="ghost" onClick={() => go("/pricing")}>{c.secondary}</Btn>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ===========================================================================
 *  홈 전용 보강 섹션들
 * ======================================================================== */

/* [C] 공감 체크리스트 — Pain Point 후킹 (밝은 섹션) */
function PainPoints() {
  const p = C.home && C.home.painPoints;
  if (!p) return null;
  return (
    <section className="py-20 lg:py-28 bg-ivory">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <SectionTitle>{p.title}</SectionTitle>
          {p.desc && <p className="text-ink/55 mt-4 text-lg">{p.desc}</p>}
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {(p.items || []).map((t, i) => (
            <Reveal key={i} delay={i * 70} className="group flex items-start gap-4 bg-white rounded-2xl p-6 ring-1 ring-ink/[0.06] shadow-sm hover:ring-bro/30 hover:shadow-lg transition-all duration-300">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-bro/12 text-bro flex items-center justify-center font-bold group-hover:bg-bro group-hover:text-white transition-colors">✓</span>
              <p className="text-ink/80 text-lg leading-snug pt-0.5">{t}</p>
            </Reveal>
          ))}
        </div>
        {p.closing && (
          <Reveal delay={120} className="text-center mt-10">
            <p className="text-xl md:text-2xl font-bold text-ink">{p.closing}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* [D] 가격 투명성 선언 — 풀 오렌지 밴드 */
function Transparency() {
  const t = C.home && C.home.transparency;
  if (!t) return null;
  return (
    <section className="relative overflow-hidden py-16 lg:py-20 bg-gradient-to-br from-bro to-broDark text-white">
      <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      <div className="orb bg-white/10 w-[26rem] h-[26rem] -bottom-32 -right-24" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8 text-center">
        <Reveal>
          <Eyebrow light>{t.eyebrow}</Eyebrow>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t.title}</h2>
          {t.desc && <p className="text-white/85 text-lg max-w-2xl mx-auto whitespace-pre-line leading-relaxed">{t.desc}</p>}
          {t.badges && (
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {t.badges.map((b, i) => (
                <span key={i} className="text-sm font-bold bg-white/15 ring-1 ring-white/30 text-white px-5 py-2.5 rounded-full backdrop-blur-sm">{b}</span>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* [E] 눈치 제로 선언 — 3-No 약속 (다크 섹션) */
function ZeroPressure() {
  const z = C.home && C.home.zeroPressure;
  if (!z) return null;
  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-ink text-white">
      <div className="orb bg-bro/20 w-[32rem] h-[32rem] -bottom-40 -left-32" />
      <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_bottom_left,black,transparent_70%)]" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <Eyebrow light>{z.eyebrow}</Eyebrow>
          <SectionTitle>{z.title}</SectionTitle>
          {z.desc && <p className="text-white/65 mt-4 text-lg">{z.desc}</p>}
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {(z.nos || []).map((n, i) => (
            <Reveal key={i} delay={i * 80} className="bg-white/[0.04] rounded-3xl p-8 border border-white/10 hover:border-bro/30 transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-bro/15 ring-1 ring-bro/30 text-bro flex items-center justify-center text-2xl font-bold mb-5">✕</div>
              <h3 className="text-xl font-bold mb-2">{n.t}</h3>
              <p className="text-white/55 leading-relaxed">{n.d}</p>
            </Reveal>
          ))}
        </div>
        {z.foot && (
          <Reveal delay={140} className="text-center mt-10">
            <p className="inline-block text-bro text-xl md:text-2xl font-bold border-b-2 border-bro/40 pb-1.5">{z.foot}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* [B] 프로그램 미리보기 — programs.list 재사용 */
function ProgramsPreview() {
  const h = C.home && C.home.programsPreview;
  if (!h || !C.programs) return null;
  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <Eyebrow>{h.eyebrow}</Eyebrow>
            <SectionTitle>{h.title}</SectionTitle>
            {h.desc && <p className="text-ink/55 mt-4 text-lg max-w-md">{h.desc}</p>}
          </div>
          <Btn variant="outline" onClick={() => go("/programs")}>프로그램 전체보기 →</Btn>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {C.programs.list.map((prog, i) => (
            <Reveal key={i} delay={i * 70} onClick={() => go("/programs")}
              className="group relative rounded-3xl overflow-hidden aspect-[3/4] flex items-end cursor-pointer">
              <Img src={prog.image} dark className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <div className="relative p-5 text-white">
                <span className="text-[10px] font-bold bg-bro text-white px-2.5 py-1 rounded-full">{prog.tag}</span>
                <h3 className="text-lg font-bold mt-2.5">{prog.name}</h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 시설 사진 마퀴 — 사진들이 옆으로 끊김 없이 계속 흘러감 (hover시 정지) */
function FacilityCarousel({ images, className = "", speed = 45 }) {
  // 끊김 없는 루프를 위해 사진 묶음을 2배로 이어 붙임
  const loop = images.concat(images);
  return (
    <div className={"relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] " + className}>
      <div className="flex gap-4 lg:gap-5 w-max hover:[animation-play-state:paused]"
        style={{ animation: `marquee ${speed}s linear infinite` }}>
        {loop.map((img, i) => (
          <div key={i} className="h-56 sm:h-64 lg:h-80 shrink-0 rounded-2xl overflow-hidden ring-1 ring-ink/10 bg-ink">
            <Img src={img} dark className="h-full w-auto max-w-none object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* [A] 시설 갤러리 */
function Gallery() {
  const g = C.home && C.home.gallery;
  if (!g) return null;
  return (
    <section className="py-20 lg:py-28 bg-ivory">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center mb-12 max-w-2xl mx-auto">
          <Eyebrow>{g.eyebrow}</Eyebrow>
          <SectionTitle>{g.title}</SectionTitle>
          {g.desc && <p className="text-ink/55 mt-4 text-lg">{g.desc}</p>}
        </Reveal>
        <Reveal>
          <FacilityCarousel images={g.images} />
        </Reveal>
      </div>
    </section>
  );
}

/* [D] 구독 vs 등록 비교 — pricing.compare 재사용 */
function CompareHome() {
  const h = C.home && C.home.comparePreview;
  if (!h || !C.pricing) return null;
  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <Reveal className="text-center mb-12 max-w-2xl mx-auto">
          <Eyebrow>{h.eyebrow}</Eyebrow>
          <SectionTitle>{h.title}</SectionTitle>
          {h.desc && <p className="text-ink/55 mt-4 text-lg lg:text-xl">{h.desc}</p>}
        </Reveal>
        <Reveal className="rounded-[2rem] overflow-hidden border border-ink/10 bg-white shadow-lg shadow-ink/5">
          <div className="grid grid-cols-3 bg-ink text-white text-base lg:text-xl font-bold">
            <div className="p-5 lg:p-7 text-white/50">비교</div>
            <div className="p-5 lg:p-7 text-bro text-center">BRO</div>
            <div className="p-5 lg:p-7 text-white/50 text-center">일반 헬스장</div>
          </div>
          {C.pricing.compare.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 text-base lg:text-xl ${i % 2 ? "bg-cream" : "bg-white"}`}>
              <div className="p-5 lg:p-7 text-ink/55 font-medium">{row.label}</div>
              <div className="p-5 lg:p-7 text-center font-bold text-bro">{row.bro}</div>
              <div className="p-5 lg:p-7 text-center text-ink/40">{row.other}</div>
            </div>
          ))}
        </Reveal>
        <Reveal className="text-center mt-10">
          <Btn size="lg" variant="bro" onClick={() => go("/pricing")}>요금제 자세히 보기 →</Btn>
        </Reveal>
      </div>
    </section>
  );
}

/* [C] 트레이너 미리보기 — trainers.list 재사용 */
function TrainersPreview() {
  const h = C.home && C.home.trainersPreview;
  if (!h || !C.trainers) return null;
  return (
    <section className="py-20 lg:py-28 bg-ivory">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <Eyebrow>{h.eyebrow}</Eyebrow>
            <SectionTitle>{h.title}</SectionTitle>
            {h.desc && <p className="text-ink/55 mt-4 text-lg max-w-md">{h.desc}</p>}
          </div>
          <Btn variant="outline" onClick={() => go("/trainers")}>트레이너 전체보기 →</Btn>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {(() => {
            const byId = Object.fromEntries(C.trainers.list.map((t) => [t.id, t]));
            const featured = (h.featured && h.featured.length ? h.featured.map((id) => byId[id]).filter(Boolean) : C.trainers.list.slice(0, 4));
            return featured.map((tr, i) => (
              <Reveal key={tr.id} delay={i * 70} onClick={() => go("/trainers")} className="group cursor-pointer">
                {tr.role && (
                  <div className="flex justify-center mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-bro text-white text-xs font-bold px-3.5 py-1.5 shadow-lg shadow-bro/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />{tr.role} · {tr.name}
                    </span>
                  </div>
                )}
                <div className={"rounded-3xl overflow-hidden bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 " + (tr.role ? "ring-2 ring-bro shadow-lg shadow-bro/20" : "ring-1 ring-ink/10")}>
                  <div className="aspect-[4/5] overflow-hidden">
                    <Img src={tr.image} alt={tr.name + (tr.role ? " " + tr.role : " 트레이너")} dark className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                </div>
              </Reveal>
            ));
          })()}
        </div>
      </div>
    </section>
  );
}

/* [F] 브랜드 철학 매니페스토 — 브로가 걷어낸 4가지 (다크 섹션) */
function Manifesto() {
  const m = C.home && C.home.manifesto;
  if (!m) return null;
  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-ink text-white">
      <div className="orb bg-bro/20 w-[34rem] h-[34rem] -top-44 -right-40" />
      <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="max-w-3xl">
          <Eyebrow light>{m.eyebrow}</Eyebrow>
          <h2 className="text-3xl md:text-5xl font-bold leading-[1.15] tracking-tight whitespace-pre-line mb-5">{m.title}</h2>
          {m.lead && <p className="text-white/70 text-lg md:text-xl leading-relaxed max-w-2xl">{m.lead}</p>}
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4 mt-12 max-w-4xl">
          {(m.removed || []).map((r, i) => (
            <Reveal key={i} delay={i * 80} className="flex items-start gap-4 bg-white/[0.04] rounded-2xl p-6 border border-white/10">
              <span className="shrink-0 w-9 h-9 rounded-full bg-bro/15 ring-1 ring-bro/30 text-bro flex items-center justify-center font-bold text-lg">✕</span>
              <div>
                <p className="font-bold text-lg text-white/90 line-through decoration-bro/70 decoration-2">{r.k}</p>
                <p className="text-white/55 mt-1 leading-relaxed">{r.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120} className="mt-12 max-w-3xl">
          <p className="text-xl md:text-2xl font-bold leading-snug whitespace-pre-line">{m.conclusion}</p>
          {m.highlight && (
            <p className="mt-7 inline-block text-bro text-2xl md:text-3xl font-bold border-b-2 border-bro/40 pb-1.5">{m.highlight}</p>
          )}
          {m.cta && (
            <div className="mt-9">
              <Btn size="lg" variant="bro" onClick={() => go("/about")}>{m.cta} →</Btn>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* [E] 브랜드 스토리 한 토막 */
function StoryTeaser() {
  const s = C.home && C.home.story;
  if (!s) return null;
  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-ink text-white">
      <div className="orb bg-bro/20 w-[30rem] h-[30rem] -top-40 -left-32" />
      <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
      <div className="relative max-w-8xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <Reveal className="rounded-3xl overflow-hidden aspect-[4/3] lg:aspect-[5/4] order-last lg:order-first">
          <Img src={s.image} dark className="w-full h-full object-cover" />
        </Reveal>
        <Reveal delay={100}>
          <Eyebrow light>{s.eyebrow}</Eyebrow>
          <SectionTitle>{s.title}</SectionTitle>
          <p className="text-white/70 text-lg leading-relaxed mt-5 mb-8 max-w-md">{s.body}</p>
          <Btn size="lg" variant="bro" onClick={() => go("/about")}>{s.cta} →</Btn>
        </Reveal>
      </div>
    </section>
  );
}

/* ===========================================================================
 *  페이지 공통 상단 헤더(밝은)
 * ======================================================================== */
function PageHead({ eyebrow, title, desc }) {
  return (
    <section className="pt-28 lg:pt-36 pb-12 lg:pb-16 bg-ivory">
      <div className="max-w-8xl mx-auto px-5 lg:px-8">
        <Reveal className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SectionTitle>{title}</SectionTitle>
          {desc && <p className="text-ink/55 mt-4 text-lg">{desc}</p>}
        </Reveal>
      </div>
    </section>
  );
}

/* ===========================================================================
 *  브랜드 소개
 * ======================================================================== */
function BroAbout() {
  const a = C.broAbout;
  return (
    <main className="bg-cream text-ink">
      <PageHead eyebrow={a.eyebrow} title={a.title} />

      <section className="py-12 lg:py-16 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal className="rounded-3xl overflow-hidden aspect-[4/3] lg:aspect-auto lg:h-[460px]">
            <Img src={a.image} dark className="w-full h-full object-cover" />
          </Reveal>
          <Reveal delay={100} className="space-y-5">
            {a.body.map((t, i) => (
              <p key={i} className="text-lg md:text-xl text-ink/70 leading-relaxed">{t}</p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 숫자 스탯 */}
      <StatBand stats={a.stats} />

      {/* 운영팀 한마디 */}
      {a.quote && (
        <section className="py-16 lg:py-24 bg-cream">
          <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center">
            <Reveal>
              <span className="font-display text-7xl text-bro/25 leading-none block mb-1">“</span>
              <p className="text-2xl md:text-3xl font-bold leading-snug tracking-tight text-ink">{a.quote.replace(/[“”]/g, "")}</p>
              <p className="text-ink/45 mt-6">— {a.quoteBy}</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* 약속 — 검정 섹션 포인트 */}
      <section className="py-16 lg:py-24 bg-ink text-white">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="mb-10"><Eyebrow light>OUR PROMISE</Eyebrow><SectionTitle>{a.promiseTitle}</SectionTitle></Reveal>
          <div className="grid md:grid-cols-2 gap-4">
            {a.promises.map((p, i) => (
              <Reveal key={i} delay={i * 70} className="flex items-start gap-4 bg-white/5 rounded-2xl p-6 border border-white/10">
                <span className="shrink-0 w-8 h-8 rounded-full bg-bro text-white flex items-center justify-center font-bold">✓</span>
                <p className="text-white/85 text-lg pt-0.5">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12">
            <Btn size="lg" variant="bro" onClick={() => go("/pricing")}>요금제 확인하기 →</Btn>
          </Reveal>
        </div>
      </section>
      <AppSection />
    </main>
  );
}

/* ===========================================================================
 *  요금제 (핵심 전환 페이지)
 * ======================================================================== */
function Pricing() {
  const p = C.pricing;
  return (
    <main className="bg-cream text-ink">
      <PageHead eyebrow={p.eyebrow} title={p.title} desc={p.desc} />

      <section className="py-8 lg:py-12 bg-cream">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 grid lg:grid-cols-5 gap-5">
          {/* 메인 요금 카드 — 검정 + 오렌지 */}
          <Reveal className="lg:col-span-3 bg-ink text-white rounded-3xl p-8 lg:p-10 relative overflow-hidden ring-1 ring-white/10">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-bro to-transparent" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-bro/25 rounded-full blur-3xl" />
            <div className="relative">
              <p className="font-display text-bro text-lg tracking-wide mb-1">{p.main.name}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-6xl md:text-7xl font-bold tracking-tight text-bro">{p.main.price}</span>
                <span className="text-white/60 mb-2 text-lg">{p.main.unit}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-7">
                {p.main.badges.map((b, i) => (
                  <span key={i} className="text-xs font-semibold bg-white/10 text-white px-3 py-1.5 rounded-full">{b}</span>
                ))}
              </div>
              <ul className="space-y-3 mb-8">
                {p.main.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/85"><span className="text-bro">✓</span>{f}</li>
                ))}
              </ul>
              <Btn size="lg" variant="bro" className="w-full" onClick={() => go("/booking")}>{p.main.cta}</Btn>
            </div>
          </Reveal>

          {/* 프로모 카드 — 풀 오렌지 */}
          <Reveal delay={120} className="lg:col-span-2 bg-gradient-to-br from-bro to-broDark text-white rounded-3xl p-8 flex flex-col">
            <span className="self-start text-xs font-bold bg-white text-bro px-3 py-1.5 rounded-full mb-5 animate-pulse">{p.promo.tag}</span>
            <h3 className="text-2xl font-bold leading-snug mb-3">{p.promo.title}</h3>
            <p className="text-white/85 leading-relaxed mb-6 flex-1">{p.promo.desc}</p>
            <Btn size="lg" variant="light" className="w-full" onClick={() => go("/booking")}>{p.promo.cta}</Btn>
          </Reveal>
        </div>
      </section>

      {/* 구독에 포함된 것 */}
      <IncludesGrid data={p.includes} />

      {/* 비교표 */}
      <section className="py-16 lg:py-24 bg-ivory">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <Reveal className="text-center mb-10">
            <Eyebrow>BRO vs 일반 헬스장</Eyebrow>
            <SectionTitle>{"무엇이 다른가요?"}</SectionTitle>
          </Reveal>
          <Reveal className="rounded-3xl overflow-hidden border border-ink/10 bg-white">
            <div className="grid grid-cols-3 bg-ink text-white text-sm font-bold">
              <div className="p-4 text-white/50">비교</div>
              <div className="p-4 text-bro text-center">BRO</div>
              <div className="p-4 text-white/50 text-center">일반 헬스장</div>
            </div>
            {p.compare.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 text-sm ${i % 2 ? "bg-cream" : "bg-white"}`}>
                <div className="p-4 text-ink/55">{row.label}</div>
                <div className="p-4 text-center font-bold text-bro">{row.bro}</div>
                <div className="p-4 text-center text-ink/40">{row.other}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <FAQ data={C.faq} bg="bg-cream" />

      <AppSection />
    </main>
  );
}

/* ===========================================================================
 *  프로그램
 * ======================================================================== */
function Programs() {
  const p = C.programs;
  return (
    <main className="bg-cream text-ink">
      <PageHead eyebrow={p.eyebrow} title={p.title} desc={p.desc} />
      <section className="py-12 lg:py-16 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 gap-5">
          {p.list.map((prog, i) => (
            <Reveal key={i} delay={i * 80} className="group relative rounded-3xl overflow-hidden min-h-[300px] flex items-end">
              <Img src={prog.image} dark className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <div className="relative p-7 text-white">
                <span className="text-xs font-bold bg-bro text-white px-3 py-1 rounded-full">{prog.tag}</span>
                <h3 className="text-2xl font-bold mt-3 mb-2">{prog.name}</h3>
                <p className="text-white/75 max-w-md">{prog.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 초보자 여정 */}
      <Process data={p.journey} bg="bg-ivory" />

      {/* 이용 안내 */}
      {p.info && (
        <section className="py-14 lg:py-20 bg-cream">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 grid sm:grid-cols-3 gap-4">
            {p.info.map((it, i) => (
              <Reveal key={i} delay={i * 70} className="bg-white rounded-2xl p-6 ring-1 ring-ink/[0.06] text-center">
                <p className="text-bro font-bold text-sm mb-2">{it.t}</p>
                <p className="text-ink/70">{it.d}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <CTABand />
    </main>
  );
}

/* ===========================================================================
 *  트레이너
 * ======================================================================== */
function Trainers() {
  const t = C.trainers;
  return (
    <main className="bg-cream text-ink">
      <PageHead eyebrow={t.eyebrow} title={t.title} desc={t.desc} />
      <section className="py-12 lg:py-16 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8 space-y-16">
          {C.branches.map((b) => {
            const list = t.list.filter((tr) => tr.branch === b.id);
            if (!list.length) return null;
            return (
              <div key={b.id}>
                <Reveal className="flex items-center gap-4 mb-7">
                  <h3 className="font-display text-bro tracking-wider2 text-xl lg:text-2xl">{b.menuLabel || b.name}</h3>
                  <span className="h-px flex-1 bg-ink/10" />
                  <span className="text-ink/40 text-sm font-semibold whitespace-nowrap">{list.length}명</span>
                </Reveal>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                  {list.map((tr, i) => (
                    <Reveal key={tr.id} delay={i * 60} className="group">
                      {tr.role && (
                        <div className="flex justify-center mb-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-bro text-white text-sm font-bold px-4 py-2 shadow-lg shadow-bro/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/90" />{tr.role} · {tr.name}
                          </span>
                        </div>
                      )}
                      <div className={"rounded-3xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 " + (tr.role ? "ring-2 ring-bro shadow-lg shadow-bro/20 hover:shadow-xl" : "ring-1 ring-ink/10 hover:shadow-xl")}>
                        <div className="aspect-[4/5]">
                          <Img src={tr.image} alt={tr.name + (tr.role ? " " + tr.role : " 트레이너")} dark className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 트레이너 철학 */}
      {t.philosophy && (
        <section className="relative overflow-hidden py-16 lg:py-24 bg-ink text-white">
          <div className="orb bg-bro/20 w-[30rem] h-[30rem] -bottom-40 -right-32" />
          <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_bottom_right,black,transparent_70%)]" />
          <div className="relative max-w-8xl mx-auto px-5 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <Eyebrow light>{t.philosophy.eyebrow}</Eyebrow>
              <SectionTitle>{t.philosophy.title}</SectionTitle>
              <p className="text-white/70 text-lg mt-5 leading-relaxed max-w-md">{t.philosophy.body}</p>
            </Reveal>
            <Reveal delay={100} className="space-y-3">
              {t.philosophy.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-4 bg-white/5 rounded-2xl p-5 ring-1 ring-white/10">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-bro text-white flex items-center justify-center font-bold">✓</span>
                  <p className="text-white/85 pt-0.5">{pt}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      <CTABand />
    </main>
  );
}

/* ===========================================================================
 *  지점 랜딩 (사진 히어로 = 검정 포인트, 본문은 밝게)
 * ======================================================================== */
/* 단일 지점 블록 (한 페이지에 순서대로 쌓임) */
function BranchBlock({ b, index }) {
  const trainers = C.trainers.list.filter((t) => b.trainers.includes(t.id));
  const label = b.menuLabel || b.name;
  return (
    <div id={"branch-" + b.id} className="scroll-mt-16 border-t border-ink/5">
      {/* 지점 배너 */}
      <section className="relative min-h-[46svh] flex items-end overflow-hidden">
        <Img src={b.images[0]} dark className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
        <div className="relative max-w-8xl mx-auto px-5 lg:px-8 pb-12 w-full text-white">
          <Reveal>
            <p className="font-display text-bro tracking-wider2 mb-2">BRO FITNESS · {String(index + 1).padStart(2, "0")}</p>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-3">{label}</h2>
            <p className="text-white/75 text-lg max-w-xl">{b.desc}</p>
          </Reveal>
        </div>
      </section>

      {/* 정보 + 찾아오시는 길(약도) */}
      <section className="py-12 lg:py-16 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="grid sm:grid-cols-3 gap-4">
            {[["주소", b.addr], ["전화", b.phone], ["운영시간", b.hours]].map(([k, v]) => (
              <div key={k} className="bg-white rounded-2xl p-5 border border-ink/5">
                <p className="text-bro font-bold text-sm mb-1.5">{k}</p>
                <p className="text-ink/75 leading-relaxed">{v}</p>
              </div>
            ))}
          </Reveal>
          <Reveal className="flex flex-wrap gap-3 mt-5 mb-10">
            <Btn variant="bro" onClick={() => go("/booking")}>이 지점 체험 예약</Btn>
            {b.kakao && <Btn variant="outline" href={b.kakao}>카카오톡 상담 →</Btn>}
            <Btn variant="outline" href={b.naver}>네이버 플레이스 →</Btn>
            {b.instagram && <Btn variant="outline" href={b.instagram}>인스타그램 →</Btn>}
            <Btn variant="outline" href={"tel:" + b.phone.replace(/[^0-9]/g, "")}>전화 걸기</Btn>
          </Reveal>

          <Reveal className="mb-5">
            <Eyebrow>LOCATION</Eyebrow>
            <SectionTitle>{"찾아오시는 길"}</SectionTitle>
            <p className="text-ink/55 mt-2">{b.addr} · 아래 버튼을 누르면 네이버 플레이스에서 정확한 위치·주변 상호·길찾기를 볼 수 있어요.</p>
          </Reveal>
          {/* 지점 위치 — 네이버 플레이스 연결 */}
          <BranchMap b={b} />
        </div>
      </section>

      {/* 시설 갤러리 — 한 장씩 흘러가는 캐러셀 */}
      <section className="py-12 lg:py-16 bg-ivory">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="mb-8"><Eyebrow>FACILITY</Eyebrow><SectionTitle>{label + " 시설"}</SectionTitle></Reveal>
          <Reveal>
            <FacilityCarousel images={b.images} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* 지점별 위치 — 네이버 플레이스로 연결 (정확한 위치·상호·길찾기) */
function BranchMap({ b }) {
  const naver = b.naver;
  const kakao = "https://map.kakao.com/?q=" + encodeURIComponent(b.mapQuery || b.addr || b.name);
  return (
    <Reveal className="relative overflow-hidden rounded-3xl bg-ink text-white ring-1 ring-white/10 p-7 lg:p-9">
      <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_right,black,transparent_75%)]" />
      <div className="orb bg-bro/20 w-72 h-72 -bottom-28 -right-16" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-bro/15 ring-1 ring-bro/30 flex items-center justify-center text-3xl">📍</div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-bro tracking-wider2 text-sm mb-1">FIND US ON NAVER</p>
          <h3 className="text-xl lg:text-2xl font-bold mb-1.5">{(b.menuLabel || b.name) + " 위치 · 길찾기"}</h3>
          <p className="text-white/65">{b.addr}</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <a href={naver} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full font-semibold px-6 py-3 text-sm bg-[#03C75A] hover:bg-[#02b350] text-white transition-colors">
            네이버 플레이스 →
          </a>
          <Btn variant="ghost" href={kakao}>카카오맵 →</Btn>
        </div>
      </div>
    </Reveal>
  );
}

/* 지점 소개 — 모든 지점을 한 페이지에 순서대로 */
function Branches({ targetId }) {
  useEffect(() => {
    const t = setTimeout(() => {
      if (targetId) {
        const el = document.getElementById("branch-" + targetId);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56 });
      } else {
        window.scrollTo({ top: 0 });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [targetId]);

  return (
    <main className="bg-cream text-ink">
      <PageHead eyebrow="BRANCHES · 청주" title={"가까운 지점에서\n시작하세요"} desc="용암 · 금천 · 복대 — 3개 지점 모두 같은 구독으로 자유롭게 이용할 수 있어요." />

      {/* 지점 빠른 이동 탭 (헤더 아래 고정) */}
      <div className="sticky top-16 z-30 bg-cream/95 backdrop-blur border-y border-ink/5">
        <div className="max-w-8xl mx-auto px-5 lg:px-8 flex gap-2 py-3 overflow-x-auto no-scrollbar">
          {C.branches.map((b) => (
            <button key={b.id} onClick={() => go("/branches/" + b.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${targetId === b.id ? "bg-bro text-white" : "bg-white ring-1 ring-ink/10 text-ink/75 hover:bg-bro/10 hover:text-bro"}`}>
              {b.menuLabel || b.name}
            </button>
          ))}
        </div>
      </div>

      {C.branches.map((b, i) => (
        <BranchBlock key={b.id} b={b} index={i} />
      ))}

      <CTABand />
    </main>
  );
}

/* ===========================================================================
 *  예약 / 상담 폼 (밝은)
 * ======================================================================== */
function Booking() {
  const f = C.booking;
  const [form, setForm] = useState({ program: f.programOptions[0], branch: f.branchOptions[0], name: "", phone: "", date: "", memo: "" });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name.trim() && form.phone.trim();

  const submit = () => {
    if (!valid) return;
    const body =
      `[예약·상담 신청]\n\n` +
      `희망 항목: ${form.program}\n` +
      `지점: ${form.branch}\n` +
      `이름: ${form.name}\n` +
      `연락처: ${form.phone}\n` +
      `희망일: ${form.date || "미정"}\n` +
      `문의내용: ${form.memo || "-"}\n`;
    const mailto = `mailto:${f.submitTo}?subject=${encodeURIComponent("[홈페이지] 예약·상담 신청 - " + form.name)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  };

  const field = "w-full bg-white border border-ink/15 rounded-xl px-4 py-3 text-ink placeholder-ink/30 focus:border-bro focus:ring-2 focus:ring-bro/20 focus:outline-none transition-all";

  return (
    <main className="bg-ivory text-ink min-h-screen">
      <section className="pt-28 lg:pt-36 pb-20">
        <div className="max-w-xl mx-auto px-5 lg:px-8">
          <Reveal className="text-center mb-10">
            <Eyebrow>RESERVATION</Eyebrow>
            <SectionTitle className="mb-3">{f.title}</SectionTitle>
            <p className="text-ink/55">{f.desc}</p>
          </Reveal>

          {sent ? (
            <Reveal className="bg-white rounded-3xl p-10 text-center border-2 border-bro/30 shadow-xl">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-3">신청이 접수되었어요!</h3>
              <p className="text-ink/65 mb-2">메일 앱이 열렸다면 그대로 <b className="text-ink">전송</b>만 눌러주세요.</p>
              <p className="text-ink/45 text-sm mb-8">빠른 시간 안에 연락드리겠습니다.</p>
              <div className="flex flex-col gap-3">
                <Btn variant="bro" onClick={() => setSent(false)}>다시 신청하기</Btn>
                <Btn variant="outline" onClick={() => go("/")}>홈으로</Btn>
              </div>
            </Reveal>
          ) : (
            <Reveal className="bg-white rounded-3xl p-6 lg:p-8 border border-ink/10 shadow-xl space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2 text-ink/70">희망 항목</label>
                <select value={form.program} onChange={set("program")} className={field}>
                  {f.programOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-ink/70">지점 선택</label>
                <select value={form.branch} onChange={set("branch")} className={field}>
                  {f.branchOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-ink/70">이름 *</label>
                  <input value={form.name} onChange={set("name")} placeholder="홍길동" className={field} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-ink/70">연락처 *</label>
                  <input value={form.phone} onChange={set("phone")} placeholder="010-0000-0000" className={field} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-ink/70">희망일</label>
                <input value={form.date} onChange={set("date")} type="date" className={field} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-ink/70">문의 내용 (선택)</label>
                <textarea value={form.memo} onChange={set("memo")} rows="3" placeholder="궁금한 점을 자유롭게 남겨주세요." className={field} />
              </div>
              <Btn size="lg" variant="bro" className={"w-full " + (!valid ? "opacity-50 pointer-events-none" : "")} onClick={submit}>신청하기</Btn>
              <p className="text-center text-ink/40 text-xs">* 이름과 연락처는 필수입니다 · 강압 영업은 절대 없습니다</p>
            </Reveal>
          )}

          {/* 신청 후 진행 + 신뢰 안내 */}
          {f.steps && (
            <Reveal delay={120} className="mt-6 bg-white/60 rounded-3xl p-6 ring-1 ring-ink/[0.06]">
              <p className="font-bold text-ink mb-5 text-center">신청하면 이렇게 진행돼요</p>
              <div className="space-y-4">
                {f.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="shrink-0 w-9 h-9 rounded-full bg-bro/10 text-bro font-display flex items-center justify-center">{s.no}</span>
                    <div>
                      <p className="font-bold text-ink">{s.t}</p>
                      <p className="text-ink/55 text-sm">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              {f.trust && (
                <div className="flex flex-wrap justify-center gap-2 mt-6 pt-5 border-t border-ink/10">
                  {f.trust.map((tr, i) => (
                    <span key={i} className="text-xs font-semibold text-ink/60 bg-ink/[0.04] rounded-full px-3 py-1.5">✓ {tr}</span>
                  ))}
                </div>
              )}
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}

/* ===========================================================================
 *  푸터 (검정 포인트)
 * ======================================================================== */
function Footer() {
  return (
    <footer className="bg-ink text-white/65">
      <div className="max-w-8xl mx-auto px-5 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BrandMark className="h-9 w-9" />
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl tracking-wide text-bro">BRO</span>
              <span className="font-display text-lg tracking-wider2 text-white">FITNESS</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed max-w-sm opacity-70">{C.footer.company} — 부담 없는 구독으로 운동 습관을 만드는 피트니스 브랜드.</p>
          <div className="flex gap-3 mt-6">
            <Btn size="sm" variant="ghost" href={C.brand.instagram}>인스타그램</Btn>
            <Btn size="sm" variant="bro" onClick={() => go("/booking")}>예약·상담</Btn>
          </div>
        </div>
        <div>
          <p className="font-bold mb-4 text-white">바로가기</p>
          <ul className="space-y-2 text-sm opacity-70">
            <li><button onClick={() => go("/pricing")} className="hover:text-bro">요금제</button></li>
            <li><button onClick={() => go("/programs")} className="hover:text-bro">프로그램</button></li>
            <li><button onClick={() => go("/branch/yongam")} className="hover:text-bro">지점 안내</button></li>
            <li><button onClick={() => go("/trainers")} className="hover:text-bro">트레이너</button></li>
            <li><button onClick={() => go("/careers")} className="hover:text-bro">채용</button></li>
            <li><button onClick={() => go("/booking")} className="hover:text-bro">예약·상담</button></li>
          </ul>
        </div>
        <div>
          <p className="font-bold mb-4 text-white">고객센터</p>
          <ul className="space-y-2 text-sm opacity-70">
            <li>{C.footer.phone}</li>
            <li>{C.footer.addr}</li>
            {C.footer.biz && <li className="pt-2 text-xs opacity-60">{C.footer.biz}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-8xl mx-auto px-5 lg:px-8 py-5 text-xs opacity-50">© 2026 {C.footer.company}. All rights reserved.</div>
      </div>
    </footer>
  );
}

/* ===========================================================================
 *  칼럼 / 저널 — 글 목록 (필터 + 대표글 + 카드 그리드)
 * ======================================================================== */
function Column() {
  const col = window.COLUMNS || C.column;
  const posts = col.posts || [];
  const [active, setActive] = useState("전체보기");

  const filtered = active === "전체보기" ? posts : posts.filter((p) => p.cat === active);
  const featured = filtered[0];
  const rest = filtered.slice(1);
  const tabs = ["전체보기", ...col.categories];

  return (
    <main className="bg-cream text-ink min-h-screen">
      {/* 헤더 (가운데 정렬) */}
      <section className="pt-28 lg:pt-36 pb-8 lg:pb-10 bg-ivory text-center">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal>
            <p className="font-display tracking-wider2 text-bro text-sm mb-3">{col.eyebrow}</p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{col.title}</h1>
            <p className="text-ink/55 mt-4 text-lg">{col.subtitle}</p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-cream ring-1 ring-ink/10 px-5 py-2 shadow-sm">
              <span className="text-ink/50 text-sm">Total</span>
              <span className="font-display text-bro text-lg leading-none">{posts.length}</span>
              <span className="text-ink/50 text-sm">Articles</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 분류 필터 칩 */}
      <section className="bg-ivory pb-10">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <Reveal className="flex flex-wrap justify-center gap-2.5">
            {tabs.map((t) => (
              <button key={t} onClick={() => setActive(t)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  active === t
                    ? "bg-bro text-white shadow-lg shadow-bro/25"
                    : "bg-cream text-ink/70 ring-1 ring-ink/10 hover:text-bro hover:ring-bro/40"
                }`}>
                {t}
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 글 목록 */}
      <section className="py-10 lg:py-14">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          {filtered.length === 0 ? (
            <p className="text-center text-ink/40 py-20">아직 이 분류의 글이 없어요.</p>
          ) : (
            <React.Fragment>
              {/* 대표글 (가로형 큰 카드) */}
              {featured && (
                <Reveal>
                  <button onClick={() => go("/column/" + featured.id)}
                    className="group w-full text-left bg-white rounded-3xl overflow-hidden ring-1 ring-ink/5 shadow-sm hover:shadow-xl transition-shadow duration-300 grid lg:grid-cols-2 mb-8">
                    <div className="aspect-[16/11] lg:aspect-auto overflow-hidden">
                      <Img src={featured.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-7 lg:p-12 flex flex-col justify-center">
                      <span className="text-bro font-semibold text-sm mb-4">#{featured.cat}</span>
                      <h2 className="text-2xl md:text-3xl font-bold leading-snug tracking-tight group-hover:text-bro transition-colors">{featured.title}</h2>
                      <p className="text-ink/55 mt-4 leading-relaxed line-clamp-3">{featured.excerpt}</p>
                      <div className="mt-7 pt-5 border-t border-ink/10 flex items-center justify-between">
                        <span className="text-ink/40 text-sm">{featured.date}</span>
                        <span className="text-bro font-semibold text-sm inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">자세히 보기 →</span>
                      </div>
                    </div>
                  </button>
                </Reveal>
              )}

              {/* 나머지 글 카드 그리드 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 80}>
                    <button onClick={() => go("/column/" + p.id)}
                      className="group h-full w-full text-left bg-white rounded-3xl overflow-hidden ring-1 ring-ink/5 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">
                      <div className="aspect-[16/10] overflow-hidden">
                        <Img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <span className="text-bro font-semibold text-sm mb-2.5">#{p.cat}</span>
                        <h3 className="text-lg font-bold leading-snug tracking-tight group-hover:text-bro transition-colors">{p.title}</h3>
                        <p className="text-ink/55 mt-3 text-sm leading-relaxed line-clamp-2 flex-1">{p.excerpt}</p>
                        <span className="mt-5 pt-4 border-t border-ink/10 text-ink/40 text-sm">{p.date}</span>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      </section>
    </main>
  );
}

/* ===========================================================================
 *  칼럼 — 글 상세
 * ======================================================================== */
function ColumnPost({ id }) {
  const col = window.COLUMNS || C.column;
  const posts = col.posts || [];
  const idx = posts.findIndex((p) => p.id === id);
  const post = posts[idx];

  // 읽기 진행바 (스크롤 비율)
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const on = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProg(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [id]);

  if (!post) {
    return (
      <main className="bg-cream text-ink min-h-screen pt-36 pb-24 text-center">
        <p className="text-ink/50 text-lg">글을 찾을 수 없습니다.</p>
        <Btn className="mt-6" variant="bro" onClick={() => go("/column")}>칼럼 목록으로</Btn>
      </main>
    );
  }

  // 추천(다음) 글 2개 — 같은 분류 우선, 모자라면 최신 순으로 채움
  const others = posts.filter((p) => p.id !== post.id);
  const sameCat = others.filter((p) => p.cat === post.cat);
  const more = [...sameCat, ...others.filter((p) => p.cat !== post.cat)].slice(0, 2);

  return (
    <main className="bg-cream text-ink">
      {/* 읽기 진행바 */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60]">
        <div className="h-full bg-gradient-to-r from-bro to-broDark transition-[width] duration-150" style={{ width: prog + "%" }} />
      </div>

      <article>
        {/* 시네마틱 다크 히어로 — 움직이는 배경(오로라 + 켄번즈 줌 + 떠다니는 오브) */}
        <header className="relative min-h-[72vh] flex items-end overflow-hidden aurora text-white">
          <div className="absolute inset-0">
            <Img src={post.image} dark className="w-full h-full object-cover kenburns opacity-[0.55]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent" />
          <span className="orb drift"  style={{ width: "24rem", height: "24rem", background: "rgba(255,106,26,.32)", top: "-5rem", right: "-4rem" }} />
          <span className="orb drift2" style={{ width: "17rem", height: "17rem", background: "rgba(255,106,26,.18)", bottom: "3rem", left: "-4rem" }} />
          <div className="absolute inset-0 bg-grid-dark opacity-50" />
          <div className="relative z-10 w-full max-w-3xl mx-auto px-5 lg:px-8 pb-14 lg:pb-20 pt-32">
            <Reveal>
              <button onClick={() => go("/column")} className="text-white/55 text-sm hover:text-white transition-colors mb-6 inline-flex items-center gap-1.5">← 브로 저널</button>
              <span className="block text-bro font-semibold text-sm mb-4 tracking-wide">#{post.cat}</span>
              <h1 className="text-3xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.16] tracking-tight text-white drop-shadow">{post.title}</h1>
              <div className="mt-7 flex items-center gap-3 text-white/55 text-sm">
                <span className="inline-flex items-center gap-2"><BrandMark className="h-7 w-7" /> 브로 트레이너</span>
                <span className="text-white/25">·</span>
                <span>{post.date}</span>
              </div>
            </Reveal>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-b from-transparent to-cream" />
        </header>

        {/* 본문 */}
        <div className="article-body max-w-3xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
          <Reveal className="space-y-7">
            {(() => {
              let firstPara = true;
              return post.body.map((blk, i) => {
                // 문자열 = 문단(폴백), 객체 = {type:"p"|"img"} (발행엔진 정규화 결과)
                if (blk && typeof blk === "object" && blk.type === "img") {
                  return (
                    <figure key={i} className="my-10">
                      <div className="overflow-hidden rounded-2xl ring-1 ring-ink/5">
                        <Img src={blk.src} alt={blk.caption || "브로피트니스"} className="w-full h-auto object-cover" />
                      </div>
                      {blk.caption ? <figcaption className="mt-3 text-center text-sm text-ink/45">{blk.caption}</figcaption> : null}
                    </figure>
                  );
                }
                const text = blk && typeof blk === "object" ? blk.text : blk;
                const isLead = firstPara;
                firstPara = false;
                return (
                  <p key={i} className={"text-lg lg:text-xl leading-[1.95] text-ink/80 " + (isLead ? "dropcap" : "")}>{text}</p>
                );
              });
            })()}
          </Reveal>

          <div className="hairline my-12" />

          {/* 글 하단 CTA */}
          <Reveal className="relative overflow-hidden rounded-3xl bg-ink text-white p-8 lg:p-12 text-center">
            <span className="orb drift" style={{ width: "16rem", height: "16rem", background: "rgba(255,106,26,.28)", top: "-4rem", right: "-3rem" }} />
            <div className="relative z-10">
              <p className="font-display tracking-wider2 text-bro text-sm mb-3">START TODAY</p>
              <p className="text-2xl lg:text-3xl font-bold leading-snug">운동, 더 미루지 마세요.</p>
              <p className="text-white/60 mt-3">한 달 34,900원 · 약정 없이 오늘 시작해보세요.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Btn variant="bro" onClick={() => go("/booking")}>무료체험 예약하기</Btn>
                <Btn variant="ghost" onClick={() => go("/pricing")}>요금제 보기</Btn>
              </div>
            </div>
          </Reveal>
        </div>
      </article>

      {/* 다른 글 추천 */}
      {more.length > 0 && (
        <section className="bg-ivory py-14 lg:py-20">
          <div className="max-w-8xl mx-auto px-5 lg:px-8">
            <Reveal className="mb-8"><Eyebrow>MORE STORIES</Eyebrow><SectionTitle>이어서 읽어보세요</SectionTitle></Reveal>
            <div className="grid sm:grid-cols-2 gap-6">
              {more.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <button onClick={() => go("/column/" + p.id)}
                    className="group h-full w-full text-left bg-white rounded-3xl overflow-hidden ring-1 ring-ink/5 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col sm:flex-row">
                    <div className="sm:w-2/5 aspect-[16/10] sm:aspect-auto overflow-hidden">
                      <Img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-6 flex flex-col justify-center flex-1">
                      <span className="text-bro font-semibold text-xs mb-2">#{p.cat}</span>
                      <h3 className="text-lg font-bold leading-snug tracking-tight group-hover:text-bro transition-colors line-clamp-2">{p.title}</h3>
                      <span className="mt-3 text-ink/40 text-sm">{p.date}</span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/* ===========================================================================
 *  채용 / 인재 모집 (프리랜서 트레이너)
 * ======================================================================== */
function Careers() {
  const c = C.careers;
  if (!c) return null;
  const digits = (c.phone || "").replace(/[^0-9]/g, "");
  const mailHref = `mailto:${c.email}?subject=${encodeURIComponent("[브로피트니스] 프리랜서 트레이너 지원")}`;
  const telHref = `tel:${digits}`;
  const smsHref = `sms:${digits}`;

  return (
    <main className="bg-cream text-ink">
      {/* HERO — 다크 시네마틱 */}
      <section className="relative overflow-hidden bg-ink text-white pt-28 lg:pt-36 pb-20 lg:pb-28">
        <div className="absolute inset-0">
          <Img src={c.heroImage} className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/70" />
          <div className="absolute inset-0 bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>
        <div className="orb bg-bro/25 w-[30rem] h-[30rem] -top-32 -right-24" />
        <div className="relative max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="max-w-3xl">
            <Eyebrow light>{c.eyebrow}</Eyebrow>
            {c.titleEn && <p className="font-thin italic text-bro text-xl md:text-2xl mb-3">{c.titleEn}</p>}
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight whitespace-pre-line">{c.title}</h1>
            <p className="text-white/55 font-display tracking-wider2 mt-4">{c.subtitle}</p>
            <p className="text-white/75 text-lg leading-relaxed mt-6 max-w-2xl">{c.intro}</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Btn size="lg" variant="bro" href={mailHref}>{c.ctaPrimary}</Btn>
              <Btn size="lg" variant="ghost" href={smsHref}>{c.ctaSecondary}</Btn>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 급여/조건 스탯 */}
      <StatBand stats={c.stats} />

      {/* 채용 공고 포스터 — 운영자가 디자인한 원본 4장 */}
      <section className="relative overflow-hidden py-16 lg:py-24 bg-ivory">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative max-w-2xl mx-auto px-5 lg:px-8">
          <Reveal className="text-center mb-10">
            <Eyebrow>{c.postersEyebrow}</Eyebrow>
            <SectionTitle>{c.postersTitle}</SectionTitle>
          </Reveal>
          <div className="space-y-5">
            {(c.posters || []).map((src, i) => (
              <Reveal key={i} delay={i * 60} className="rounded-2xl overflow-hidden ring-1 ring-ink/[0.06] shadow-xl shadow-ink/10 bg-white">
                <Img src={src} className="w-full h-auto block" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 지원 방법 — CTA 밴드 */}
      <section className="py-16 lg:py-24 bg-cream">
        <div className="max-w-8xl mx-auto px-5 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-ink text-white px-7 py-14 lg:p-16 text-center ring-1 ring-white/10">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-bro to-transparent" />
            <div className="orb bg-bro/25 w-[30rem] h-[30rem] -top-40 left-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="relative">
              <Eyebrow light>{c.applyEyebrow}</Eyebrow>
              <h2 className="font-thin italic text-4xl md:text-6xl tracking-tight mb-4">{c.applyTitle}</h2>
              <p className="text-white/65 text-lg max-w-md mx-auto mb-8">{c.applyNotice}</p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 mb-8">
                <a href={mailHref} className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-5 py-2.5 font-semibold hover:bg-white/15 transition-colors">📧 {c.email}</a>
                <a href={telHref} className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-5 py-2.5 font-semibold hover:bg-white/15 transition-colors">📞 {c.phone}</a>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Btn size="lg" variant="bro" href={mailHref}>{c.ctaPrimary}</Btn>
                <Btn size="lg" variant="ghost" href={smsHref}>{c.ctaSecondary}</Btn>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

/* ===========================================================================
 *  라우터 / 루트
 * ======================================================================== */
function App() {
  const route = useHashRoute();
  let page;
  const branch = route.match(/^\/branch(?:es)?(?:\/(\w+))?/);
  const columnPost = route.match(/^\/column\/(.+)/);
  if (route === "/" || route === "") page = <Home />;
  else if (route === "/about") page = <BroAbout />;
  else if (route === "/pricing") page = <Pricing />;
  else if (route === "/programs") page = <Programs />;
  else if (route === "/trainers") page = <Trainers />;
  else if (branch) page = <Branches targetId={branch[1]} />;
  else if (columnPost) page = <ColumnPost id={decodeURIComponent(columnPost[1])} />;
  else if (route === "/column") page = <Column />;
  else if (route === "/careers") page = <Careers />;
  else if (route === "/booking") page = <Booking />;
  else page = <Home />;

  return (
    <React.Fragment>
      <Header route={route} />
      {page}
      <Footer />
      <FloatingCTA route={route} />
      <div className="h-14 lg:h-0" /> {/* 모바일 하단 플로팅 CTA 여백 */}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
