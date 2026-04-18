// Tablet screens — Dastgheib App (1024x768 landscape layout)

// Tablet has a persistent side rail + wider content area
const TabletSideRail = ({ active = 'home' }) => {
  const items = [
    { key: 'home', label: 'خانه', Icon: IconHome },
    { key: 'lib', label: 'کتابخانه', Icon: IconBook },
    { key: 'media', label: 'رسانه', Icon: IconMedia },
    { key: 'lect', label: 'سخنرانی', Icon: IconMic },
    { key: 'qa', label: 'سؤال و پاسخ', Icon: IconQuestion },
  ];
  return (
    <div style={{
      width: 220, background: 'var(--card)',
      borderLeft: '1px solid var(--border-soft)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '20px 18px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrandMark size={40} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>آیت الله</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>دستغیب</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>شهید محراب</div>
        </div>
      </div>
      <div className="hairline" style={{ margin: '0 18px 12px' }} />
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(({ key, label, Icon }) => {
          const on = key === active;
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 'var(--r-md)',
              background: on ? 'var(--green-wash)' : 'transparent',
              color: on ? 'var(--green-deep)' : 'var(--ink-2)',
              fontWeight: on ? 600 : 500, fontSize: 13,
              position: 'relative',
            }}>
              {on && <div style={{
                position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 20, background: 'var(--green)', borderRadius: 2,
              }} />}
              <Icon size={20} stroke={on ? 1.9 : 1.5} />
              {label}
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: 14 }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--green-wash), var(--gold-wash))',
          borderRadius: 'var(--r-md)', padding: 14,
          border: '1px solid var(--green-soft)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--green-deep)', fontWeight: 700 }}>پخش زنده</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.6 }}>
            درس اخلاق — پنج‌شنبه‌ها ساعت ۲۱
          </div>
          <div style={{
            marginTop: 10, padding: '6px 0', background: 'var(--green-deep)',
            color: '#fff', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600,
            textAlign: 'center',
          }}>اعلان یادآوری</div>
        </div>
      </div>
    </div>
  );
};

const TabletTopBar = ({ title = 'خانه' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 24px', background: 'var(--card)',
    borderBottom: '1px solid var(--border-soft)',
  }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
    <div style={{ flex: 1, maxWidth: 420, marginRight: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-soft)', border: '1px solid var(--border-soft)',
        borderRadius: 'var(--r-md)', padding: '8px 12px',
        fontSize: 12.5, color: 'var(--ink-3)',
      }}>
        <IconSearch size={16} />
        جستجو در کتاب‌ها، سخنرانی‌ها، مطالب...
      </div>
    </div>
    <div className="icon-btn"><IconBell size={20} /></div>
    <div className="icon-btn"><IconUser size={20} /></div>
  </div>
);

// ─────────────────────────────────────────────
// TABLET HOME
// ─────────────────────────────────────────────
const TabletHome = () => (
  <div style={{ display: 'flex', direction: 'rtl', height: '100%', background: 'var(--bg)' }}>
    <TabletSideRail active="home" />
    <div style={{ flex: 1, overflow: 'auto' }}>
      <TabletTopBar title="خانه" />
      <div style={{ padding: 24 }}>
        {/* Hero */}
        <div style={{
          position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden',
          height: 220, background: 'linear-gradient(120deg, oklch(0.38 0.06 158) 0%, oklch(0.28 0.05 155) 100%)',
          color: '#fff', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          boxShadow: 'var(--sh-2)',
        }}>
          <svg style={{ position: 'absolute', inset: 0, opacity: 0.08 }} viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="geoT" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#fff" strokeWidth="1"/>
                <circle cx="30" cy="30" r="4" fill="#fff"/>
              </pattern>
            </defs>
            <rect width="800" height="220" fill="url(#geoT)"/>
          </svg>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: 'oklch(0.85 0.08 75)', marginBottom: 8 }}>ویژه امروز</div>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>درس اخلاق — توکل بر خدا</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>۳۲ دقیقه • قسمت ۱۲ از ۴۰</div>
          <div style={{ position: 'absolute', top: 24, left: 24, background: '#fff', borderRadius: 100, padding: '10px 18px 10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-deep)', fontSize: 13, fontWeight: 700 }}>
            <IconPlay size={14} stroke={0} /> پخش
          </div>
        </div>

        {/* 2 col: quick grid + upcoming */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 24 }}>
          <div>
            <SectionHeader title="دسترسی سریع" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { l: 'پخش زنده', I: IconBroadcast, c: 'oklch(0.55 0.10 35)' },
                { l: 'پرداخت', I: IconPay, c: 'oklch(0.48 0.09 215)' },
                { l: 'بیانیه‌ها', I: IconNews, c: 'var(--green-deep)' },
                { l: 'اخبار', I: IconType, c: 'oklch(0.48 0.09 290)' },
                { l: 'ارتباط', I: IconContact, c: 'oklch(0.48 0.08 130)' },
                { l: 'مسجد', I: IconMosque, c: 'var(--gold-deep)' },
                { l: 'زندگینامه', I: IconBio, c: 'oklch(0.48 0.09 215)' },
                { l: 'شبکه‌ها', I: IconSocial, c: 'oklch(0.55 0.10 35)' },
              ].map(({ l, I, c }) => (
                <div key={l} style={{
                  background: 'var(--card)', border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--r-md)', padding: '16px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${c}15`, color: c,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <I size={22} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="رویدادها" />
            <div style={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {[
                { d: 'پنج‌شنبه', da: '۲۶ فروردین', t: 'درس اخلاق', h: '۲۱:۰۰', live: true },
                { d: 'جمعه', da: '۲۷ فروردین', t: 'دعای ندبه', h: '۰۵:۳۰', live: false },
                { d: 'شنبه', da: '۲۸ فروردین', t: 'تفسیر قرآن', h: '۱۹:۳۰', live: false },
              ].map((e, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: i < 2 ? '1px solid var(--border-soft)' : 'none',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'var(--bg-deep)', color: 'var(--ink-2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, flexShrink: 0, lineHeight: 1.1,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.da.split(' ')[0]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{e.t}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{e.d} • {e.h}</div>
                  </div>
                  {e.live && <div style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    background: 'oklch(0.55 0.15 25 / 0.15)', color: 'oklch(0.48 0.16 25)',
                    borderRadius: 100,
                  }}>زنده</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Books */}
        <SectionHeader title="کتابخانه" cta="همه کتاب‌ها" />
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { t: 'چهل حدیث', c1: '#c89268', c2: '#8a5a32' },
            { t: 'سرچشمه حکمت', c1: '#6a8c7a', c2: '#3c5448' },
            { t: 'راه روشن', c1: '#8c7668', c2: '#5a4638' },
            { t: 'توحید و معاد', c1: '#6a7e9a', c2: '#3c4e68' },
            { t: 'نور هدایت', c1: '#a68860', c2: '#6e5438' },
            { t: 'اسرار نماز', c1: '#7a6a8c', c2: '#4a3c5a' },
            { t: 'معاد در قرآن', c1: '#8a6858', c2: '#5a3828' },
          ].map((b, i) => <BookCard key={i} {...b} />)}
        </div>

        {/* 2 col: videos + audios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div>
            <SectionHeader title="آخرین ویدیوها" cta="همه" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { t: 'تفسیر سوره یس — جلسه هفتم', d: '۴۸ دقیقه', v: '۱٫۲هـ' },
                { t: 'اخلاق در قرآن — صبر و استقامت', d: '۳۵ دقیقه', v: '۸۹۴' },
                { t: 'شب قدر و اهمیت احیا', d: '۵۲ دقیقه', v: '۲٫۱هـ' },
              ].map((v, i) => <VideoRow key={i} {...v} />)}
            </div>
          </div>
          <div>
            <SectionHeader title="آخرین صوت‌ها" cta="همه" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: 'مناجات شعبانیه', d: '۲۲ دقیقه' },
                { t: 'درس اخلاق شب‌های قدر', d: '۴۴ دقیقه' },
                { t: 'تلاوت سوره الرحمن', d: '۱۶ دقیقه' },
                { t: 'دعای کمیل', d: '۳۸ دقیقه' },
              ].map((a, i) => <AudioRow key={i} {...a} />)}
            </div>
          </div>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// TABLET READING — 2 panes (Arabic + Translation)
// ─────────────────────────────────────────────
const TabletReading = () => (
  <div style={{ display: 'flex', direction: 'rtl', height: '100%', background: 'var(--bg-soft)' }}>
    <TabletSideRail active="lib" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--border-soft)',
      }}>
        <div className="icon-btn"><IconChevronRight size={20} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>چهل حدیث — حدیث چهارم</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>توکل • صفحه ۳۷ از ۴۸۰</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="icon-btn"><IconType size={18} /></div>
        <div className="icon-btn"><IconBookmark size={18} /></div>
        <div className="icon-btn"><IconNote size={18} /></div>
        <div className="icon-btn"><IconShare size={18} /></div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {/* Arabic side */}
        <div style={{
          background: 'var(--card)', borderRadius: 'var(--r-lg)',
          padding: '32px 28px', border: '1px solid var(--border-soft)',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="140" height="24" viewBox="0 0 140 24">
              <line x1="5" y1="12" x2="55" y2="12" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
              <path d="M70 5 L77 12 L70 19 L63 12 Z" fill="var(--gold)" opacity="0.8"/>
              <line x1="85" y1="12" x2="135" y2="12" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <div style={{
            fontSize: 26, lineHeight: 2.2, textAlign: 'center', color: 'var(--ink)',
            fontFamily: 'Amiri, "Noto Naskh Arabic", Vazirmatn, serif', fontWeight: 500,
          }}>
            وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا
          </div>
          <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--gold-deep)', fontWeight: 600, letterSpacing: 1.5 }}>
            سوره طلاق — آیه ۳
          </div>
        </div>

        {/* Persian side */}
        <div style={{ padding: '12px 4px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-deep)', marginBottom: 12, letterSpacing: 0.5 }}>
            ترجمه و تفسیر
          </div>
          <div style={{ fontSize: 16, lineHeight: 2.1, color: 'var(--ink)', textAlign: 'justify' }}>
            <span style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>و هر که بر خدا توکل کند</span>، خداوند او را کفایت می‌کند. همانا خداوند به فرمان خود می‌رساند. در این آیه شریفه، حقیقت توکل به روشنی بیان شده است.
          </div>
          <div style={{ fontSize: 15, lineHeight: 2.1, color: 'var(--ink-2)', marginTop: 16, textAlign: 'justify' }}>
            توکل یعنی واگذار کردن امور به خداوند متعال پس از تلاش و کوشش لازم. انسان مؤمن باید تمام اسباب ظاهری را فراهم کند و سپس نتیجه را از خدا بخواهد.
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--card)', borderTop: '1px solid var(--border-soft)',
        padding: '14px 48px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <IconChevronRight size={20} />
        <div style={{ flex: 1, height: 4, background: 'var(--border-soft)', borderRadius: 2, position: 'relative' }}>
          <div style={{ width: '8%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translate(50%,-50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--green-deep)', border: '2px solid #fff' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>۳۷ / ۴۸۰</div>
        <IconChevronLeft size={20} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// TABLET LIBRARY
// ─────────────────────────────────────────────
const TabletLibrary = () => {
  const books = [
    { t: 'چهل حدیث', c1: '#c89268', c2: '#8a5a32', state: 'downloaded' },
    { t: 'سرچشمه حکمت', c1: '#6a8c7a', c2: '#3c5448', state: 'none' },
    { t: 'راه روشن', c1: '#8c7668', c2: '#5a4638', state: 'downloading' },
    { t: 'توحید و معاد', c1: '#6a7e9a', c2: '#3c4e68', state: 'none' },
    { t: 'نور هدایت', c1: '#a68860', c2: '#6e5438', state: 'downloaded' },
    { t: 'اسرار نماز', c1: '#7a6a8c', c2: '#4a3c5a', state: 'none' },
    { t: 'معاد در قرآن', c1: '#8a6858', c2: '#5a3828', state: 'none' },
    { t: 'تفسیر فاتحه', c1: '#5a8878', c2: '#2e4c40', state: 'downloaded' },
    { t: 'آیین زندگی', c1: '#9a7a5a', c2: '#6a4a2e', state: 'none' },
    { t: 'اسلام و علم', c1: '#c89268', c2: '#8a5a32', state: 'none' },
    { t: 'راه سعادت', c1: '#6a8c7a', c2: '#3c5448', state: 'none' },
    { t: 'معراج مؤمن', c1: '#7a6a8c', c2: '#4a3c5a', state: 'downloaded' },
  ];
  return (
    <div style={{ display: 'flex', direction: 'rtl', height: '100%', background: 'var(--bg)' }}>
      <TabletSideRail active="lib" />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <TabletTopBar title="کتابخانه" />
        <div style={{ display: 'flex', gap: 6, padding: '16px 24px 8px', flexWrap: 'wrap' }}>
          {['همه', 'دانلود شده', 'اخلاق', 'تفسیر', 'فقه', 'کلام', 'احادیث', 'دعا'].map((f, i) => (
            <div key={f} style={{
              padding: '7px 16px', borderRadius: 100, fontSize: 12.5,
              background: i === 0 ? 'var(--green-deep)' : 'var(--card)',
              color: i === 0 ? '#fff' : 'var(--ink-2)',
              border: i === 0 ? 'none' : '1px solid var(--border)',
              fontWeight: i === 0 ? 600 : 500,
            }}>{f}</div>
          ))}
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18 }}>
          {books.map((b, i) => <LibraryCard key={i} {...b} />)}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { TabletSideRail, TabletTopBar, TabletHome, TabletReading, TabletLibrary });
