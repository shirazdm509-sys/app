// Mobile screens — Dastgheib App
// All at 412x892 to fit AndroidDevice default

// ─────────────────────────────────────────────
// Shared: brand mark — calligraphic monogram
// ─────────────────────────────────────────────
const BrandMark = ({ size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--green) 0%, var(--green-deep) 100%)',
    color: 'var(--gold-wash)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.5, fontWeight: 700,
    fontFamily: 'Vazirmatn, serif',
    boxShadow: 'inset 0 0 0 2px oklch(0.72 0.09 75 / 0.4)',
  }}>
    <span style={{ lineHeight: 1, transform: 'translateY(1px)' }}>د</span>
  </div>
);

// Bottom nav — shared across most screens
const MobileBottomNav = ({ active = 'home' }) => {
  const items = [
    { key: 'home', label: 'خانه', Icon: IconHome },
    { key: 'lib', label: 'کتابخانه', Icon: IconBook },
    { key: 'media', label: 'رسانه', Icon: IconMedia },
    { key: 'lect', label: 'سخنرانی', Icon: IconMic },
    { key: 'qa', label: 'سؤال', Icon: IconQuestion },
  ];
  return (
    <div style={{
      display: 'flex', background: 'var(--card)',
      borderTop: '1px solid var(--border-soft)',
      padding: '8px 6px 10px', gap: 2,
    }}>
      {items.map(({ key, label, Icon }) => {
        const on = key === active;
        return (
          <div key={key} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, padding: '6px 0',
            color: on ? 'var(--green-deep)' : 'var(--ink-3)',
            position: 'relative',
          }}>
            {on && <div style={{
              position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2,
              background: 'var(--green)',
            }} />}
            <Icon size={22} stroke={on ? 1.9 : 1.5} />
            <div style={{ fontSize: 11, fontWeight: on ? 600 : 400 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile header — logo + title + action icons
const MobileHeader = ({ title = 'آیت الله دستغیب', showBack = false, right, rightSize = 40 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px 12px', background: 'var(--card)',
    borderBottom: '1px solid var(--border-soft)',
  }}>
    {showBack ? (
      <div className="icon-btn"><IconChevronRight size={22} /></div>
    ) : (
      <BrandMark size={36} />
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      {!showBack && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>شهید محراب</div>
      )}
    </div>
    {right || (
      <>
        <div className="icon-btn"><IconSearch size={20} /></div>
        <div className="icon-btn" style={{ position: 'relative' }}>
          <IconBell size={20} />
          <div style={{
            position: 'absolute', top: 8, left: 8, width: 7, height: 7,
            borderRadius: '50%', background: 'var(--gold-deep)',
            boxShadow: '0 0 0 2px var(--card)',
          }} />
        </div>
      </>
    )}
  </div>
);

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────
const MobileHome = () => {
  const quickItems = [
    { label: 'پخش زنده', Icon: IconBroadcast, tone: 'cat-1' },
    { label: 'پرداخت', Icon: IconPay, tone: 'cat-2' },
    { label: 'بیانیه‌ها', Icon: IconNews, tone: 'green' },
    { label: 'اخبار', Icon: IconType, tone: 'cat-3' },
    { label: 'ارتباط', Icon: IconContact, tone: 'cat-4' },
    { label: 'مسجد', Icon: IconMosque, tone: 'gold' },
    { label: 'زندگینامه', Icon: IconBio, tone: 'cat-2' },
    { label: 'شبکه‌های\nاجتماعی', Icon: IconSocial, tone: 'cat-1' },
  ];
  const toneMap = {
    'cat-1': { bg: 'oklch(0.72 0.08 35 / 0.12)', fg: 'oklch(0.48 0.09 35)' },
    'cat-2': { bg: 'oklch(0.68 0.08 200 / 0.12)', fg: 'oklch(0.42 0.09 215)' },
    'cat-3': { bg: 'oklch(0.70 0.09 290 / 0.12)', fg: 'oklch(0.45 0.10 290)' },
    'cat-4': { bg: 'oklch(0.72 0.09 125 / 0.14)', fg: 'oklch(0.42 0.08 130)' },
    'green': { bg: 'var(--green-wash)', fg: 'var(--green-deep)' },
    'gold':  { bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' },
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <MobileHeader />

      <div style={{ padding: '16px 16px 20px' }}>
        {/* Hero card — featured program */}
        <div style={{
          position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden',
          height: 180, background: 'linear-gradient(135deg, oklch(0.38 0.06 158) 0%, oklch(0.28 0.05 155) 100%)',
          color: '#fff', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          boxShadow: 'var(--sh-2)',
        }}>
          {/* ornamental pattern */}
          <svg style={{ position: 'absolute', inset: 0, opacity: 0.08 }} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="geo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#fff" strokeWidth="1"/>
                <circle cx="20" cy="20" r="3" fill="#fff"/>
              </pattern>
            </defs>
            <rect width="400" height="200" fill="url(#geo)"/>
          </svg>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
            color: 'oklch(0.85 0.08 75)', marginBottom: 6,
          }}>ویژه امروز</div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, marginBottom: 4 }}>
            درس اخلاق — توکل بر خدا
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>۳۲ دقیقه</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.6 }} />
            <span>قسمت ۱۲ از ۴۰</span>
          </div>
          {/* play pill */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: '#fff', borderRadius: 100,
            padding: '8px 14px 8px 10px', display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--green-deep)', fontSize: 12, fontWeight: 600,
          }}>
            <IconPlay size={12} stroke={0} />
            پخش
          </div>
          {/* carousel dots */}
          <div style={{ position: 'absolute', bottom: 14, left: 20, display: 'flex', gap: 4 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                height: 4, borderRadius: 2,
                width: i === 0 ? 16 : 4,
                background: i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
              }} />
            ))}
          </div>
        </div>

        {/* Quick grid 4x2 */}
        <div style={{
          marginTop: 20,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        }}>
          {quickItems.map(({ label, Icon, tone }) => {
            const t = toneMap[tone];
            return (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 4px 10px', background: 'var(--card)',
                borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: t.bg, color: t.fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} />
                </div>
                <div style={{
                  fontSize: 10.5, fontWeight: 500, color: 'var(--ink-2)',
                  textAlign: 'center', lineHeight: 1.25, whiteSpace: 'pre-line',
                }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Section: آخرین کتاب‌ها */}
        <SectionHeader title="کتابخانه" cta="همه کتاب‌ها" />
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto',
          marginLeft: -16, marginRight: -16, padding: '4px 16px 12px',
          scrollbarWidth: 'none',
        }}>
          {[
            { t: 'چهل حدیث', c1: '#c89268', c2: '#8a5a32' },
            { t: 'سرچشمه حکمت', c1: '#6a8c7a', c2: '#3c5448' },
            { t: 'راه روشن', c1: '#8c7668', c2: '#5a4638' },
            { t: 'توحید و معاد', c1: '#6a7e9a', c2: '#3c4e68' },
            { t: 'نور هدایت', c1: '#a68860', c2: '#6e5438' },
          ].map((b, i) => (
            <BookCard key={i} {...b} />
          ))}
        </div>

        {/* Section: آخرین تصاویر */}
        <SectionHeader title="آخرین تصاویر" cta="بیشتر" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 6, gridTemplateRows: '96px 96px' }}>
          <div style={{ gridRow: 'span 2', background: 'linear-gradient(135deg, #8a7658, #5a4838)', borderRadius: 'var(--r-sm)', position: 'relative', overflow: 'hidden' }}>
            <ImgOrnament />
            <div style={{ position: 'absolute', bottom: 8, right: 8, left: 8, color: '#fff', fontSize: 11, fontWeight: 500 }}>
              مراسم هفتگی
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #6a8c7a, #3c5448)', borderRadius: 'var(--r-sm)', position: 'relative', overflow: 'hidden' }}><ImgOrnament /></div>
          <div style={{ background: 'linear-gradient(135deg, #a68860, #6e5438)', borderRadius: 'var(--r-sm)', position: 'relative', overflow: 'hidden' }}><ImgOrnament /></div>
          <div style={{ background: 'linear-gradient(135deg, #6a7e9a, #3c4e68)', borderRadius: 'var(--r-sm)', position: 'relative', overflow: 'hidden' }}><ImgOrnament /></div>
          <div style={{ background: 'linear-gradient(135deg, #c89268, #8a5a32)', borderRadius: 'var(--r-sm)', position: 'relative', overflow: 'hidden' }}><ImgOrnament /></div>
        </div>

        {/* Section: آخرین ویدیوها */}
        <SectionHeader title="آخرین ویدیوها" cta="همه" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { t: 'تفسیر سوره یس — جلسه هفتم', d: '۴۸ دقیقه', v: '۱٫۲هـ' },
            { t: 'اخلاق در قرآن — صبر و استقامت', d: '۳۵ دقیقه', v: '۸۹۴' },
          ].map((v, i) => (
            <VideoRow key={i} {...v} />
          ))}
        </div>

        {/* Section: آخرین صوت‌ها */}
        <SectionHeader title="آخرین صوت‌ها" cta="همه" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { t: 'مناجات شعبانیه', d: '۲۲ دقیقه' },
            { t: 'درس اخلاق شب‌های قدر', d: '۴۴ دقیقه' },
            { t: 'تلاوت سوره الرحمن', d: '۱۶ دقیقه' },
          ].map((a, i) => <AudioRow key={i} {...a} />)}
        </div>

        {/* Section: آخرین مطالب */}
        <SectionHeader title="آخرین مطالب" cta="همه" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { t: 'اهمیت نماز اول وقت در سیره علما', d: '۲ روز پیش', cat: 'اخلاق' },
            { t: 'بزرگداشت سالروز شهادت علامه دستغیب', d: '۵ روز پیش', cat: 'اخبار' },
          ].map((p, i) => <PostRow key={i} {...p} />)}
        </div>

        <div style={{ height: 16 }} />
      </div>

      <MobileBottomNav active="home" />
    </div>
  );
};

const SectionHeader = ({ title, cta }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 28, marginBottom: 12,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 16, background: 'var(--green)', borderRadius: 2 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
    </div>
    {cta && (
      <div style={{ fontSize: 12, color: 'var(--green-deep)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
        {cta} <IconChevronLeft size={14} />
      </div>
    )}
  </div>
);

const BookCard = ({ t, c1, c2 }) => (
  <div style={{ width: 108, flexShrink: 0 }}>
    <div style={{
      width: 108, height: 148, borderRadius: 'var(--r-sm)',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--sh-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 12,
    }}>
      {/* vertical gold frame */}
      <div style={{
        position: 'absolute', inset: 6,
        border: '1px solid oklch(0.85 0.08 75 / 0.4)',
        borderRadius: 4,
      }} />
      <div style={{
        color: 'oklch(0.92 0.06 80)', fontSize: 15, fontWeight: 700,
        textAlign: 'center', lineHeight: 1.5, fontFamily: 'Vazirmatn',
      }}>{t}</div>
      {/* spine hint */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,0.2)' }} />
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>{t}</div>
    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>۴ فصل • رایگان</div>
  </div>
);

const ImgOrnament = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.18 }}>
    <path d="M50 10 L70 50 L50 90 L30 50 Z M10 50 L50 30 L90 50 L50 70 Z" fill="#fff"/>
  </svg>
);

const VideoRow = ({ t, d, v }) => (
  <div style={{ display: 'flex', gap: 10, background: 'var(--card)', borderRadius: 'var(--r-md)', padding: 8, border: '1px solid var(--border-soft)' }}>
    <div style={{
      width: 112, height: 72, borderRadius: 10, flexShrink: 0,
      background: 'linear-gradient(135deg, oklch(0.38 0.06 158), oklch(0.22 0.04 155))',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ImgOrnament />
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)', color: 'var(--green-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingRight: 1,
      }}><IconPlay size={12} stroke={0} /></div>
      <div style={{
        position: 'absolute', bottom: 4, left: 4,
        background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9,
        padding: '2px 5px', borderRadius: 3,
      }}>{d}</div>
    </div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.45 }}>{t}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', display: 'flex', gap: 8 }}>
        <span>{v} بازدید</span>
        <span>•</span>
        <span>تفسیر</span>
      </div>
    </div>
  </div>
);

const AudioRow = ({ t, d }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--card)', borderRadius: 'var(--r-md)',
    padding: '10px 12px', border: '1px solid var(--border-soft)',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'var(--green-wash)', color: 'var(--green-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <IconPlay size={14} stroke={0} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{t}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{d}</div>
    </div>
    <div style={{ color: 'var(--ink-4)' }}><IconDownload size={16} /></div>
  </div>
);

const PostRow = ({ t, d, cat }) => (
  <div style={{
    background: 'var(--card)', borderRadius: 'var(--r-md)',
    padding: 12, border: '1px solid var(--border-soft)',
    display: 'flex', gap: 12, alignItems: 'flex-start',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--gold-wash), oklch(0.88 0.06 80))',
      color: 'var(--gold-deep)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IconNews size={20} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span className="chip" style={{ fontSize: 10, padding: '2px 8px' }}>{cat}</span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{d}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>{t}</div>
    </div>
  </div>
);

Object.assign(window, {
  BrandMark, MobileBottomNav, MobileHeader, MobileHome, SectionHeader,
  BookCard, ImgOrnament, VideoRow, AudioRow, PostRow,
});
