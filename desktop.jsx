// Desktop screens — Dastgheib App (1280x800)

const DesktopHeader = ({ active = 'home' }) => {
  const items = [
    { key: 'home', label: 'خانه' },
    { key: 'lib', label: 'کتابخانه' },
    { key: 'media', label: 'رسانه' },
    { key: 'lect', label: 'سخنرانی‌ها' },
    { key: 'qa', label: 'پرسش و پاسخ' },
    { key: 'bio', label: 'زندگینامه' },
    { key: 'news', label: 'اخبار' },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '14px 40px', background: 'var(--card)',
      borderBottom: '1px solid var(--border-soft)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrandMark size={40} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>آیت الله دستغیب</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>شهید محراب شیراز</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {items.map(({ key, label }) => {
          const on = key === active;
          return (
            <div key={key} style={{
              padding: '8px 14px', borderRadius: 'var(--r-sm)',
              color: on ? 'var(--green-deep)' : 'var(--ink-2)',
              fontSize: 13, fontWeight: on ? 700 : 500,
              background: on ? 'var(--green-wash)' : 'transparent',
              position: 'relative',
            }}>{label}</div>
          );
        })}
      </div>
      <div style={{ flex: 1, maxWidth: 340 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-soft)', border: '1px solid var(--border-soft)',
          borderRadius: 'var(--r-md)', padding: '8px 12px',
          fontSize: 12.5, color: 'var(--ink-3)',
        }}>
          <IconSearch size={16} />
          جستجو در کتاب‌ها، سخنرانی‌ها...
          <div style={{ marginRight: 'auto', fontSize: 10, color: 'var(--ink-4)', padding: '2px 6px', background: 'var(--card)', borderRadius: 4, border: '1px solid var(--border)' }}>Ctrl K</div>
        </div>
      </div>
      <div className="icon-btn" style={{ position: 'relative' }}>
        <IconBell size={20} />
        <div style={{ position: 'absolute', top: 8, left: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-deep)', boxShadow: '0 0 0 2px var(--card)' }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 10px 4px 4px', borderRadius: 100,
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>محمد رضایی</div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-wash)', color: 'var(--green-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>م</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DESKTOP HOME
// ─────────────────────────────────────────────
const DesktopHome = () => (
  <div style={{ direction: 'rtl', minHeight: '100%', background: 'var(--bg)' }}>
    <DesktopHeader active="home" />
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 40px 40px' }}>
      {/* Hero — 3 col */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{
          position: 'relative', borderRadius: 'var(--r-lg)', overflow: 'hidden',
          height: 320, background: 'linear-gradient(120deg, oklch(0.38 0.06 158) 0%, oklch(0.24 0.04 155) 100%)',
          color: '#fff', padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          boxShadow: 'var(--sh-3)',
        }}>
          <svg style={{ position: 'absolute', inset: 0, opacity: 0.1 }} viewBox="0 0 800 320" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="geoD" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M40 0 L80 40 L40 80 L0 40 Z" fill="none" stroke="#fff" strokeWidth="1"/>
                <circle cx="40" cy="40" r="5" fill="#fff"/>
                <path d="M40 10 L45 35 L65 40 L45 45 L40 65 L35 45 L15 40 L35 35 Z" fill="#fff" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="800" height="320" fill="url(#geoD)"/>
          </svg>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: 'oklch(0.85 0.08 75)', marginBottom: 10 }}>ویژه امروز</div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.35, marginBottom: 10, maxWidth: 520 }}>درس اخلاق — توکل بر خدا</div>
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 20, maxWidth: 480, lineHeight: 1.7 }}>
            در این جلسه به تفسیر آیه سوم سوره طلاق و معنای حقیقی توکل در سیره اولیای الهی می‌پردازیم.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ background: '#fff', borderRadius: 100, padding: '10px 20px 10px 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-deep)', fontSize: 13, fontWeight: 700 }}>
              <IconPlay size={14} stroke={0} /> پخش ویدیو
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: 100, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <IconBookmark size={14} /> ذخیره
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 24, left: 36, display: 'flex', gap: 6 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: 4, borderRadius: 2, width: i === 0 ? 24 : 4, background: i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>
        </div>

        <div style={{
          background: 'var(--card)', borderRadius: 'var(--r-lg)', padding: 20,
          border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-deep)', letterSpacing: 1.5 }}>در حال مطالعه</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
            <div style={{
              width: 82, height: 114, borderRadius: 6,
              background: 'linear-gradient(135deg, #c89268, #8a5a32)', flexShrink: 0, boxShadow: 'var(--sh-2)',
              position: 'relative', padding: 6,
            }}>
              <div style={{ position: 'absolute', inset: 4, border: '1px solid oklch(0.85 0.08 75 / 0.5)', borderRadius: 3 }} />
              <div style={{ color: 'oklch(0.92 0.06 80)', fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.5, position: 'relative' }}>چهل<br/>حدیث</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>چهل حدیث</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>حدیث چهارم — توکل</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 12 }}>۳۰٪ — صفحه ۳۷ از ۴۸۰</div>
              <div style={{ height: 4, background: 'var(--border-soft)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '30%', height: '100%', background: 'var(--green)' }} />
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'var(--green-deep)', color: '#fff', borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 600,
          }}>
            <IconArrowLeft size={14} /> ادامه مطالعه
          </div>

          <div className="hairline" style={{ margin: '18px 0' }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-deep)', letterSpacing: 1.5, marginBottom: 10 }}>رویداد آینده</div>
          <div style={{
            background: 'var(--gold-wash)', border: '1px solid oklch(0.82 0.06 75 / 0.5)',
            borderRadius: 'var(--r-md)', padding: 12,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>درس اخلاق پنج‌شنبه</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>پنج‌شنبه ۲۶ فروردین — ۲۱:۰۰</div>
            <div style={{ fontSize: 11, color: 'var(--green-deep)', marginTop: 8, fontWeight: 600 }}>۲ روز دیگر — یادآوری</div>
          </div>
        </div>
      </div>

      {/* Quick grid */}
      <SectionHeader title="دسترسی سریع" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
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
            borderRadius: 'var(--r-md)', padding: '18px 8px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c}15`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I size={22} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Books */}
      <SectionHeader title="کتابخانه" cta="همه کتاب‌ها" />
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { t: 'چهل حدیث', c1: '#c89268', c2: '#8a5a32' },
          { t: 'سرچشمه حکمت', c1: '#6a8c7a', c2: '#3c5448' },
          { t: 'راه روشن', c1: '#8c7668', c2: '#5a4638' },
          { t: 'توحید و معاد', c1: '#6a7e9a', c2: '#3c4e68' },
          { t: 'نور هدایت', c1: '#a68860', c2: '#6e5438' },
          { t: 'اسرار نماز', c1: '#7a6a8c', c2: '#4a3c5a' },
          { t: 'معاد در قرآن', c1: '#8a6858', c2: '#5a3828' },
          { t: 'تفسیر فاتحه', c1: '#5a8878', c2: '#2e4c40' },
        ].map((b, i) => <BookCard key={i} {...b} />)}
      </div>

      {/* 3 col: videos + audios + posts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20, marginTop: 12 }}>
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
        <div>
          <SectionHeader title="آخرین مطالب" cta="همه" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { t: 'اهمیت نماز اول وقت در سیره علما', d: '۲ روز پیش', cat: 'اخلاق' },
              { t: 'بزرگداشت سالروز شهادت علامه', d: '۵ روز پیش', cat: 'اخبار' },
              { t: 'پیام به کنگره بزرگداشت', d: '۱ هفته پیش', cat: 'بیانیه' },
            ].map((p, i) => <PostRow key={i} {...p} />)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 40, padding: '24px 0', borderTop: '1px solid var(--border-soft)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: 'var(--ink-3)',
      }}>
        <div>© ۱۴۰۵ — دفتر آیت الله شهید دستغیب</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>درباره ما</span>
          <span>حریم خصوصی</span>
          <span>تماس با ما</span>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// DESKTOP READING — 3 column (chapters | text | notes)
// ─────────────────────────────────────────────
const DesktopReading = () => (
  <div style={{ direction: 'rtl', minHeight: '100%', background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column' }}>
    <DesktopHeader active="lib" />
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Chapters sidebar */}
      <div style={{ width: 280, background: 'var(--card)', borderLeft: '1px solid var(--border-soft)', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>در حال مطالعه</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>چهل حدیث</div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 10 }}>حدیث ۴ از ۴۰ • ۳۰٪</div>
          <div style={{ height: 3, background: 'var(--border-soft)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: '30%', height: '100%', background: 'var(--green)' }} />
          </div>
        </div>
        <div style={{ padding: '10px 8px' }}>
          {[
            { n: '۱', t: 'نیت', done: true },
            { n: '۲', t: 'اخلاص', done: true },
            { n: '۳', t: 'صبر', done: true },
            { n: '۴', t: 'توکل', done: false, open: true },
            { n: '۵', t: 'تقوا', done: false },
            { n: '۶', t: 'حیا', done: false },
            { n: '۷', t: 'صدق', done: false },
            { n: '۸', t: 'امانت', done: false },
            { n: '۹', t: 'شکر', done: false },
            { n: '۱۰', t: 'عدل', done: false },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
              borderRadius: 'var(--r-sm)', margin: '1px 0',
              background: c.open ? 'var(--green-wash)' : 'transparent',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: c.done ? 'var(--green-wash)' : (c.open ? 'var(--green)' : 'var(--bg-deep)'),
                color: c.done ? 'var(--green-deep)' : (c.open ? '#fff' : 'var(--ink-3)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>{c.done ? <IconCheck size={12} stroke={2.4} /> : c.n}</div>
              <div style={{ fontSize: 12.5, fontWeight: c.open ? 700 : 500, color: c.open ? 'var(--green-deep)' : 'var(--ink)' }}>حدیث {c.n} — {c.t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main reading */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="chip">حدیث چهارم</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>• توکل • صفحه ۳۷ از ۴۸۰</span>
            <div style={{ flex: 1 }} />
            <div className="icon-btn"><IconType size={18} /></div>
            <div className="icon-btn"><IconBookmark size={18} /></div>
            <div className="icon-btn"><IconShare size={18} /></div>
          </div>

          <div style={{ textAlign: 'center', margin: '12px 0 24px' }}>
            <svg width="200" height="30" viewBox="0 0 200 30">
              <line x1="20" y1="15" x2="80" y2="15" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
              <path d="M100 5 L110 15 L100 25 L90 15 Z" fill="var(--gold)" opacity="0.8"/>
              <circle cx="85" cy="15" r="2" fill="var(--gold)" opacity="0.6"/>
              <circle cx="115" cy="15" r="2" fill="var(--gold)" opacity="0.6"/>
              <line x1="120" y1="15" x2="180" y2="15" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>

          <div style={{
            background: 'var(--card)', borderRadius: 'var(--r-lg)',
            padding: '28px 32px', border: '1px solid var(--border-soft)', marginBottom: 24,
          }}>
            <div style={{
              fontSize: 24, lineHeight: 2.2, textAlign: 'center', color: 'var(--ink)',
              fontFamily: 'Amiri, "Noto Naskh Arabic", Vazirmatn, serif', fontWeight: 500,
            }}>
              وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا
            </div>
            <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--gold-deep)', marginTop: 14, fontWeight: 700, letterSpacing: 1.5 }}>
              سوره طلاق — آیه ۳
            </div>
          </div>

          <div style={{ fontSize: 16, lineHeight: 2.1, color: 'var(--ink)', textAlign: 'justify', marginBottom: 18 }}>
            <span style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>و هر که بر خدا توکل کند</span>، خداوند او را کفایت می‌کند. همانا خداوند به فرمان خود می‌رساند. در این آیه شریفه، حقیقت توکل به روشنی بیان شده است. توکل یعنی واگذار کردن امور به خداوند متعال پس از تلاش و کوشش لازم.
          </div>
          <div style={{ fontSize: 16, lineHeight: 2.1, color: 'var(--ink-2)', textAlign: 'justify', marginBottom: 18 }}>
            انسان مؤمن باید تمام اسباب ظاهری را فراهم کند و سپس نتیجه را از خدا بخواهد. این همان روحیه‌ای است که در سیره انبیا و اولیا به وضوح دیده می‌شود. رسول اکرم ﷺ می‌فرمایند: «اعقلها و توکل» — شتر را ببند و توکل کن.
          </div>
          <div style={{ fontSize: 16, lineHeight: 2.1, color: 'var(--ink-2)', textAlign: 'justify' }}>
            از نکات مهم در این آیه، تعبیر «فَهُوَ حَسْبُهُ» است. حَسْب به معنای کفایت است؛ یعنی خداوند برای انسان متوکل کافی است و نیازی به واسطه‌های دیگر نیست.
          </div>
        </div>
      </div>

      {/* Notes panel */}
      <div style={{ width: 280, background: 'var(--card)', borderRight: '1px solid var(--border-soft)', overflow: 'auto', flexShrink: 0, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-deep)', letterSpacing: 1.5, marginBottom: 12 }}>یادداشت‌ها</div>
        {[
          { t: 'معنای حَسْب', d: '۲ روز پیش', c: 'توکل به معنای کفایت — نیاز به واسطه نیست.' },
          { t: 'حدیث پیامبر', d: '۳ روز پیش', c: 'اعقلها و توکل — تلاش ظاهری همراه با توکل.' },
        ].map((n, i) => (
          <div key={i} style={{
            background: 'var(--gold-wash)', borderRadius: 'var(--r-sm)',
            padding: 12, marginBottom: 10, border: '1px solid oklch(0.82 0.06 75 / 0.3)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{n.t}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{n.d}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.7 }}>{n.c}</div>
          </div>
        ))}
        <div style={{
          marginTop: 12, padding: '10px 12px', border: '1px dashed var(--border)',
          borderRadius: 'var(--r-sm)', color: 'var(--ink-3)', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
        }}>
          <IconPlus size={14} /> یادداشت جدید
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { DesktopHeader, DesktopHome, DesktopReading });
