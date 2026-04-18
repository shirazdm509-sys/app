// Mobile screens part 2: Library, Book Index, Reading, Media, Lectures, Q&A, Player

// ─────────────────────────────────────────────
// LIBRARY — grid of book covers
// ─────────────────────────────────────────────
const MobileLibrary = () => {
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
  ];
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <MobileHeader title="کتابخانه" right={
        <>
          <div className="icon-btn"><IconSearch size={20} /></div>
          <div className="icon-btn"><IconGrid size={20} /></div>
        </>
      } />
      {/* filter chips */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 16px 4px',
        scrollbarWidth: 'none',
      }}>
        {['همه', 'دانلود شده', 'اخلاق', 'تفسیر', 'فقه', 'کلام'].map((f, i) => (
          <div key={f} style={{
            padding: '6px 14px', borderRadius: 100, fontSize: 12,
            whiteSpace: 'nowrap', flexShrink: 0,
            background: i === 0 ? 'var(--green-deep)' : 'var(--card)',
            color: i === 0 ? '#fff' : 'var(--ink-2)',
            border: i === 0 ? 'none' : '1px solid var(--border)',
            fontWeight: i === 0 ? 600 : 400,
          }}>{f}</div>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {books.map((b, i) => <LibraryCard key={i} {...b} />)}
      </div>

      <div style={{ height: 20 }} />
      <MobileBottomNav active="lib" />
    </div>
  );
};

const LibraryCard = ({ t, c1, c2, state }) => (
  <div>
    <div style={{
      width: '100%', aspectRatio: '3/4', borderRadius: 'var(--r-sm)',
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--sh-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 10,
    }}>
      <div style={{ position: 'absolute', inset: 5, border: '1px solid oklch(0.85 0.08 75 / 0.4)', borderRadius: 3 }} />
      <div style={{ color: 'oklch(0.92 0.06 80)', fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>{t}</div>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: 'rgba(0,0,0,0.2)' }} />
      {state === 'downloaded' && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--green)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><IconCheck size={12} stroke={2.4} /></div>
      )}
      {state === 'downloading' && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          width: 22, height: 22, borderRadius: '50%',
          background: '#fff', color: 'var(--green-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><IconDownload size={12} /></div>
      )}
    </div>
    <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>{t}</div>
    <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>آیت الله دستغیب</div>
  </div>
);

// ─────────────────────────────────────────────
// BOOK INDEX
// ─────────────────────────────────────────────
const MobileBookIndex = () => (
  <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
    <MobileHeader title="چهل حدیث" showBack right={
      <>
        <div className="icon-btn"><IconBookmark size={18} /></div>
        <div className="icon-btn"><IconDots size={20} /></div>
      </>
    } />

    {/* progress card */}
    <div style={{ padding: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--green-wash), var(--card))',
        border: '1px solid var(--green-soft)',
        borderRadius: 'var(--r-md)', padding: 14,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{
          width: 72, height: 96, borderRadius: 6,
          background: 'linear-gradient(135deg, #c89268, #8a5a32)', flexShrink: 0,
          boxShadow: 'var(--sh-1)',
          position: 'relative', padding: 6,
        }}>
          <div style={{ position: 'absolute', inset: 3, border: '1px solid oklch(0.85 0.08 75 / 0.4)', borderRadius: 2 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>در حال مطالعه</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>چهل حدیث</div>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 8 }}>حدیث ۱۲ از ۴۰ • ۳۰٪</div>
          <div style={{ height: 4, background: 'var(--border-soft)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: '30%', height: '100%', background: 'var(--green)' }} />
          </div>
        </div>
      </div>

      {/* continue button */}
      <div style={{
        marginTop: 12, padding: '12px 16px',
        background: 'var(--green-deep)', color: '#fff', borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontSize: 13, fontWeight: 600, boxShadow: 'var(--sh-1)',
      }}>
        <IconArrowLeft size={16} />
        ادامه مطالعه
      </div>
    </div>

    {/* Tabs */}
    <div style={{
      display: 'flex', padding: '0 16px', gap: 2,
      borderBottom: '1px solid var(--border-soft)',
    }}>
      {[
        { l: 'فهرست', a: true },
        { l: 'نشان‌ها', a: false },
        { l: 'یادداشت‌ها', a: false },
      ].map((t, i) => (
        <div key={i} style={{
          flex: 1, textAlign: 'center', padding: '12px 0',
          fontSize: 13, fontWeight: t.a ? 700 : 500,
          color: t.a ? 'var(--green-deep)' : 'var(--ink-3)',
          borderBottom: t.a ? '2px solid var(--green)' : '2px solid transparent',
          marginBottom: -1,
        }}>{t.l}</div>
      ))}
    </div>

    {/* chapter list */}
    <div style={{ padding: '8px 16px' }}>
      {[
        { n: '۱', t: 'حدیث اول — نیت', s: 'صفحه ۱۱', done: true },
        { n: '۲', t: 'حدیث دوم — اخلاص', s: 'صفحه ۱۹', done: true },
        { n: '۳', t: 'حدیث سوم — صبر', s: 'صفحه ۲۸', done: true },
        { n: '۴', t: 'حدیث چهارم — توکل', s: 'صفحه ۳۷', done: true, open: true },
        { n: '۵', t: 'حدیث پنجم — تقوا', s: 'صفحه ۴۸', done: false },
        { n: '۶', t: 'حدیث ششم — حیا', s: 'صفحه ۵۹', done: false },
        { n: '۷', t: 'حدیث هفتم — صدق', s: 'صفحه ۶۸', done: false },
        { n: '۸', t: 'حدیث هشتم — امانت', s: 'صفحه ۷۷', done: false },
      ].map((c, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 8px', borderBottom: i < 7 ? '1px solid var(--border-soft)' : 'none',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: c.done ? 'var(--green-wash)' : 'var(--bg-deep)',
            color: c.done ? 'var(--green-deep)' : 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{c.done ? <IconCheck size={14} stroke={2.4} /> : c.n}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: c.open ? 700 : 500, color: c.open ? 'var(--green-deep)' : 'var(--ink)' }}>{c.t}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{c.s}</div>
          </div>
          {c.open && <div style={{ color: 'var(--green-deep)' }}><IconBookmark size={16} /></div>}
        </div>
      ))}
    </div>

    <div style={{ height: 16 }} />
    <MobileBottomNav active="lib" />
  </div>
);

// ─────────────────────────────────────────────
// READING
// ─────────────────────────────────────────────
const MobileReading = () => (
  <div style={{ background: 'var(--bg-soft)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 16px 12px', background: 'var(--card)',
      borderBottom: '1px solid var(--border-soft)',
    }}>
      <div className="icon-btn"><IconChevronRight size={22} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>حدیث چهارم — توکل</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>صفحه ۳۷ از ۴۸۰</div>
      </div>
      <div className="icon-btn"><IconType size={18} /></div>
      <div className="icon-btn"><IconBookmark size={18} /></div>
    </div>

    <div style={{ flex: 1, overflow: 'auto', padding: '24px 22px 80px' }}>
      {/* section ornament */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <svg width="160" height="30" viewBox="0 0 160 30">
          <line x1="10" y1="15" x2="60" y2="15" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
          <path d="M80 8 L86 15 L80 22 L74 15 Z" fill="var(--gold)" opacity="0.8"/>
          <circle cx="70" cy="15" r="2" fill="var(--gold)" opacity="0.5"/>
          <circle cx="90" cy="15" r="2" fill="var(--gold)" opacity="0.5"/>
          <line x1="100" y1="15" x2="150" y2="15" stroke="var(--gold)" strokeWidth="1" opacity="0.4"/>
        </svg>
      </div>

      {/* Arabic verse */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--r-md)',
        padding: '20px 18px', border: '1px solid var(--border-soft)',
        marginBottom: 18,
      }}>
        <div style={{
          fontSize: 21, lineHeight: 2.1, textAlign: 'center', color: 'var(--ink)',
          fontFamily: 'Amiri, "Noto Naskh Arabic", Vazirmatn, serif',
          fontWeight: 500,
        }}>
          وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ إِنَّ اللَّهَ بَالِغُ أَمْرِهِ
        </div>
        <div style={{
          fontSize: 10, textAlign: 'center', color: 'var(--gold-deep)',
          marginTop: 10, fontWeight: 600, letterSpacing: 1,
        }}>سوره طلاق — آیه ۳</div>
      </div>

      {/* Translation */}
      <div style={{
        fontSize: 14.5, lineHeight: 2, color: 'var(--ink)',
        textAlign: 'justify', marginBottom: 20,
      }}>
        <span style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>و هر که بر خدا توکل کند</span>، خداوند او را کفایت می‌کند. همانا خداوند به فرمان خود می‌رساند. در این آیه شریفه، حقیقت توکل به روشنی بیان شده است. توکل یعنی واگذار کردن امور به خداوند متعال پس از تلاش و کوشش لازم.
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-2)', textAlign: 'justify' }}>
        انسان مؤمن باید تمام اسباب ظاهری را فراهم کند و سپس نتیجه را از خدا بخواهد. این همان روحیه‌ای است که در سیره انبیا و اولیا به وضوح دیده می‌شود.
      </div>
    </div>

    {/* Bottom controls — slider + prev/next */}
    <div style={{
      background: 'var(--card)', borderTop: '1px solid var(--border-soft)',
      padding: '12px 16px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconChevronRight size={20} />
        <div style={{ flex: 1, height: 4, background: 'var(--border-soft)', borderRadius: 2, position: 'relative' }}>
          <div style={{ width: '8%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translate(50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--green-deep)', border: '2px solid #fff', boxShadow: 'var(--sh-1)' }} />
        </div>
        <IconChevronLeft size={20} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MEDIA
// ─────────────────────────────────────────────
const MobileMedia = () => {
  const cats = [
    { t: 'سخنرانی‌ها', n: '۲۳۴', c: 'cat-1' },
    { t: 'جلسات اخلاق', n: '۸۹', c: 'cat-2' },
    { t: 'تفسیر قرآن', n: '۱۵۶', c: 'green' },
    { t: 'مناجات و ادعیه', n: '۴۲', c: 'cat-3' },
    { t: 'سخنرانی‌های کوتاه', n: '۱۲۰', c: 'gold' },
    { t: 'مناسبت‌ها', n: '۶۷', c: 'cat-4' },
  ];
  const toneMap = {
    'cat-1': { a: 'oklch(0.72 0.08 35)', b: 'oklch(0.55 0.08 35)' },
    'cat-2': { a: 'oklch(0.68 0.08 200)', b: 'oklch(0.48 0.08 210)' },
    'cat-3': { a: 'oklch(0.70 0.09 290)', b: 'oklch(0.50 0.09 290)' },
    'cat-4': { a: 'oklch(0.72 0.09 125)', b: 'oklch(0.50 0.08 130)' },
    'green': { a: 'oklch(0.52 0.08 155)', b: 'oklch(0.38 0.06 158)' },
    'gold':  { a: 'oklch(0.72 0.09 75)', b: 'oklch(0.55 0.09 70)' },
  };
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <MobileHeader title="رسانه" right={
        <>
          <div className="icon-btn"><IconSearch size={20} /></div>
          <div className="icon-btn"><IconList size={20} /></div>
        </>
      } />

      <div style={{ display: 'flex', padding: '12px 16px 4px', gap: 6 }}>
        {[
          { l: 'فیلم', Icon: IconMedia, a: true },
          { l: 'صوت', Icon: IconHeadphones, a: false },
          { l: 'عکس', Icon: IconImage, a: false },
        ].map((t, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)',
            background: t.a ? 'var(--card)' : 'transparent',
            color: t.a ? 'var(--green-deep)' : 'var(--ink-3)',
            border: t.a ? '1px solid var(--green-soft)' : '1px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: t.a ? 600 : 500,
          }}>
            <t.Icon size={16} stroke={t.a ? 1.8 : 1.5} />
            {t.l}
          </div>
        ))}
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {cats.map((c, i) => {
          const tm = toneMap[c.c];
          return (
            <div key={i} style={{
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              background: 'var(--card)', border: '1px solid var(--border-soft)',
              padding: 14, position: 'relative', minHeight: 140,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              {/* folder icon */}
              <div style={{
                width: 46, height: 36, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '6px 6px 8px 8px',
                  background: `linear-gradient(135deg, ${tm.a}, ${tm.b})`,
                  boxShadow: `0 4px 10px ${tm.b}40`,
                }} />
                <div style={{
                  position: 'absolute', top: -4, right: 4, width: 18, height: 6,
                  borderRadius: '3px 3px 0 0', background: tm.b,
                }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.5 }}>{c.t}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{c.n} مورد</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 16 }} />
      <MobileBottomNav active="media" />
    </div>
  );
};

// ─────────────────────────────────────────────
// LECTURES
// ─────────────────────────────────────────────
const MobileLectures = () => (
  <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
    <MobileHeader title="سخنرانی‌ها" right={
      <>
        <div className="icon-btn"><IconSearch size={20} /></div>
        <div className="icon-btn"><IconCalendar size={18} /></div>
      </>
    } />
    <div style={{ padding: '14px 16px 8px' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.7 }}>
        مجموعه سخنرانی‌ها بر اساس مناسبت و موضوع دسته‌بندی شده است
      </div>
    </div>
    <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {[
        { t: 'ماه رمضان', n: '۶۸ جلسه', a: 'oklch(0.58 0.10 30)', b: 'oklch(0.38 0.08 28)', icon: '☾' },
        { t: 'تفسیر قرآن', n: '۱۲۴ جلسه', a: 'oklch(0.52 0.08 155)', b: 'oklch(0.32 0.06 158)', icon: '۞' },
        { t: 'محرم و صفر', n: '۴۲ جلسه', a: 'oklch(0.40 0.06 25)', b: 'oklch(0.24 0.05 25)', icon: '✦' },
        { t: 'مناسبت‌ها', n: '۳۸ جلسه', a: 'oklch(0.55 0.09 270)', b: 'oklch(0.35 0.07 270)', icon: '✧' },
      ].map((c, i) => (
        <div key={i} style={{
          aspectRatio: '1/1.1', borderRadius: 'var(--r-md)',
          background: `linear-gradient(135deg, ${c.a}, ${c.b})`,
          color: '#fff', padding: 16, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: 'var(--sh-2)',
        }}>
          <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 52, opacity: 0.15, lineHeight: 1, fontFamily: 'serif' }}>{c.icon}</div>
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="0.5"/>
            <path d="M50 10 L50 90 M10 50 L90 50" stroke="#fff" strokeWidth="0.3"/>
          </svg>
          <div />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.t}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>{c.n}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Latest lectures list */}
    <div style={{ padding: '20px 16px 0' }}>
      <SectionHeader title="آخرین سخنرانی‌ها" cta="همه" />
    </div>
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { t: 'جلسه پنجم — ماه مبارک رمضان', d: '۵۲ دقیقه' },
        { t: 'شب قدر و اهمیت احیا', d: '۴۸ دقیقه' },
        { t: 'تفسیر آیه ولایت', d: '۳۶ دقیقه' },
      ].map((a, i) => <AudioRow key={i} {...a} />)}
    </div>

    <div style={{ height: 16 }} />
    <MobileBottomNav active="lect" />
  </div>
);

// ─────────────────────────────────────────────
// Q&A / LOGIN
// ─────────────────────────────────────────────
const MobileLogin = () => (
  <div style={{ background: 'var(--bg)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ flex: 1, padding: '40px 24px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex' }}><BrandMark size={72} /></div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 16 }}>پرسش و پاسخ</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.7 }}>
          برای طرح پرسش و مشاهده پاسخ‌ها وارد شوید
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', background: 'var(--bg-deep)',
        borderRadius: 'var(--r-md)', padding: 4, marginBottom: 20,
      }}>
        {['ورود', 'ثبت‌نام'].map((l, i) => (
          <div key={l} style={{
            flex: 1, textAlign: 'center', padding: '10px 0',
            borderRadius: 'var(--r-sm)',
            background: i === 0 ? 'var(--card)' : 'transparent',
            color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
            fontSize: 13, fontWeight: i === 0 ? 700 : 500,
            boxShadow: i === 0 ? 'var(--sh-1)' : 'none',
          }}>{l}</div>
        ))}
      </div>

      <Field label="شماره همراه" value="۰۹۱۲ ۳۴۵ ۶۷۸۹" />
      <Field label="رمز عبور" value="••••••••" />

      <div style={{
        marginTop: 4, fontSize: 11.5, color: 'var(--green-deep)',
        textAlign: 'left', fontWeight: 500,
      }}>فراموشی رمز عبور؟</div>

      <div style={{
        marginTop: 28, padding: '14px 0',
        background: 'var(--green-deep)', color: '#fff',
        borderRadius: 'var(--r-md)', textAlign: 'center',
        fontSize: 14, fontWeight: 600, boxShadow: 'var(--sh-1)',
      }}>ورود به حساب</div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginTop: 20, color: 'var(--ink-4)', fontSize: 11,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        یا
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{
        marginTop: 16, padding: '13px 0',
        background: 'var(--card)', color: 'var(--ink)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', textAlign: 'center',
        fontSize: 13, fontWeight: 500,
      }}>ورود با رمز یکبار مصرف</div>
    </div>
    <MobileBottomNav active="qa" />
  </div>
);

const Field = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '12px 14px',
      fontSize: 13.5, color: 'var(--ink)',
      fontVariantNumeric: 'tabular-nums',
      direction: 'ltr', textAlign: 'right',
    }}>{value}</div>
  </div>
);

// ─────────────────────────────────────────────
// AUDIO PLAYER
// ─────────────────────────────────────────────
const MobilePlayer = () => (
  <div style={{
    background: 'linear-gradient(180deg, oklch(0.32 0.05 158) 0%, oklch(0.22 0.04 160) 100%)',
    minHeight: '100%', color: '#fff', display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 12px' }}>
      <div className="icon-btn" style={{ color: '#fff' }}><IconChevronDown size={22} /></div>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 11, opacity: 0.7 }}>در حال پخش از</div>
      <div style={{ fontSize: 11, fontWeight: 600, marginLeft: 16 }}>تفسیر قرآن</div>
      <div className="icon-btn" style={{ color: '#fff' }}><IconDots size={20} /></div>
    </div>

    {/* Artwork */}
    <div style={{ padding: '30px 40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', aspectRatio: '1/1', borderRadius: 'var(--r-xl)',
        background: 'linear-gradient(135deg, oklch(0.55 0.10 155) 0%, oklch(0.28 0.05 160) 100%)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}>
          <g stroke="oklch(0.85 0.08 75)" fill="none" strokeWidth="1">
            <circle cx="100" cy="100" r="90"/>
            <circle cx="100" cy="100" r="70"/>
            <circle cx="100" cy="100" r="50"/>
            <path d="M100 10 L100 190 M10 100 L190 100 M35 35 L165 165 M35 165 L165 35"/>
            <path d="M100 30 L130 100 L100 170 L70 100 Z" strokeWidth="1.5"/>
          </g>
        </svg>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'relative' }}>
          <g fill="oklch(0.85 0.08 75)" opacity="0.9">
            <path d="M40 10 L52 40 L40 70 L28 40 Z"/>
            <path d="M10 40 L40 28 L70 40 L40 52 Z" opacity="0.6"/>
          </g>
        </svg>
      </div>
    </div>

    <div style={{ flex: 1 }} />

    {/* Track info */}
    <div style={{ padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>تفسیر سوره یس — جلسه هفتم</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>آیت الله دستغیب</div>
    </div>

    {/* Progress */}
    <div style={{ padding: '20px 24px 8px' }}>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, position: 'relative' }}>
        <div style={{ width: '35%', height: '100%', background: 'oklch(0.85 0.08 75)', borderRadius: 2 }} />
        <div style={{
          position: 'absolute', right: '35%', top: '50%', transform: 'translate(50%, -50%)',
          width: 12, height: 12, borderRadius: '50%', background: 'oklch(0.85 0.08 75)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
        <span>۱۶:۴۲</span>
        <span>۴۸:۱۵</span>
      </div>
    </div>

    {/* Transport */}
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
      padding: '16px 24px 30px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.7)' }}><IconShare size={20} /></div>
      <div style={{ color: '#fff' }}><IconSkipForward size={26} /></div>
      <div style={{
        width: 62, height: 62, borderRadius: '50%',
        background: 'oklch(0.85 0.08 75)', color: 'oklch(0.28 0.05 160)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px oklch(0.85 0.08 75 / 0.4)',
      }}><IconPause size={22} stroke={0} /></div>
      <div style={{ color: '#fff' }}><IconSkipBack size={26} /></div>
      <div style={{ color: 'rgba(255,255,255,0.7)' }}><IconDownload size={20} /></div>
    </div>
  </div>
);

Object.assign(window, {
  MobileLibrary, LibraryCard, MobileBookIndex, MobileReading,
  MobileMedia, MobileLectures, MobileLogin, Field, MobilePlayer,
});
