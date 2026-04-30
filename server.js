require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
let sharp; try { sharp = require('sharp'); } catch(e) { sharp = null; }
const bcrypt = require('bcryptjs');
let mm; try { mm = require('music-metadata'); } catch(e) { mm = null; }
// برای Node.js < 22 که require() برای ESM کار نمی‌کند از dynamic import استفاده می‌شود
async function getMusicMeta() {
    if (mm) return mm;
    try { mm = await import('music-metadata'); } catch(e) {}
    return mm;
}
let webpush; try { webpush = require('web-push'); } catch(e) { webpush = null; }

// VAPID keys (stored in env or defaults generated once)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAL3iRBxoSa5U16TRyhqQubEAb97VXAkF0jU0iKh2rX7MX4cIYXK2qTFiBMSHL59F3lUWCYtaAvtnruUwDmgSbE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Y2NG_PXSMfMXfxbZ_UGX4lW7sWASyOuALHbL4QSYg4E';
if (webpush) {
    webpush.setVapidDetails('mailto:admin@localhost', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

let rateLimit, helmet, compression;
try { rateLimit = require('express-rate-limit'); } catch(e) { rateLimit = null; }
try { helmet = require('helmet'); } catch(e) { helmet = null; }
try { compression = require('compression'); } catch(e) { compression = null; }

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@secure2024';

// Digital Asset Links — قبل از هر middleware تا هیچ‌چیزی بلاکش نکنه
app.get('/.well-known/assetlinks.json', (req, res) => {
    const fp = path.join(__dirname, 'public', '.well-known', 'assetlinks.json');
    try {
        const c = fs.readFileSync(fp, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        return res.end(c);
    } catch(e) {
        res.setHeader('Content-Type', 'application/json');
        return res.end('[]');
    }
});

// Compression — gzip/brotli for API + static
if (compression) {
    app.use(compression({ threshold: 1024, level: 6 }));
}

// Security middleware
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        frameguard: { action: 'sameorigin' },
    }));
}
// فول‌بک اگر helmet نصب نباشد
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!res.getHeader('X-Frame-Options')) res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (!res.getHeader('Strict-Transport-Security')) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (!res.getHeader('Referrer-Policy')) res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    next();
});

// CORS — محدود به همان origin و لیست مجاز
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        // درخواست‌های هم‌origin (بدون Origin header) مجاز
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.length === 0) return cb(null, true); // اگر تنظیم نشده، same-origin
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
    },
    credentials: false,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','x-admin-token','x-user-id','Authorization']
}));

// Rate limiting
let adminLoginLimiter = (req, res, next) => next();
let proxyLimiter = (req, res, next) => next();
let searchLimiter = (req, res, next) => next();
if (rateLimit) {
    // فقط روی API اعمال میشه نه فایل‌های استاتیک
    const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 1500, standardHeaders: true, legacyHeaders: false });
    const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'تعداد تلاش بیش از حد است' } });
    adminLoginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, message: { error: 'تعداد تلاش‌های ورود بیش از حد است. بعداً تلاش کنید.' } });
    proxyLimiter = rateLimit({ windowMs: 60*1000, max: 30, standardHeaders: true, legacyHeaders: false });
    searchLimiter = rateLimit({ windowMs: 60*1000, max: 30, standardHeaders: true, legacyHeaders: false });
    app.use('/api/auth', authLimiter);
    app.use('/api/', apiLimiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/version', (req, res) => res.json({ v: '2.4.0', built: '2026-04-09' }));

// Dynamic manifest.json (reads PWA settings from DB)
app.get('/manifest.json', (req, res) => {
    const keys = ['pwa_name','pwa_short_name','pwa_description','pwa_theme_color','pwa_bg_color','icon_version','pwa_screenshots'];
    mainDb.all(`SELECT key,value FROM settings WHERE key IN (${keys.map(()=>'?').join(',')})`, keys, (err, rows) => {
        const s = {};
        if (rows) rows.forEach(r => { s[r.key] = r.value; });
        const v = s.icon_version || '1';
        // آیکون‌های any و maskable باید جدا باشند (الزام PWABuilder)
        const anySizes = [72,96,128,144,152,192,384,512];
        const maskableSizes = [192,512];
        const anyIcons = anySizes.map(sz => ({
            src: `/icons/icon-${sz}.png?v=${v}`,
            sizes: `${sz}x${sz}`,
            type: 'image/png',
            purpose: 'any'
        }));
        const maskableIcons = maskableSizes.map(sz => ({
            src: `/icons/icon-${sz}-maskable.png?v=${v}`,
            sizes: `${sz}x${sz}`,
            type: 'image/png',
            purpose: 'maskable'
        }));
        let screenshots = [];
        try { screenshots = s.pwa_screenshots ? JSON.parse(s.pwa_screenshots) : []; } catch(e) {}
        const manifest = {
            name: s.pwa_name || 'نرم افزار آیت الله دستغیب',
            short_name: s.pwa_short_name || 'آیت الله دستغیب',
            description: s.pwa_description || 'نرم افزار آیت الله دستغیب',
            theme_color: s.pwa_theme_color || '#0d9488',
            background_color: s.pwa_bg_color || '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            lang: 'fa',
            dir: 'rtl',
            id: '/',
            icons: [...anyIcons, ...maskableIcons],
            ...(screenshots.length > 0 ? { screenshots } : {})
        };
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(JSON.stringify(manifest));
    });
});

// HTML و sw.js: no-cache تا مرورگر همیشه نسخه تازه بگیرد
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/' || req.path === '/sw.js') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true, dotfiles: 'deny' }));

// DB
const mainDbPath = path.resolve(__dirname, 'library.sqlite');
const mainDb = new sqlite3.Database(mainDbPath, (err) => {
    if (err) { console.error('DB Error:', err.message); return; }
    console.log('✅ دیتابیس آماده است.');
    initDb();
});

function initDb() {
    mainDb.serialize(() => {
        mainDb.run(`CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT DEFAULT '', description TEXT DEFAULT '', cover TEXT DEFAULT '', db_filename TEXT NOT NULL, page_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, text TEXT NOT NULL, sender_type TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_read INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subject TEXT NOT NULL, status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, user_id INTEGER DEFAULT NULL)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS ticket_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, text TEXT NOT NULL, sender_type TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ticket_id) REFERENCES tickets(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, position INTEGER UNIQUE NOT NULL, title TEXT DEFAULT '', image TEXT DEFAULT '', link TEXT DEFAULT '', active INTEGER DEFAULT 0, page_section TEXT DEFAULT 'after_books', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`ALTER TABLE banners ADD COLUMN page_section TEXT DEFAULT 'after_books'`, () => {});
        mainDb.run(`CREATE TABLE IF NOT EXISTS sliders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT '', image TEXT DEFAULT '', link TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, display_section TEXT DEFAULT 'main', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`ALTER TABLE sliders ADD COLUMN display_section TEXT DEFAULT 'main'`, () => {});
        mainDb.run(`ALTER TABLE banners ADD COLUMN pages TEXT DEFAULT 'home'`, () => {});
        mainDb.run(`ALTER TABLE sliders ADD COLUMN pages TEXT DEFAULT 'home'`, () => {});
        mainDb.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'broadcast', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS user_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, notification_id INTEGER NOT NULL, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, subscription TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS page_contents (id TEXT PRIMARY KEY, title TEXT DEFAULT '', content TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        [['social','شبکه‌های اجتماعی'],['biography','زندگی‌نامه'],['mosque','مسجد قبا'],['contact','ارتباط با ما']].forEach(([id,title])=>{
            mainDb.run(`INSERT OR IGNORE INTO page_contents (id,title,content) VALUES (?,?,'')`,[id,title]);
        });
        mainDb.run(`CREATE TABLE IF NOT EXISTS gallery_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', cover TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS gallery_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, title TEXT DEFAULT '', image TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES gallery_categories(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS audio_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', cover TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS audio_tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, title TEXT NOT NULL, artist TEXT DEFAULT '', audio_url TEXT NOT NULL, cover TEXT DEFAULT '', duration INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES audio_categories(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS video_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', cover TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS video_items (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, title TEXT NOT NULL, embed_url TEXT NOT NULL, thumbnail TEXT DEFAULT '', description TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES video_categories(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS news_sliders (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL UNIQUE, post_title TEXT NOT NULL, post_url TEXT NOT NULL, post_image TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // Migration: add show_title to news_sliders
        mainDb.run(`ALTER TABLE news_sliders ADD COLUMN show_title INTEGER DEFAULT 1`, () => {});

        // Migration: add parent_id to category tables for nested categories
        mainDb.run(`ALTER TABLE gallery_categories ADD COLUMN parent_id INTEGER DEFAULT NULL`, () => {});
        mainDb.run(`ALTER TABLE audio_categories ADD COLUMN parent_id INTEGER DEFAULT NULL`, () => {});
        mainDb.run(`ALTER TABLE video_categories ADD COLUMN parent_id INTEGER DEFAULT NULL`, () => {});
        // Migration: add publish_date and sort_order
        mainDb.run(`ALTER TABLE audio_tracks ADD COLUMN publish_date TEXT DEFAULT NULL`, () => {});
        mainDb.run(`ALTER TABLE video_items ADD COLUMN publish_date TEXT DEFAULT NULL`, () => {});
        mainDb.run(`ALTER TABLE books ADD COLUMN sort_order INTEGER DEFAULT 0`, () => {});
        mainDb.run(`ALTER TABLE books ADD COLUMN book_type TEXT DEFAULT 'db'`, () => {});
        mainDb.run(`ALTER TABLE books ADD COLUMN pdf_filename TEXT DEFAULT ''`, () => {});

        const defaults = [
            ['site_name','نرم افزار آیت الله دستغیب'],
            ['site_subtitle','DastgheibQoba.info'],
            ['primary_color','#0d9488'],
            ['secondary_color','#0f766e'],
            ['logo_url',''],
            ['header_logo_url',''],
            ['favicon_url',''],
            ['live_url',''],
            ['live_active','0'],
            ['live_embed',''],
            ['slider_padding','0'],
            ['slider_radius','0'],
            ['slider_height','180'],
            ['slider_height_mobile','200'],
            ['slider_height_tablet','350'],
            ['slider_height_desktop','500'],
            ['banner_padding','4'],
            ['banner_radius','16'],
            ['banner_height','120'],
            ['pwa_name','مرکز نشر آثار آیت الله دستغیب'],
            ['pwa_short_name','مرکز نشر آثار'],
            ['pwa_description','اپلیکیشن مرکز نشر آثار آیت الله دستغیب'],
            ['pwa_theme_color','#0d9488'],
            ['pwa_bg_color','#ffffff'],
            ['dark_mode_enabled','1'],
            ['splash_bg_color','#ffffff'],
            ['splash_title','مرکز نشر آثار'],
            ['splash_subtitle','در حال آماده‌سازی و دریافت اطلاعات...'],
            ['splash_spinner_color','#0d9488'],
            ['splash_icon_url',''],
        ];
        defaults.forEach(([k,v]) => mainDb.run(`INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)`, [k,v]));
        // Migration: update branding texts
        mainDb.run(`UPDATE settings SET value='نرم افزار آیت الله دستغیب' WHERE key='site_name' AND value='مرکز نشر آثار آیت الله دستغیب'`);
        mainDb.run(`UPDATE settings SET value='DastgheibQoba.info' WHERE key='site_subtitle' AND value='آیت الله دستغیب'`);
        for(let i=1;i<=3;i++) mainDb.run(`INSERT OR IGNORE INTO banners (position,title,image,link,active) VALUES (?,'',' ','',0)`,[i]);
        // Migration: add user_id to tickets if not exists
        mainDb.run(`ALTER TABLE tickets ADD COLUMN user_id INTEGER DEFAULT NULL`, () => {});
        // Migration: add notifications tables if not exists (already created above)

        // Performance indexes for hot query paths
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_audio_tracks_category ON audio_tracks(category_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_audio_tracks_pubdate ON audio_tracks(publish_date)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_video_items_category ON video_items(category_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_video_items_pubdate ON video_items(publish_date)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_gallery_photos_category ON gallery_photos(category_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_audio_categories_parent ON audio_categories(parent_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_video_categories_parent ON video_categories(parent_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_gallery_categories_parent ON gallery_categories(parent_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_user_notifications_notif ON user_notifications(notification_id)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_books_sort ON books(sort_order)`, () => {});
        mainDb.run(`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)`, () => {});
    });
}

// Dirs
['public/covers','public/banners','public/sliders','public/logos','public/icons','public/gallery','public/audio','public/content','books'].forEach(d => {
    const p = path.join(__dirname, d);
    if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true});
});

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dirs = { cover:'public/covers', database:'books', pdf_file:'books', banner_image:'public/banners', slider_image:'public/sliders', logo:'public/logos', header_logo:'public/logos', favicon:'public/icons', gallery_image:'public/gallery', audio_cover:'public/gallery', audio_file:'public/audio', content_image:'public/content' };
        cb(null, path.join(__dirname, dirs[file.fieldname] || 'public/covers'));
    },
    filename: (req, file, cb) => {
        // محدود کردن extension به لیست سفید و استفاده از نام تصادفی
        const origExt = (path.extname(file.originalname || '') || '').toLowerCase().replace(/[^a-z0-9.]/g,'').slice(0,8);
        const safeExt = /^\.[a-z0-9]{1,6}$/.test(origExt) ? origExt : '';
        cb(null, crypto.randomBytes(12).toString('hex') + safeExt);
    }
});
const ALLOWED_MIME = {
    image: ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'],
    audio: ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/aac','audio/mp4','audio/x-m4a','audio/webm','audio/flac','audio/x-flac'],
    pdf:   ['application/pdf','application/x-pdf'],
    db:    ['application/octet-stream','application/x-sqlite3','application/vnd.sqlite3','application/x-sqlite','application/sqlite3']
};
const ALLOWED_EXT = {
    image: ['.jpg','.jpeg','.png','.gif','.webp','.svg','.ico'],
    audio: ['.mp3','.wav','.ogg','.aac','.m4a','.webm','.flac'],
    pdf:   ['.pdf'],
    db:    ['.db','.sqlite','.sqlite3']
};
function _makeFilter(types){
    return (req,file,cb) => {
        const ext = (path.extname(file.originalname||'')||'').toLowerCase();
        const mime = (file.mimetype||'').toLowerCase();
        for (const t of types) {
            if (ALLOWED_EXT[t].includes(ext) && ALLOWED_MIME[t].includes(mime)) return cb(null, true);
        }
        cb(Object.assign(new Error('نوع فایل مجاز نیست'), { code: 'LIMIT_UNEXPECTED_FILE' }));
    };
}
// محدودیت‌ها بر اساس نوع endpoint — حداقل اندازه ممکن
const uploadImage = multer({ storage, limits:{fileSize:10*1024*1024, files:10}, fileFilter: _makeFilter(['image']) });
const uploadIconMemory = multer({ storage: multer.memoryStorage(), limits:{fileSize:2*1024*1024, files:1}, fileFilter: _makeFilter(['image']) });
const uploadAudio = multer({ storage, limits:{fileSize:60*1024*1024, files:5}, fileFilter: _makeFilter(['audio','image']) });
// آپلود ترکیبی برای کتاب: جلد(عکس)، فایل دیتابیس sqlite یا pdf — کتاب‌های pdf حجیم هستند
const upload = multer({ storage, limits:{fileSize:200*1024*1024, files:10}, fileFilter: _makeFilter(['image','pdf','db']) });

// Auth middleware
function adminAuth(req,res,next) {
    const tok = req.headers['x-admin-token'];
    if (!tok || typeof tok !== 'string' || tok.trim() === '') {
        return res.status(401).json({error:'دسترسی غیرمجاز'});
    }
    // Constant-time comparison: pad both to 128 bytes to avoid timing oracle
    try {
        const a = Buffer.alloc(128); Buffer.from(tok, 'utf8').copy(a);
        const b = Buffer.alloc(128); Buffer.from(ADMIN_PASSWORD, 'utf8').copy(b);
        if (crypto.timingSafeEqual(a, b)) return next();
    } catch(e) {}
    return res.status(401).json({error:'دسترسی غیرمجاز'});
}
function userAuth(req,res,next) {
    const uid = req.headers['x-user-id'];
    const n = parseInt(uid, 10);
    if(!uid || isNaN(n) || n <= 0 || n > 2147483647) return res.status(401).json({error:'لطفاً وارد حساب کاربری شوید'});
    req.userId = n; next();
}
// path helper: ensure resolved path stays within base (prevents traversal/symlink escape)
function safePath(base, userFile) {
    const baseAbs = path.resolve(base);
    const safe = path.basename(String(userFile || ''));
    const full = path.resolve(baseAbs, safe);
    if (!full.startsWith(baseAbs + path.sep) && full !== baseAbs) return null;
    return full;
}
// Safely unlink a file path stored in DB (e.g. "/covers/abc.jpg") — verifies it
// resolves under public/ to prevent path traversal via crafted DB values.
function unlinkPublicFile(rel) {
    if (!rel || typeof rel !== 'string') return;
    if (/^https?:\/\//i.test(rel)) return; // remote URL
    const base = path.resolve(__dirname, 'public');
    const cleaned = rel.replace(/^\/+/, '').replace(/\\/g, '/');
    if (cleaned.includes('..')) return; // hard reject any traversal token
    const full = path.resolve(base, cleaned);
    if (full !== base && !full.startsWith(base + path.sep)) return; // outside public/
    try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch(e) {}
}
// sanitize رشته ورودی: حذف tag های خطرناک و event handlerها
function san(s){
    if (typeof s !== 'string') return s;
    return s
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object[\s\S]*?<\/object>/gi, '')
        .replace(/<embed[\s\S]*?>/gi, '')
        .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/data\s*:\s*text\/html/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .trim();
}

// DB helper
function findBestTable(bookDb) {
    return new Promise(resolve=>{
        bookDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%'",[],(err,tables)=>{
            if(err||!tables||!tables.length) return resolve(null);
            let best=tables[0].name, max=-1, pending=tables.length;
            tables.forEach(t=>{
                bookDb.get(`SELECT COUNT(*) as cnt FROM "${t.name}"`,[],(err,r)=>{
                    if(!err&&r){let s=r.cnt;if(['book','datastorys','content','pages','story','table1'].includes(t.name.toLowerCase()))s*=1000;if(s>max){max=s;best=t.name;}}
                    if(--pending===0) resolve(best);
                });
            });
        });
    });
}
function countPages(p){
    return new Promise(resolve=>{
        // Timeout after 20 seconds to avoid hanging on large databases
        const timer = setTimeout(()=>{ resolve(0); }, 20000);
        const db=new sqlite3.Database(p,sqlite3.OPEN_READONLY,async err=>{
            if(err){ clearTimeout(timer); return resolve(0); }
            const t=await findBestTable(db);
            if(!t){ clearTimeout(timer); db.close(); return resolve(0); }
            db.get(`SELECT COUNT(*) as cnt FROM "${t}"`,[],(err,r)=>{
                clearTimeout(timer);
                db.close();
                resolve(err?0:r.cnt);
            });
        });
    });
}

// === API BOOKS ===
app.get('/api/books',(req,res)=>{
    mainDb.all('SELECT id,title,author,description,cover,page_count,sort_order,created_at,book_type,pdf_filename FROM books ORDER BY sort_order ASC, created_at DESC',[],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows);
    });
});
app.get('/api/books/:id',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT * FROM books WHERE id=?',[id],(err,b)=>{
        if(err) return res.status(500).json({error:err.message});
        if(!b) return res.status(404).json({error:'کتاب یافت نشد'});
        res.json(b);
    });
});
app.get('/api/books/:id/pages',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT db_filename FROM books WHERE id=?',[id],(err,book)=>{
        if(err||!book) return res.status(404).json({error:'کتاب یافت نشد'});
        const dbp=path.resolve(__dirname,'books',path.basename(book.db_filename));
        if(!fs.existsSync(dbp)) return res.status(404).json({error:'فایل دیتابیس یافت نشد'});
        const bDb=new sqlite3.Database(dbp,sqlite3.OPEN_READONLY,async err=>{
            if(err) return res.status(500).json({error:'خطا در باز کردن دیتابیس'});
            const tbl=await findBestTable(bDb);
            if(!tbl){bDb.close();return res.status(500).json({error:'جدول مناسب یافت نشد'});}
            bDb.all(`PRAGMA table_info("${tbl}")`,[],(_,cols)=>{
                if(!cols){bDb.close();return res.status(500).json({error:'خطا'});}
                const cn=cols.map(c=>c.name),cnl=cn.map(c=>c.toLowerCase().trim());
                let oc=null;
                for(const pc of['r','page','id','_id','rowid']){const i=cnl.indexOf(pc);if(i!==-1){oc=cn[i];break;}}
                const q=oc?`SELECT * FROM "${tbl}" ORDER BY "${oc}" ASC`:`SELECT * FROM "${tbl}"`;
                bDb.all(q,[],(err,rows)=>{
                    bDb.close();if(err) return res.status(500).json({error:err.message});
                    const norm=rows.map((r,idx)=>{
                        const ks=Object.keys(r);
                        const gv=ns=>{for(const k of ks){if(ns.includes(k.toLowerCase().trim())){let v=r[k];if(Buffer.isBuffer(v))v=v.toString('utf8');return v;}}return null;};
                        return{ID:gv(['id','_id','bookid','rowid'])??idx,name:(gv(['name','title','subject','topic','heading','عنوان'])??'بدون عنوان').toString(),text:(gv(['text','content','body','matn','description','html','متن'])??'').toString(),page:gv(['page','pagenumber','r'])??idx,season:(gv(['season','chapter','part','category','فصل'])??'').toString()};
                    });
                    res.json(norm);
                });
            });
        });
    });
});

// === API SEARCH ===
app.get('/api/search', searchLimiter, async (req, res) => {
    let q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) return res.json({ books: [], pages: [] });
    if (q.length > 80) q = q.slice(0, 80);
    // حذف کاراکترهای خطرناک (کنترل، html, null byte)
    q = q.replace(/[\x00-\x1f\x7f<>]/g, '').trim();
    if (!q) return res.json({ books: [], pages: [] });

    // Search in book titles/authors
    mainDb.all(
        `SELECT id,title,author,cover,page_count FROM books WHERE LOWER(title) LIKE ? OR LOWER(author) LIKE ? ORDER BY created_at DESC`,
        [`%${q}%`, `%${q}%`],
        async (err, bookMatches) => {
            if (err) return res.status(500).json({ error: err.message });

            // Search in page content of all books
            mainDb.all('SELECT id, title, author, cover, db_filename FROM books', [], async (err2, allB) => {
                if (err2 || !allB) return res.json({ books: bookMatches || [], pages: [] });

                const pageResults = [];
                const MAX_RESULTS = 20;

                for (const book of allB) {
                    if (pageResults.length >= MAX_RESULTS) break;
                    if (!book.db_filename) continue;
                    const dbp = path.resolve(__dirname, 'books', path.basename(book.db_filename));
                    if (!fs.existsSync(dbp)) continue;

                    await new Promise(resolve => {
                        const bDb = new sqlite3.Database(dbp, sqlite3.OPEN_READONLY, async openErr => {
                            if (openErr) return resolve();
                            const tbl = await findBestTable(bDb);
                            if (!tbl) { bDb.close(); return resolve(); }
                            bDb.all(`PRAGMA table_info("${tbl}")`, [], (_, cols) => {
                                if (!cols) { bDb.close(); return resolve(); }
                                const cn = cols.map(c => c.name), cnl = cn.map(c => c.toLowerCase().trim());
                                const textCols = ['text', 'content', 'body', 'matn', 'description', 'html', 'متن'];
                                const nameCols = ['name', 'title', 'subject', 'topic', 'heading', 'عنوان'];
                                const pageCols = ['page', 'pagenumber', 'r'];
                                const idCols = ['id', '_id', 'bookid', 'rowid'];
                                const tcol = textCols.map(n => cnl.indexOf(n)).find(i => i !== -1);
                                const ncol = nameCols.map(n => cnl.indexOf(n)).find(i => i !== -1);
                                const pcol = pageCols.map(n => cnl.indexOf(n)).find(i => i !== -1);
                                const icol = idCols.map(n => cnl.indexOf(n)).find(i => i !== -1);
                                const searchCol = tcol !== undefined ? cn[tcol] : (ncol !== undefined ? cn[ncol] : null);
                                if (!searchCol) { bDb.close(); return resolve(); }
                                bDb.all(
                                    `SELECT * FROM "${tbl}" WHERE LOWER("${searchCol}") LIKE ? LIMIT 5`,
                                    [`%${q}%`],
                                    (qErr, rows) => {
                                        bDb.close();
                                        if (!qErr && rows) {
                                            rows.forEach((row, idx) => {
                                                const getV = (ns) => { for (const k of Object.keys(row)) { if (ns.includes(k.toLowerCase().trim())) { let v = row[k]; if (Buffer.isBuffer(v)) v = v.toString('utf8'); return v; } } return null; };
                                                const text = (getV(textCols) || '').toString();
                                                const name = (getV(nameCols) || '').toString();
                                                const pageNum = getV(pageCols) ?? idx;
                                                const rowId = getV(idCols) ?? idx;
                                                // Get snippet around match
                                                const ltext = text.toLowerCase();
                                                const pos = ltext.indexOf(q);
                                                const snippet = pos >= 0 ? text.substring(Math.max(0, pos - 60), pos + 120) : text.substring(0, 180);
                                                pageResults.push({ bookId: book.id, bookTitle: book.title, bookAuthor: book.author, bookCover: book.cover, pageId: rowId, pageName: name, pageNum, snippet });
                                            });
                                        }
                                        resolve();
                                    }
                                );
                            });
                        });
                    });
                }

                res.json({ books: bookMatches || [], pages: pageResults });
            });
        }
    );
});

// === API SETTINGS (PUBLIC) ===
app.get('/api/settings',(req,res)=>{
    mainDb.all('SELECT key,value FROM settings',[],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        const s={};rows.forEach(r=>s[r.key]=r.value);res.json(s);
    });
});

// === PROXY برای مرورگر داخلی (حذف X-Frame-Options + redirect + gzip) ===
const zlib = require('zlib');
const dns = require('dns');
const net = require('net');
// بررسی private/reserved IP برای جلوگیری از SSRF
function _isPrivateIp(ip) {
    if (!ip) return true;
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(n => parseInt(n, 10));
        if (parts[0] === 10) return true;
        if (parts[0] === 127) return true;
        if (parts[0] === 0) return true;
        if (parts[0] === 169 && parts[1] === 254) return true; // link-local / cloud metadata
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT
        if (parts[0] >= 224) return true; // multicast + reserved
        return false;
    }
    if (net.isIPv6(ip)) {
        const l = ip.toLowerCase();
        if (l === '::1' || l === '::') return true;
        if (l.startsWith('fc') || l.startsWith('fd')) return true; // ULA
        if (l.startsWith('fe80')) return true; // link-local
        if (l.startsWith('ff')) return true; // multicast
        if (l.startsWith('::ffff:')) return _isPrivateIp(l.slice(7));
        return false;
    }
    return true;
}
function _validateProxyHost(hostname) {
    return new Promise((resolve) => {
        if (!hostname) return resolve(false);
        // بلاک hostname هایی که مستقیم به IP اشاره می‌کنند در محدوده private
        if (net.isIP(hostname)) return resolve(!_isPrivateIp(hostname));
        dns.lookup(hostname, { all: true }, (err, addrs) => {
            if (err || !addrs || !addrs.length) return resolve(false);
            for (const a of addrs) if (_isPrivateIp(a.address)) return resolve(false);
            resolve(true);
        });
    });
}
async function _proxyFetch(url, res, redirectCount) {
    if (redirectCount > 5) return res.status(502).send('Too many redirects');
    if (!/^https?:\/\/.+/.test(url)) return res.status(400).send('Invalid URL');
    let parsed;
    try { parsed = new URL(url); } catch(e) { return res.status(400).send('Invalid URL'); }
    if (!['http:','https:'].includes(parsed.protocol)) return res.status(400).send('Invalid protocol');
    const okHost = await _validateProxyHost(parsed.hostname);
    if (!okHost) return res.status(403).send('Host not allowed');
    const { request: httpReq } = url.startsWith('https') ? require('https') : require('http');
    const proxyReq = httpReq(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/108.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fa,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 15000
    }, (proxyRes) => {
        const status = proxyRes.statusCode;
        // دنبال کردن redirect — هر redirect مجدداً validate می‌شود (SSRF guard)
        if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308) && proxyRes.headers.location) {
            proxyReq.destroy();
            let loc = proxyRes.headers.location;
            if (!/^https?:\/\//.test(loc)) {
                const base = new URL(url);
                loc = new URL(loc, base).href;
            }
            // _proxyFetch خودش hostname مقصد جدید را اعتبارسنجی می‌کند
            return _proxyFetch(loc, res, redirectCount + 1);
        }
        const headers = {...proxyRes.headers};
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        delete headers['x-content-type-options'];
        delete headers['content-encoding']; // ما decode می‌کنیم
        const ct = headers['content-type'] || '';
        const enc = proxyRes.headers['content-encoding'] || '';
        if (ct.includes('text/html')) {
            let chunks = [];
            proxyRes.on('data', c => chunks.push(c));
            proxyRes.on('end', () => {
                const buf = Buffer.concat(chunks);
                const decode = (raw) => {
                    let body = raw.toString('utf8');
                    const base = `<base href="${url}">`;
                    // اسکریپت رهگیری کلیک‌های لینک: هر کلیک را از طریق proxy هدایت می‌کند
                    const navScript = `<script>(function(){document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a)return;var h=a.href;if(!h||h.startsWith('javascript:')||h.startsWith('mailto:')||h.startsWith('tel:')||h.charAt(0)==='#'||h.includes('/api/proxy?url='))return;e.preventDefault();e.stopPropagation();try{window.parent.postMessage({type:'wv-nav',url:h},'*');}catch(x){}location.href='/api/proxy?url='+encodeURIComponent(h);},true);})()</script>`;
                    body = body.replace(/<head[^>]*>/i, m => m + base + navScript);
                    delete headers['content-length']; // اجازه می‌دهد Node خودش محاسبه کند
                    res.writeHead(status, headers);
                    res.end(body);
                };
                if (enc === 'gzip') zlib.gunzip(buf, (e, d) => decode(e ? buf : d));
                else if (enc === 'deflate') zlib.inflate(buf, (e, d) => decode(e ? buf : d));
                else if (enc === 'br') zlib.brotliDecompress(buf, (e, d) => decode(e ? buf : d));
                else decode(buf);
            });
        } else {
            res.writeHead(status, headers);
            const enc2 = proxyRes.headers['content-encoding'] || '';
            if (enc2 === 'gzip') proxyRes.pipe(zlib.createGunzip()).pipe(res);
            else if (enc2 === 'deflate') proxyRes.pipe(zlib.createInflate()).pipe(res);
            else if (enc2 === 'br') proxyRes.pipe(zlib.createBrotliDecompress()).pipe(res);
            else proxyRes.pipe(res);
        }
    });
    proxyReq.on('error', (e) => { if (!res.headersSent) res.status(502).send('Proxy error: ' + e.message); });
    proxyReq.on('timeout', () => { proxyReq.destroy(); if (!res.headersSent) res.status(504).send('Timeout'); });
    proxyReq.end();
}
app.get('/api/proxy', proxyLimiter, (req, res) => {
    const url = req.query.url;
    if (!url || typeof url !== 'string' || url.length > 2048) return res.status(400).send('Invalid URL');
    if (!/^https?:\/\/.+/i.test(url)) return res.status(400).send('Invalid URL');
    try { _proxyFetch(url, res, 0); } catch(e) { res.status(500).send('Server error'); }
});

// === پروکسی عمومی برای WordPress REST API ===
// مسیریابی درخواست‌های WP API از سرور (دور زدن CORS و مشکلات شبکه در سمت کلاینت)
const _wpCache = new Map();
const WP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقیقه
const WP_CACHE_MAX_ENTRIES = 200;
function _wpCacheGet(key) {
    const e = _wpCache.get(key);
    if (!e) return null;
    if (Date.now() - e.t > WP_CACHE_TTL_MS) { _wpCache.delete(key); return null; }
    return e.body;
}
function _wpCacheSet(key, body) {
    if (_wpCache.size >= WP_CACHE_MAX_ENTRIES) {
        const first = _wpCache.keys().next().value;
        if (first) _wpCache.delete(first);
    }
    _wpCache.set(key, { body, t: Date.now() });
}
app.get('/api/wp', (req, res) => {
    const wpPath = req.query.path;
    if (!wpPath || typeof wpPath !== 'string') return res.status(400).json({error:'path required'});
    // فقط مسیرهای ایمن مجاز هستند
    if (!/^[a-zA-Z0-9\/_\-?=&%+.,]+$/.test(wpPath)) return res.status(400).json({error:'invalid path'});
    const cached = _wpCacheGet(wpPath);
    if (cached) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.setHeader('X-WP-Cache', 'HIT');
        return res.end(cached);
    }
    const WP_BASE = 'https://dastgheibqoba.info/wp-json/wp/v2/';
    const fullUrl = WP_BASE + wpPath;
    const {request: httpsReq} = require('https');
    const pr = httpsReq(fullUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11)',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
        },
        timeout: 15000
    }, (wpRes) => {
        const enc = wpRes.headers['content-encoding'] || '';
        if (wpRes.statusCode !== 200) return res.status(wpRes.statusCode).json({error:'WP API error'});
        const chunks = [];
        const collect = (stream) => {
            stream.on('data', c => chunks.push(c));
            stream.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                _wpCacheSet(wpPath, body);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.setHeader('X-WP-Cache', 'MISS');
                res.end(body);
            });
        };
        if (enc === 'gzip') collect(wpRes.pipe(zlib.createGunzip()));
        else if (enc === 'deflate') collect(wpRes.pipe(zlib.createInflate()));
        else collect(wpRes);
    });
    pr.on('error', e => { if (!res.headersSent) res.status(502).json({error: e.message}); });
    pr.on('timeout', () => { pr.destroy(); if (!res.headersSent) res.status(504).json({error:'timeout'}); });
    pr.end();
});

// === API BANNERS (PUBLIC) ===
app.get('/api/banners',(req,res)=>{
    res.set('Cache-Control','public, max-age=300');
    const page = (req.query.page || 'home').replace(/[^a-z]/g, '').substring(0, 20);
    mainDb.all("SELECT * FROM banners WHERE ','||COALESCE(pages,'home')||',' LIKE ? ORDER BY position ASC",
        ['%,' + page + ',%'], (err,rows)=>res.json(rows||[]));
});

// === API SLIDERS (PUBLIC) ===
app.get('/api/sliders',(req,res)=>{
    res.set('Cache-Control','public, max-age=300');
    const page = (req.query.page || 'home').replace(/[^a-z]/g, '').substring(0, 20);
    mainDb.all("SELECT * FROM sliders WHERE active=1 AND ','||COALESCE(pages,'home')||',' LIKE ? ORDER BY sort_order ASC",
        ['%,' + page + ',%'], (err,rows)=>res.json(rows||[]));
});

// === API PAGE CONTENTS (PUBLIC) ===
app.get('/api/page-content/:id',(req,res)=>{
    res.set('Cache-Control','public, max-age=300');
    const id = req.params.id.replace(/[^a-z_]/g,'');
    mainDb.get('SELECT * FROM page_contents WHERE id=?',[id],(err,row)=>{
        if(err||!row) return res.json({id,title:'',content:''});
        res.json(row);
    });
});

// === API NEWS SLIDERS (PUBLIC) ===
app.get('/api/news-sliders',(req,res)=>{
    res.set('Cache-Control','public, max-age=300');
    mainDb.all('SELECT * FROM news_sliders WHERE active=1 ORDER BY sort_order ASC',[],(err,rows)=>res.json(rows||[]));
});

// === API AUTH ===
app.post('/api/auth/register',(req,res)=>{
    const u=san(req.body.username),p=req.body.password;
    if(!u||!p) return res.status(400).json({error:'نام کاربری و رمز عبور الزامی است'});
    if(u.length<3) return res.status(400).json({error:'نام کاربری حداقل ۳ کاراکتر باشد'});
    if(p.length<6) return res.status(400).json({error:'رمز عبور حداقل ۶ کاراکتر باشد'});
    const hash = bcrypt.hashSync(p, 12);
    mainDb.run('INSERT INTO users (username,password) VALUES (?,?)',[u,hash],function(err){
        if(err){if(err.message.includes('UNIQUE')) return res.status(400).json({error:'این نام کاربری قبلاً ثبت شده'});return res.status(500).json({error:err.message});}
        // Auto-assign existing broadcast notifications to new user
        mainDb.all('SELECT id FROM notifications WHERE type="broadcast"',[],(err2,notifs)=>{
            if(notifs&&notifs.length){
                const uid=this.lastID;
                notifs.forEach(n=>mainDb.run('INSERT OR IGNORE INTO user_notifications (user_id,notification_id) VALUES (?,?)',[uid,n.id]));
            }
        });
        res.json({success:true,id:this.lastID,username:u});
    });
});
app.post('/api/auth/login',(req,res)=>{
    const u=san(req.body.username),p=req.body.password;
    if(!u||!p) return res.status(400).json({error:'نام کاربری و رمز عبور را وارد کنید'});
    mainDb.get('SELECT id,username,password FROM users WHERE username=?',[u],(err,row)=>{
        if(err) return res.status(500).json({error:err.message});
        if(!row) return res.status(401).json({error:'نام کاربری یا رمز عبور اشتباه است'});
        // Support both hashed and plaintext (migration)
        let valid = false;
        if(row.password.startsWith('$2')) { valid = bcrypt.compareSync(p, row.password); }
        else { valid = (p === row.password); if(valid){ const h=bcrypt.hashSync(p,10); mainDb.run('UPDATE users SET password=? WHERE id=?',[h,row.id]); } }
        if(!valid) return res.status(401).json({error:'نام کاربری یا رمز عبور اشتباه است'});
        res.json({success:true,id:row.id,username:row.username});
    });
});

// === QA MESSAGES (legacy - keep for backward compat) ===
app.get('/api/qa/messages',userAuth,(req,res)=>{
    mainDb.all('SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC',[req.userId],(err,rows)=>res.json(rows||[]));
});
app.post('/api/qa/messages',userAuth,(req,res)=>{
    const t=san(req.body.text);
    if(!t||!t.trim()) return res.status(400).json({error:'متن پیام خالی است'});
    mainDb.run('INSERT INTO messages (user_id,text,sender_type) VALUES (?,?,"user")',[req.userId,t.trim()],function(err){
        if(err) return res.status(500).json({error:err.message});
        res.json({success:true,id:this.lastID});
    });
});

// === API TICKETS ===
app.get('/api/tickets',userAuth,(req,res)=>{
    mainDb.all(
        `SELECT id,subject,status,updated_at,(SELECT text FROM ticket_messages WHERE ticket_id=tickets.id ORDER BY created_at ASC LIMIT 1) as first_message FROM tickets WHERE user_id=? ORDER BY updated_at DESC`,
        [req.userId],(err,rows)=>{
            if(err) return res.status(500).json({error:err.message});
            res.json(rows||[]);
        }
    );
});
app.post('/api/tickets',userAuth,(req,res)=>{
    const s=san(req.body.subject),m=san(req.body.message);
    if(!s||!m) return res.status(400).json({error:'موضوع و پیام الزامی است'});
    mainDb.get('SELECT username FROM users WHERE id=?',[req.userId],(err,user)=>{
        const uname=user?user.username:'کاربر';
        mainDb.run('INSERT INTO tickets (username,subject,user_id) VALUES (?,?,?)',[uname,s,req.userId],function(err){
            if(err) return res.status(500).json({error:err.message});
            const tid=this.lastID;
            mainDb.run('INSERT INTO ticket_messages (ticket_id,text,sender_type) VALUES (?,?,"user")',[tid,m],()=>res.json({success:true,ticket_id:tid}));
        });
    });
});

// ارسال پیام اضافه در تیکت توسط کاربر (حداکثر 2 پیام متوالی تا ادمین جواب بده)
app.post('/api/tickets/:id/messages',userAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const t=san(req.body.text);if(!t||!t.trim()) return res.status(400).json({error:'متن پیام خالی است'});
    // Check ticket belongs to user
    mainDb.get('SELECT id,status FROM tickets WHERE id=? AND user_id=?',[id,req.userId],(err,ticket)=>{
        if(err||!ticket) return res.status(404).json({error:'تیکت یافت نشد'});
        if(ticket.status==='closed') return res.status(400).json({error:'این تیکت بسته شده است'});
        // Count consecutive user messages at end
        mainDb.all('SELECT sender_type FROM ticket_messages WHERE ticket_id=? ORDER BY created_at DESC LIMIT 5',[id],(err2,msgs)=>{
            let consecutiveUser=0;
            for(const m of (msgs||[])){
                if(m.sender_type==='user') consecutiveUser++;
                else break;
            }
            if(consecutiveUser>=2) return res.status(400).json({error:'لطفاً صبر کنید تا ادمین جواب دهد. حداکثر ۲ پیام متوالی مجاز است.'});
            mainDb.run('INSERT INTO ticket_messages (ticket_id,text,sender_type) VALUES (?,?,"user")',[id,t.trim()],function(err3){
                if(err3) return res.status(500).json({error:err3.message});
                mainDb.run('UPDATE tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=?',[id]);
                res.json({success:true,id:this.lastID});
            });
        });
    });
});

// دریافت پیام‌های یک تیکت (عمومی - برای کاربر)
app.get('/api/tickets/:id/messages',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.all('SELECT text,sender_type,created_at FROM ticket_messages WHERE ticket_id=? ORDER BY created_at ASC',[id],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});
app.get('/api/tickets/:id',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT id,subject,status,updated_at FROM tickets WHERE id=?',[id],(err,row)=>{
        if(err||!row) return res.status(404).json({error:'یافت نشد'});
        res.json(row);
    });
});

// === NOTIFICATIONS PUBLIC (broadcast - no login needed) ===
app.get('/api/notifications/public',(req,res)=>{
    mainDb.all(`SELECT id, title, message, type, created_at FROM notifications WHERE type='broadcast' ORDER BY created_at DESC LIMIT 20`,[],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});

// === NOTIFICATIONS (for logged in users) ===
app.get('/api/notifications',userAuth,(req,res)=>{
    // Get broadcast notifications + ticket reply notifications for this user
    mainDb.all(`
        SELECT n.id, n.title, n.message, n.type, n.created_at,
               COALESCE(un.is_read,0) as is_read
        FROM notifications n
        INNER JOIN user_notifications un ON un.notification_id=n.id AND un.user_id=?
        ORDER BY n.created_at DESC LIMIT 50
    `,[req.userId],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});
app.post('/api/notifications/read',userAuth,(req,res)=>{
    const notifId=+req.body.notification_id;
    if(isNaN(notifId)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.run('INSERT OR REPLACE INTO user_notifications (user_id,notification_id,is_read) VALUES (?,?,1)',[req.userId,notifId],()=>res.json({success:true}));
});
app.post('/api/notifications/read-all',userAuth,(req,res)=>{
    mainDb.run('UPDATE user_notifications SET is_read=1 WHERE user_id=?',[req.userId],()=>res.json({success:true}));
});

// === ADMIN APIS ===
app.post('/api/admin/login', adminLoginLimiter, (req,res)=>{
    const pw = (req.body && typeof req.body.password === 'string') ? req.body.password : '';
    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(pw.padEnd(64, '\0').slice(0, 64), 'utf8');
    const b = Buffer.from(ADMIN_PASSWORD.padEnd(64, '\0').slice(0, 64), 'utf8');
    const ok = pw.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(a, b);
    if (ok) res.json({success:true,token:ADMIN_PASSWORD});
    else {
        // تاخیر رندوم برای جلوگیری از timing oracle
        setTimeout(()=>res.status(401).json({error:'رمز عبور اشتباه است'}), 300 + Math.floor(Math.random()*300));
    }
});

app.post('/api/admin/books',adminAuth,upload.fields([{name:'database',maxCount:1},{name:'pdf_file',maxCount:1},{name:'cover',maxCount:1}]),async(req,res)=>{
    try{
        const t=san(req.body.title),a=san(req.body.author),d=san(req.body.description);
        const bookType=req.body.book_type==='pdf'?'pdf':'db';
        console.log('[books] upload start - type:',bookType,'files:',Object.keys(req.files||{}));
        if(!t) return res.status(400).json({error:'عنوان الزامی است'});
        const cf=req.files&&req.files['cover']?req.files['cover'][0]:null;
        const cp=cf?`/covers/${cf.filename}`:'';
        // sort_order جدید = حداکثر موجود + ۱ (تا ترتیب دستی خراب نشود)
        mainDb.get('SELECT COALESCE(MAX(sort_order),0)+1 AS next_order FROM books',[],async(err2,row)=>{
            const nextOrder=(row&&!err2)?row.next_order:9999;
            if(bookType==='pdf'){
                const pf=req.files&&req.files['pdf_file']?req.files['pdf_file'][0]:null;
                if(!pf) return res.status(400).json({error:'فایل PDF الزامی است'});
                console.log('[books] pdf file saved:',pf.filename,'size:',pf.size);
                mainDb.run('INSERT INTO books (title,author,description,cover,db_filename,page_count,book_type,pdf_filename,sort_order) VALUES (?,?,?,?,?,?,?,?,?)',[t,a||'',d||'',cp,'',0,'pdf',pf.filename,nextOrder],function(err){
                    if(err){console.error('[books] db insert error:',err.message);return res.status(500).json({error:err.message});}
                    res.json({success:true,id:this.lastID,page_count:0});
                });
            } else {
                const dbf=req.files&&req.files['database']?req.files['database'][0]:null;
                if(!dbf) return res.status(400).json({error:'فایل دیتابیس الزامی است'});
                const pc=await countPages(path.resolve(__dirname,'books',dbf.filename));
                mainDb.run('INSERT INTO books (title,author,description,cover,db_filename,page_count,book_type,pdf_filename,sort_order) VALUES (?,?,?,?,?,?,?,?,?)',[t,a||'',d||'',cp,dbf.filename,pc,'db','',nextOrder],function(err){
                    if(err){console.error('[books] db insert error:',err.message);return res.status(500).json({error:err.message});}
                    res.json({success:true,id:this.lastID,page_count:pc});
                });
            }
        });
    }catch(e){console.error('[books] caught error:',e.message);res.status(500).json({error:e.message});}
});
app.delete('/api/admin/books/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT db_filename,pdf_filename,cover,book_type FROM books WHERE id=?',[id],(err,b)=>{
        if(err||!b) return res.status(404).json({error:'کتاب یافت نشد'});
        if(b.book_type==='pdf'&&b.pdf_filename){const pp=path.resolve(__dirname,'books',path.basename(b.pdf_filename));if(fs.existsSync(pp)) fs.unlinkSync(pp);}
        else if(b.db_filename){const dp=path.resolve(__dirname,'books',path.basename(b.db_filename));if(fs.existsSync(dp)) fs.unlinkSync(dp);}
        unlinkPublicFile(b.cover);
        mainDb.run('DELETE FROM books WHERE id=?',[id],()=>res.json({success:true}));
    });
});
app.put('/api/admin/books/sort',adminAuth,(req,res)=>{
    const ids=req.body&&req.body.ids;if(!Array.isArray(ids)) return res.status(400).json({error:'ids required'});
    const stmt=mainDb.prepare('UPDATE books SET sort_order=? WHERE id=?');
    ids.forEach((id,i)=>stmt.run([i,id]));
    stmt.finalize(()=>res.json({success:true}));
});
app.put('/api/admin/books/:id',adminAuth,upload.fields([{name:'cover',maxCount:1},{name:'pdf_file',maxCount:1}]),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT * FROM books WHERE id=?',[id],(err,b)=>{
        if(err||!b) return res.status(404).json({error:'کتاب یافت نشد'});
        const cf=req.files&&req.files['cover']?req.files['cover'][0]:null;
        const pf=req.files&&req.files['pdf_file']?req.files['pdf_file'][0]:null;
        let cp=b.cover;
        if(cf){unlinkPublicFile(b.cover);cp=`/covers/${cf.filename}`;}
        let pdfFn=b.pdf_filename||'';
        if(pf){if(b.pdf_filename){const op=path.resolve(__dirname,'books',path.basename(b.pdf_filename));if(fs.existsSync(op)) fs.unlinkSync(op);}pdfFn=pf.filename;}
        mainDb.run('UPDATE books SET title=?,author=?,description=?,cover=?,pdf_filename=? WHERE id=?',[san(req.body.title)||b.title,san(req.body.author)||b.author,san(req.body.description)||b.description,cp,pdfFn,id],()=>res.json({success:true}));
    });
});
// سرویس‌دهی فایل‌های PDF کتاب‌ها
app.get('/api/books/:id/pdf',(req,res)=>{
    const id=parseInt(req.params.id,10);
    if(isNaN(id)||id<1||id>2147483647) return res.status(400).end();
    mainDb.get('SELECT book_type,pdf_filename,title FROM books WHERE id=?',[id],(err,b)=>{
        if(err||!b||b.book_type!=='pdf'||!b.pdf_filename) return res.status(404).end();
        const fp=safePath(path.join(__dirname,'books'), b.pdf_filename);
        if(!fp||!fs.existsSync(fp)) return res.status(404).end();
        res.setHeader('Content-Type','application/pdf');
        res.setHeader('Content-Disposition',`inline; filename="${id}.pdf"`);
        fs.createReadStream(fp).pipe(res);
    });
});

// تعداد صفحات PDF
app.get('/api/books/:id/pdf-info',(req,res)=>{
    const id=parseInt(req.params.id,10);
    if(isNaN(id)||id<1||id>2147483647) return res.status(400).end();
    mainDb.get('SELECT pdf_filename FROM books WHERE id=? AND book_type="pdf"',[id],(err,b)=>{
        if(err||!b||!b.pdf_filename) return res.status(404).json({error:'not found'});
        const fp=safePath(path.join(__dirname,'books'), b.pdf_filename);
        if(!fp||!fs.existsSync(fp)) return res.status(404).json({error:'file missing'});
        const {execFile}=require('child_process');
        execFile('pdfinfo',[fp],{timeout:10000},(e,stdout)=>{
            if(e) return res.json({pages:0});
            const m=String(stdout||'').match(/Pages:\s*(\d+)/);
            res.json({pages:m?parseInt(m[1],10):0});
        });
    });
});

// رندر صفحه PDF به تصویر PNG
app.get('/api/books/:id/pdf-page/:page',(req,res)=>{
    const id=parseInt(req.params.id,10), page=parseInt(req.params.page,10);
    if(isNaN(id)||isNaN(page)||page<1||page>99999||id<1||id>2147483647) return res.status(400).end();
    mainDb.get('SELECT pdf_filename FROM books WHERE id=? AND book_type="pdf"',[id],(err,b)=>{
        if(err||!b||!b.pdf_filename) return res.status(404).end();
        const fp=safePath(path.join(__dirname,'books'), b.pdf_filename);
        if(!fp||!fs.existsSync(fp)) return res.status(404).end();
        const cacheDir=path.join(__dirname,'tmp','pdf-pages');
        if(!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir,{recursive:true});
        const cacheFile=path.join(cacheDir,`b${id}_p${page}.png`);
        const sendImage=()=>{
            res.setHeader('Content-Type','image/png');
            res.setHeader('Cache-Control','public, max-age=86400');
            fs.createReadStream(cacheFile).pipe(res);
        };
        if(fs.existsSync(cacheFile)) return sendImage();
        const {execFile}=require('child_process');
        // ابتدا pdftoppm (سریع‌تر) — اگر نبود ghostscript
        const tmpDir=path.join(cacheDir,`tmp_${id}_${page}_${Date.now()}`);
        fs.mkdirSync(tmpDir,{recursive:true});
        execFile('pdftoppm',['-r','200','-png','-f',String(page),'-l',String(page),fp,path.join(tmpDir,'p')],{timeout:30000},(e)=>{
            const files=fs.readdirSync(tmpDir).filter(f=>f.endsWith('.png'));
            if(!e&&files.length){
                fs.renameSync(path.join(tmpDir,files[0]),cacheFile);
                fs.rmSync(tmpDir,{recursive:true,force:true});
                return sendImage();
            }
            fs.rmSync(tmpDir,{recursive:true,force:true});
            console.error('[pdf-page] pdftoppm failed:',e&&e.message,', trying gs');
            // fallback: ghostscript
            const gsArgs=['-dNOPAUSE','-dBATCH','-dSAFER','-sDEVICE=png16m','-r200',
                `-dFirstPage=${page}`,`-dLastPage=${page}`,
                '-dTextAlphaBits=4','-dGraphicsAlphaBits=4',
                `-sOutputFile=${cacheFile}`,fp];
            execFile('gs',gsArgs,{timeout:30000},(e2)=>{
                if(e2||!fs.existsSync(cacheFile)){
                    console.error('[pdf-page] gs also failed:',e2&&e2.message);
                    return res.status(500).end();
                }
                sendImage();
            });
        });
    });
});

// Admin Settings
app.get('/api/admin/settings',adminAuth,(req,res)=>{
    mainDb.all('SELECT key,value FROM settings',[],(err,rows)=>{
        const s={};rows.forEach(r=>s[r.key]=r.value);res.json(s);
    });
});
app.post('/api/admin/settings',adminAuth,(req,res)=>{
    const u=req.body;if(!u||typeof u!=='object') return res.status(400).json({error:'داده نامعتبر'});
    const stmt=mainDb.prepare('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)');
    Object.entries(u).forEach(([k,v])=>stmt.run(san(k.toString()),san(v.toString())));
    stmt.finalize(err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
});
// ذخیره assetlinks.json برای TWA Android
app.post('/api/admin/assetlinks', adminAuth, (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'محتوا الزامی است' });
    try { JSON.parse(content); } catch(e) { return res.status(400).json({ error: 'JSON نامعتبر است' }); }
    mainDb.run(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ('assetlinks',?,CURRENT_TIMESTAMP)`, [content], err =>
        err ? res.status(500).json({ error: err.message }) : res.json({ success: true })
    );
});

app.post('/api/admin/logo',adminAuth,uploadImage.single('logo'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل لوگو ارائه نشده'});
    const lu=`/logos/${req.file.filename}`;
    mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("logo_url",?,CURRENT_TIMESTAMP)',[lu],()=>res.json({success:true,logo_url:lu}));
});
app.post('/api/admin/header-logo',adminAuth,uploadImage.single('header_logo'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل لوگو هدر ارائه نشده'});
    const lu=`/logos/${req.file.filename}`;
    mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("header_logo_url",?,CURRENT_TIMESTAMP)',[lu],()=>res.json({success:true,header_logo_url:lu}));
});
// آپلود فایل (بدون ذخیره در تنظیمات - فقط آپلود و برگشت URL)
app.post('/api/admin/upload-logo',adminAuth,uploadImage.single('logo'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل ارائه نشده'});
    res.json({success:true,logo_url:`/logos/${req.file.filename}`});
});
app.post('/api/admin/favicon',adminAuth,uploadImage.single('favicon'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل فاوآیکون ارائه نشده'});
    const fu=`/icons/${req.file.filename}`;
    const srcPath = req.file.path;
    const iconsDir = path.join(__dirname,'public','icons');
    const anySizes=[72,96,128,144,152,192,384,512];
    const maskableSizes=[192,512];
    const newVersion = Date.now().toString();

    if (sharp) {
        // تبدیل به PNG و resize صحیح برای هر سایز
        const tasks = [
            ...anySizes.map(s => sharp(srcPath).resize(s,s,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toFile(path.join(iconsDir,`icon-${s}.png`))),
            // آیکون maskable: آیکون اصلی با پس‌زمینه سفید و padding 10%
            ...maskableSizes.map(s => sharp(srcPath).resize(Math.round(s*0.8),Math.round(s*0.8),{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).extend({top:Math.round(s*0.1),bottom:Math.round(s*0.1),left:Math.round(s*0.1),right:Math.round(s*0.1),background:{r:255,g:255,b:255,alpha:0}}).png().toFile(path.join(iconsDir,`icon-${s}-maskable.png`)))
        ];
        Promise.all(tasks).then(()=>{
            const newVersion2 = Date.now().toString();
            mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("favicon_url",?,CURRENT_TIMESTAMP)',[fu],()=>{
                mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("icon_version",?,CURRENT_TIMESTAMP)',[newVersion2],()=>{
                    res.json({success:true,favicon_url:fu});
                });
            });
        }).catch(e=>{ console.error('icon resize error:',e); res.status(500).json({error:'خطا در پردازش آیکون: '+e.message}); });
    } else {
        // اگر کلاینت از canvas resize استفاده کرده، icon‌ها را کپی نکن
        if (req.body.client_resized !== '1') {
            anySizes.forEach(s=>{ try{ fs.copyFileSync(srcPath, path.join(iconsDir,`icon-${s}.png`)); }catch(e){} });
            maskableSizes.forEach(s=>{ try{ fs.copyFileSync(srcPath, path.join(iconsDir,`icon-${s}-maskable.png`)); }catch(e){} });
        }
        mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("favicon_url",?,CURRENT_TIMESTAMP)',[fu],()=>{
            mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("icon_version",?,CURRENT_TIMESTAMP)',[newVersion],()=>{
                res.json({success:true,favicon_url:fu});
            });
        });
    }
});

// ذخیره آیکون از پیش resize‌شده توسط کلاینت
app.post('/api/admin/icon-save', adminAuth, uploadIconMemory.single('icon'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'فایل ارائه نشده'});
    const filename = (req.body.filename || '').replace(/[^a-z0-9\-\.]/gi, '');
    if (!filename.match(/^icon-\d+(-maskable)?\.png$/)) {
        return res.status(400).json({error: 'نام فایل نامعتبر'});
    }
    const dest = path.join(__dirname, 'public', 'icons', filename);
    try {
        fs.writeFileSync(dest, req.file.buffer);
        res.json({success: true});
    } catch(e) {
        res.status(500).json({error: 'خطا در ذخیره فایل'});
    }
});

// Admin Banners
app.get('/api/admin/banners',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM banners ORDER BY position ASC',[],(err,rows)=>res.json(rows||[]));
});
app.put('/api/admin/banners/:pos',adminAuth,uploadImage.single('banner_image'),(req,res)=>{
    const pos=+req.params.pos;if(isNaN(pos)||pos<1||pos>3) return res.status(400).json({error:'موقعیت نامعتبر'});
    mainDb.get('SELECT * FROM banners WHERE position=?',[pos],(err,bn)=>{
        let img=bn?bn.image:'';
        if(req.file){
            unlinkPublicFile(img);
            img=`/banners/${req.file.filename}`;
        } else if(req.body.image_url&&req.body.image_url.trim().length>5) {
            img=san(req.body.image_url.trim());
        }
        const act=req.body.active==='1'||req.body.active==='true'?1:0;
        const title=san(req.body.title||'');
        const link=san(req.body.link||'');
        const validSections=['after_slider','after_shortcuts','after_books','after_lectures','after_images','after_videos','after_audio'];
        const pageSec=validSections.includes(req.body.page_section)?req.body.page_section:(bn&&bn.page_section||'after_books');
        const validPages=['home','media_video','media_audio','media_photo','lectures','library'];
        const pages=(req.body.pages||'home').split(',').filter(p=>validPages.includes(p)).join(',') || 'home';
        mainDb.run(`INSERT OR REPLACE INTO banners (position,title,image,link,active,page_section,pages,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
            [pos,title,img,link,act,pageSec,pages],()=>res.json({success:true,image:img}));
    });
});

// Admin Sliders
app.get('/api/admin/sliders',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM sliders ORDER BY sort_order ASC',[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/sliders',adminAuth,uploadImage.single('slider_image'),(req,res)=>{
    const imageUrl = req.body.image_url && req.body.image_url.trim().length > 5 ? san(req.body.image_url.trim()) : null;
    if(!req.file && !imageUrl) return res.status(400).json({error:'تصویر یا لینک تصویر الزامی است'});
    mainDb.get('SELECT COUNT(*) as c FROM sliders',[],(err,r)=>{
        if(r&&r.c>=10) return res.status(400).json({error:'حداکثر ۱۰ اسلاید مجاز است'});
        const img = req.file ? `/sliders/${req.file.filename}` : imageUrl;
        const section = ['main','after_books','after_shortcuts','after_lectures','after_banners'].includes(req.body.display_section) ? req.body.display_section : 'main';
        const validSliderPages=['home','media_video','media_audio','media_photo','lectures','library'];
        const sliderPages=(req.body.pages||'home').split(',').filter(p=>validSliderPages.includes(p)).join(',') || 'home';
        mainDb.run('INSERT INTO sliders (title,image,link,sort_order,display_section,pages) VALUES (?,?,?,?,?,?)',[san(req.body.title||''),img,san(req.body.link||''),r?r.c:0,section,sliderPages],function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({success:true,id:this.lastID,image:img});
        });
    });
});
app.delete('/api/admin/sliders/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT image FROM sliders WHERE id=?',[id],(err,sl)=>{
        if(sl) unlinkPublicFile(sl.image);
        mainDb.run('DELETE FROM sliders WHERE id=?',[id],()=>res.json({success:true}));
    });
});

// Admin News Sliders
app.get('/api/admin/wp-posts-preview', adminAuth, (req, res) => {
    const https = require('https');
    const WP_API = 'https://dastgheibqoba.info/wp-json/wp/v2/posts?per_page=10&_embed=1&orderby=date&order=desc';
    https.get(WP_API, (wpRes) => {
        let data = '';
        wpRes.on('data', chunk => { data += chunk; });
        wpRes.on('end', () => {
            try {
                const posts = JSON.parse(data);
                const simplified = posts.map(p => ({
                    id: p.id,
                    title: p.title?.rendered || '',
                    url: p.link || '',
                    image: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
                           p._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url || ''
                }));
                res.json(simplified);
            } catch(e) { res.status(500).json({error:'خطا در پردازش پاسخ وردپرس'}); }
        });
    }).on('error', (e) => res.status(500).json({error: e.message}));
});

app.get('/api/admin/news-sliders', adminAuth, (req, res) => {
    mainDb.all('SELECT * FROM news_sliders ORDER BY sort_order ASC', [], (err, rows) => res.json(rows || []));
});

app.post('/api/admin/news-sliders', adminAuth, (req, res) => {
    const { post_id, post_title, post_url, post_image, show_title } = req.body;
    if (!post_id || !post_title || !post_url) return res.status(400).json({error: 'اطلاعات ناقص است'});
    mainDb.get('SELECT COUNT(*) as c FROM news_sliders', [], (err, r) => {
        const order = r ? r.c : 0;
        const showT = show_title === false || show_title === 0 || show_title === '0' ? 0 : 1;
        mainDb.run(
            'INSERT OR REPLACE INTO news_sliders (post_id, post_title, post_url, post_image, sort_order, show_title) VALUES (?,?,?,?,?,?)',
            [+post_id, san(post_title), san(post_url), san(post_image || ''), order, showT],
            function(err) {
                if (err) return res.status(500).json({error: err.message});
                res.json({success: true, id: this.lastID});
            }
        );
    });
});

app.put('/api/admin/news-sliders/:id', adminAuth, (req, res) => {
    const id = +req.params.id;
    if (isNaN(id)) return res.status(400).json({error: 'شناسه نامعتبر'});
    const showT = req.body.show_title === false || req.body.show_title === 0 || req.body.show_title === '0' ? 0 : 1;
    mainDb.run('UPDATE news_sliders SET show_title=? WHERE id=?', [showT, id], () => res.json({success: true}));
});

app.delete('/api/admin/news-sliders/:id', adminAuth, (req, res) => {
    const id = +req.params.id;
    if (isNaN(id)) return res.status(400).json({error: 'شناسه نامعتبر'});
    mainDb.run('DELETE FROM news_sliders WHERE id=?', [id], () => res.json({success: true}));
});

app.post('/api/admin/upload-content-image', adminAuth, uploadImage.single('content_image'), (req, res) => {
    if (!req.file) return res.status(400).json({error: 'فایلی آپلود نشد'});
    res.json({success: true, url: '/content/' + req.file.filename});
});

// Admin Page Contents
app.get('/api/admin/page-contents',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM page_contents ORDER BY id',[],( err,rows)=>res.json(rows||[]));
});
app.put('/api/admin/page-content/:id',adminAuth,(req,res)=>{
    const validIds=['social','biography','mosque','contact'];
    const id=req.params.id;
    if(!validIds.includes(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const content=san(req.body.content||'');
    const title=san(req.body.title||'');
    mainDb.run('INSERT OR REPLACE INTO page_contents (id,title,content,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)',
        [id,title,content],err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
});

// Admin Users
app.get('/api/admin/users',adminAuth,(req,res)=>{
    mainDb.all(`SELECT u.id,u.username,u.created_at,
        ((SELECT COUNT(*) FROM messages WHERE user_id=u.id)+(SELECT COUNT(*) FROM ticket_messages tm JOIN tickets t ON t.id=tm.ticket_id WHERE t.user_id=u.id)) as msg_count,
        (SELECT MAX(a) FROM (SELECT created_at as a FROM messages WHERE user_id=u.id UNION SELECT tm.created_at as a FROM ticket_messages tm JOIN tickets t ON t.id=tm.ticket_id WHERE t.user_id=u.id)) as last_active
        FROM users u ORDER BY u.created_at DESC`,[],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});
app.delete('/api/admin/users/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.run('DELETE FROM messages WHERE user_id=?',[id],()=>mainDb.run('DELETE FROM tickets WHERE user_id=?',[id],()=>mainDb.run('DELETE FROM users WHERE id=?',[id],()=>res.json({success:true}))));
});

// Admin QA (merged with tickets in the backend)
app.get('/api/admin/qa/users',adminAuth,(req,res)=>{
    mainDb.all(`SELECT users.id,users.username,(SELECT text FROM messages WHERE user_id=users.id ORDER BY created_at DESC LIMIT 1) as last_message,(SELECT created_at FROM messages WHERE user_id=users.id ORDER BY created_at DESC LIMIT 1) as last_date,(SELECT COUNT(*) FROM messages WHERE user_id=users.id AND sender_type='user' AND is_read=0) as unread FROM users WHERE EXISTS(SELECT 1 FROM messages WHERE user_id=users.id) ORDER BY last_date DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/admin/qa/messages/:uid',adminAuth,(req,res)=>{
    const uid=+req.params.uid;if(isNaN(uid)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.run('UPDATE messages SET is_read=1 WHERE user_id=? AND sender_type="user"',[uid]);
    mainDb.all('SELECT * FROM messages WHERE user_id=? ORDER BY created_at ASC',[uid],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/qa/messages/:uid',adminAuth,(req,res)=>{
    const uid=+req.params.uid;if(isNaN(uid)) return res.status(400).json({error:'شناسه نامعتبر'});
    const t=san(req.body.text);if(!t||!t.trim()) return res.status(400).json({error:'متن خالی است'});
    mainDb.run('INSERT INTO messages (user_id,text,sender_type) VALUES (?,?,"admin")',[uid,t],function(err){
        if(err) return res.status(500).json({error:err.message});
        res.json({success:true});
    });
});

// Admin Tickets
app.get('/api/admin/tickets',adminAuth,(req,res)=>{
    mainDb.all(`SELECT t.*,(SELECT COUNT(*) FROM ticket_messages WHERE ticket_id=t.id) as msg_count,(SELECT text FROM ticket_messages WHERE ticket_id=t.id ORDER BY created_at DESC LIMIT 1) as last_msg FROM tickets t ORDER BY t.updated_at DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/admin/tickets/:id/messages',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.all('SELECT * FROM ticket_messages WHERE ticket_id=? ORDER BY created_at ASC',[id],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/tickets/:id/reply',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const t=san(req.body.text);if(!t||!t.trim()) return res.status(400).json({error:'متن خالی است'});
    mainDb.run('INSERT INTO ticket_messages (ticket_id,text,sender_type) VALUES (?,?,"admin")',[id,t],function(err){
        if(err) return res.status(500).json({error:err.message});
        mainDb.run('UPDATE tickets SET status="answered",updated_at=CURRENT_TIMESTAMP WHERE id=?',[id]);
        // Create notification for the ticket owner
        mainDb.get('SELECT user_id,subject FROM tickets WHERE id=?',[id],(err2,ticket)=>{
            if(ticket&&ticket.user_id){
                const replyTitle='پاسخ به تیکت';
                const replyMsg=`تیکت شما با موضوع "${ticket.subject}" پاسخ داده شد.`;
                mainDb.run('INSERT INTO notifications (title,message,type) VALUES (?,?,"ticket_reply")',
                    [replyTitle,replyMsg],function(err3){
                        if(this.lastID) mainDb.run('INSERT INTO user_notifications (user_id,notification_id) VALUES (?,?)',[ticket.user_id,this.lastID]);
                    });
                // Push notification to ticket owner
                sendPushToUser(ticket.user_id,{title:replyTitle,body:replyMsg,icon:'/icons/icon-192.png',badge:'/icons/icon-72.png',tag:'ticket-'+id,data:{url:'/'}});
            }
        });
        res.json({success:true});
    });
});
app.put('/api/admin/tickets/:id/status',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const s=['open','answered','closed'].includes(req.body.status)?req.body.status:'open';
    mainDb.run('UPDATE tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[s,id],()=>res.json({success:true}));
});

// Admin Notifications (broadcast)
app.get('/api/admin/notifications',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50',[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/notifications',adminAuth,(req,res)=>{
    const title=san(req.body.title),msg=san(req.body.message);
    if(!title||!msg) return res.status(400).json({error:'عنوان و متن الزامی است'});
    mainDb.run('INSERT INTO notifications (title,message,type) VALUES (?,?,"broadcast")',[title,msg],function(err){
        if(err) return res.status(500).json({error:err.message});
        const notifId=this.lastID;
        // Single batched INSERT...SELECT to avoid N+1 inserts on broadcast
        mainDb.run(
            'INSERT OR IGNORE INTO user_notifications (user_id,notification_id) SELECT id, ? FROM users',
            [notifId],
            ()=>{
                sendPushToAll({title, body: msg, icon:'/icons/icon-192.png', badge:'/icons/icon-72.png', tag:'broadcast-'+notifId, data:{url:'/'}});
                res.json({success:true,id:notifId});
            }
        );
    });
});
app.delete('/api/admin/notifications/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.run('DELETE FROM user_notifications WHERE notification_id=?',[id],()=>mainDb.run('DELETE FROM notifications WHERE id=?',[id],()=>res.json({success:true})));
});

// === PUSH SUBSCRIPTIONS ===
app.get('/api/push/vapid-public-key',(req,res)=>{
    res.json({publicKey: VAPID_PUBLIC_KEY});
});
app.post('/api/push/subscribe',userAuth,(req,res)=>{
    if(!webpush) return res.status(503).json({error:'سرویس پوش پشتیبانی نمی‌شود'});
    const sub=req.body.subscription;
    if(!sub||!sub.endpoint) return res.status(400).json({error:'اشتراک نامعتبر'});
    mainDb.run('INSERT OR REPLACE INTO push_subscriptions (user_id,subscription) VALUES (?,?)',[req.userId,JSON.stringify(sub)],function(err){
        if(err) return res.status(500).json({error:err.message});
        res.json({success:true});
    });
});
app.post('/api/push/unsubscribe',userAuth,(req,res)=>{
    mainDb.run('DELETE FROM push_subscriptions WHERE user_id=?',[req.userId],()=>res.json({success:true}));
});

function sendPushToUser(userId, payload) {
    if(!webpush) return;
    mainDb.get('SELECT subscription FROM push_subscriptions WHERE user_id=?',[userId],(err,row)=>{
        if(err||!row) return;
        try {
            const sub = JSON.parse(row.subscription);
            webpush.sendNotification(sub, JSON.stringify(payload)).catch(e=>{
                if(e.statusCode===410||e.statusCode===404) mainDb.run('DELETE FROM push_subscriptions WHERE user_id=?',[userId]);
            });
        } catch(e) {}
    });
}
function sendPushToAll(payload) {
    if(!webpush) return;
    mainDb.all('SELECT user_id,subscription FROM push_subscriptions',[],(err,rows)=>{
        if(err||!rows) return;
        rows.forEach(row=>{
            try {
                const sub = JSON.parse(row.subscription);
                webpush.sendNotification(sub, JSON.stringify(payload)).catch(e=>{
                    if(e.statusCode===410||e.statusCode===404) mainDb.run('DELETE FROM push_subscriptions WHERE user_id=?',[row.user_id]);
                });
            } catch(e) {}
        });
    });
}

// === PUBLIC GALLERY API ===
app.get('/api/gallery/categories',(req,res)=>{
    const hasParent = req.query.parent_id !== undefined && req.query.parent_id !== 'null' && req.query.parent_id !== '';
    const parentId = hasParent ? parseInt(req.query.parent_id, 10) : null;
    if (hasParent && (isNaN(parentId) || parentId < 0)) return res.status(400).json({error:'parent_id نامعتبر'});
    const sql = `SELECT gc.*, (SELECT COUNT(*) FROM gallery_photos WHERE category_id=gc.id) as photo_count, (SELECT COUNT(*) FROM gallery_categories WHERE parent_id=gc.id) as sub_count FROM gallery_categories gc WHERE ${hasParent?'gc.parent_id=?':'gc.parent_id IS NULL'} ORDER BY gc.sort_order ASC, gc.created_at DESC`;
    mainDb.all(sql, hasParent?[parentId]:[], (err,rows)=>{
        if(err) return res.status(500).json({error:'خطای داخلی'});
        res.json(rows||[]);
    });
});
app.get('/api/gallery/categories/:id/photos',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.all('SELECT * FROM gallery_photos WHERE category_id=? ORDER BY sort_order ASC, created_at ASC',[id],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});

// === ADMIN GALLERY API ===
app.get('/api/admin/gallery/categories',adminAuth,(req,res)=>{
    mainDb.all(`SELECT gc.*, (SELECT COUNT(*) FROM gallery_photos WHERE category_id=gc.id) as photo_count, (SELECT COUNT(*) FROM gallery_categories WHERE parent_id=gc.id) as sub_count FROM gallery_categories gc ORDER BY gc.sort_order ASC, gc.created_at DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/gallery/categories',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const name=san(req.body.name||'').trim();
    if(!name) return res.status(400).json({error:'نام دسته‌بندی الزامی است'});
    const imgUrl=req.body.image_url&&req.body.image_url.trim().length>5?san(req.body.image_url.trim()):null;
    const cover=req.file?`/gallery/${req.file.filename}`:(imgUrl||'');
    const desc=san(req.body.description||'');
    const parentId=req.body.parent_id&&+req.body.parent_id>0?+req.body.parent_id:null;
    mainDb.get('SELECT MAX(sort_order) as mx FROM gallery_categories',[],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO gallery_categories (name,description,cover,sort_order,parent_id) VALUES (?,?,?,?,?)',[name,desc,cover,so,parentId],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            res.json({success:true,id:this.lastID});
        });
    });
});
app.put('/api/admin/gallery/categories/:id',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT * FROM gallery_categories WHERE id=?',[id],(err,cat)=>{
        if(err||!cat) return res.status(404).json({error:'دسته‌بندی یافت نشد'});
        const name=san(req.body.name||cat.name).trim();
        const desc=san(req.body.description||cat.description);
        let cover=cat.cover;
        if(req.file){
            unlinkPublicFile(cover);
            cover=`/gallery/${req.file.filename}`;
        } else if(req.body.image_url&&req.body.image_url.trim().length>5){
            cover=san(req.body.image_url.trim());
        }
        mainDb.run('UPDATE gallery_categories SET name=?,description=?,cover=? WHERE id=?',[name,desc,cover,id],()=>res.json({success:true,cover}));
    });
});
app.delete('/api/admin/gallery/categories/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    // Delete subcategories recursively
    mainDb.all('SELECT id FROM gallery_categories WHERE parent_id=?',[id],(err,subs)=>{
        const subIds=(subs||[]).map(s=>s.id);
        const allIds=[id,...subIds];
        allIds.forEach(catId=>{
            mainDb.all('SELECT image FROM gallery_photos WHERE category_id=?',[catId],(e2,photos)=>{
                (photos||[]).forEach(p=>unlinkPublicFile(p&&p.image));
                mainDb.run('DELETE FROM gallery_photos WHERE category_id=?',[catId]);
            });
            mainDb.get('SELECT cover FROM gallery_categories WHERE id=?',[catId],(e3,cat)=>{
                if(cat) unlinkPublicFile(cat.cover);
            });
        });
        const placeholders=allIds.map(()=>'?').join(',');
        mainDb.run(`DELETE FROM gallery_categories WHERE id IN (${placeholders})`,allIds,()=>res.json({success:true}));
    });
});
app.post('/api/admin/gallery/photos',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const catId=+req.body.category_id;if(isNaN(catId)) return res.status(400).json({error:'دسته‌بندی الزامی است'});
    const imgUrl=req.body.image_url&&req.body.image_url.trim().length>5?san(req.body.image_url.trim()):null;
    if(!req.file&&!imgUrl) return res.status(400).json({error:'تصویر یا لینک تصویر الزامی است'});
    const img=req.file?`/gallery/${req.file.filename}`:imgUrl;
    const title=san(req.body.title||'');
    mainDb.get('SELECT MAX(sort_order) as mx FROM gallery_photos WHERE category_id=?',[catId],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO gallery_photos (category_id,title,image,sort_order) VALUES (?,?,?,?)',[catId,title,img,so],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            // Update category cover if empty
            mainDb.run('UPDATE gallery_categories SET cover=? WHERE id=? AND (cover IS NULL OR cover="")',[img,catId]);
            res.json({success:true,id:this.lastID,image:img});
        });
    });
});
app.put('/api/admin/gallery/photos/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const title=san(req.body.title||'');
    const catId=req.body.category_id?+req.body.category_id:null;
    if(catId){
        mainDb.run('UPDATE gallery_photos SET title=?,category_id=? WHERE id=?',[title,catId,id],function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({success:true});
        });
    } else {
        mainDb.run('UPDATE gallery_photos SET title=? WHERE id=?',[title,id],function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({success:true});
        });
    }
});
app.delete('/api/admin/gallery/photos/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT image FROM gallery_photos WHERE id=?',[id],(err,p)=>{
        if(p) unlinkPublicFile(p.image);
        mainDb.run('DELETE FROM gallery_photos WHERE id=?',[id],()=>res.json({success:true}));
    });
});

// === PUBLIC AUDIO API ===
app.get('/api/audio/categories',(req,res)=>{
    const hasParent = req.query.parent_id !== undefined && req.query.parent_id !== 'null' && req.query.parent_id !== '';
    const parentId = hasParent ? parseInt(req.query.parent_id, 10) : null;
    if (hasParent && (isNaN(parentId) || parentId < 0)) return res.status(400).json({error:'parent_id نامعتبر'});
    const sql = `SELECT ac.*, (SELECT COUNT(*) FROM audio_tracks WHERE category_id=ac.id) as track_count, (SELECT COUNT(*) FROM audio_categories WHERE parent_id=ac.id) as sub_count FROM audio_categories ac WHERE ${hasParent?'ac.parent_id=?':'ac.parent_id IS NULL'} ORDER BY ac.sort_order ASC, ac.created_at DESC`;
    mainDb.all(sql, hasParent?[parentId]:[], (err,rows)=>{
        if(err) return res.status(500).json({error:'خطای داخلی'});
        res.json(rows||[]);
    });
});
app.get('/api/audio/categories/:id/tracks',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const sortBy = req.query.sort === 'date' ? 'COALESCE(at.publish_date,at.created_at) DESC' : 'at.sort_order ASC, COALESCE(at.publish_date,at.created_at) ASC';
    mainDb.all(`SELECT at.*, COALESCE(NULLIF(at.cover,''), ac.cover, '') as _catCover FROM audio_tracks at LEFT JOIN audio_categories ac ON at.category_id=ac.id WHERE at.category_id=? ORDER BY ${sortBy}`,[id],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});

// === ADMIN AUDIO API ===
app.get('/api/admin/audio/categories',adminAuth,(req,res)=>{
    mainDb.all(`SELECT ac.*, (SELECT COUNT(*) FROM audio_tracks WHERE category_id=ac.id) as track_count, (SELECT COUNT(*) FROM audio_categories WHERE parent_id=ac.id) as sub_count FROM audio_categories ac ORDER BY ac.sort_order ASC, ac.created_at DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/admin/audio/all-tracks',adminAuth,(req,res)=>{
    mainDb.all(`SELECT at.id,at.title,ac.name as cat_name FROM audio_tracks at LEFT JOIN audio_categories ac ON at.category_id=ac.id ORDER BY ac.sort_order ASC,at.sort_order ASC,at.title ASC`,[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/audio/categories',adminAuth,uploadImage.single('audio_cover'),(req,res)=>{
    const name=san(req.body.name||'').trim();
    if(!name) return res.status(400).json({error:'نام دسته‌بندی الزامی است'});
    const coverUrl=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    const cover=req.file?`/gallery/${req.file.filename}`:(coverUrl||'');
    const desc=san(req.body.description||'');
    const parentId=req.body.parent_id&&+req.body.parent_id>0?+req.body.parent_id:null;
    mainDb.get('SELECT MAX(sort_order) as mx FROM audio_categories',[],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO audio_categories (name,description,cover,sort_order,parent_id) VALUES (?,?,?,?,?)',[name,desc,cover,so,parentId],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            res.json({success:true,id:this.lastID});
        });
    });
});
app.delete('/api/admin/audio/categories/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.all('SELECT audio_url FROM audio_tracks WHERE category_id=?',[id],(err,tracks)=>{
        (tracks||[]).forEach(t=>{ if(t&&t.audio_url&&t.audio_url.startsWith('/audio/')) unlinkPublicFile(t.audio_url); });
        mainDb.get('SELECT cover FROM audio_categories WHERE id=?',[id],(err2,cat)=>{
            if(cat&&cat.cover&&cat.cover.startsWith('/gallery/')) unlinkPublicFile(cat.cover);
            mainDb.run('DELETE FROM audio_tracks WHERE category_id=?',[id],()=>mainDb.run('DELETE FROM audio_categories WHERE id=?',[id],()=>res.json({success:true})));
        });
    });
});
app.post('/api/admin/audio/tracks',adminAuth,uploadAudio.fields([{name:'audio_file',maxCount:1},{name:'audio_cover',maxCount:1}]),async(req,res)=>{
    const catId=+req.body.category_id;if(isNaN(catId)) return res.status(400).json({error:'دسته‌بندی الزامی است'});
    const title=san(req.body.title||'').trim();if(!title) return res.status(400).json({error:'عنوان صوت الزامی است'});
    const audioUrlInput=req.body.audio_url&&req.body.audio_url.trim().length>5?san(req.body.audio_url.trim()):null;
    const audioFile=req.files&&req.files['audio_file']?req.files['audio_file'][0]:null;
    if(!audioFile&&!audioUrlInput) return res.status(400).json({error:'فایل صوتی یا لینک الزامی است'});
    const audioUrl=audioFile?`/audio/${audioFile.filename}`:audioUrlInput;
    const coverUrlInput=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    const coverFile=req.files&&req.files['audio_cover']?req.files['audio_cover'][0]:null;
    let cover=coverFile?`/gallery/${coverFile.filename}`:(coverUrlInput||'');
    // اگه کاور آپلود نشده، از تگ‌های ID3 فایل صوتی استخراج کن
    if(!cover&&audioFile&&mm){
        try{
            const fp=path.resolve(__dirname,'public','audio',audioFile.filename);
            const meta=await mm.parseFile(fp,{skipCovers:false});
            const pic=mm.selectCover?mm.selectCover(meta.common.picture):(meta.common.picture&&meta.common.picture[0]);
            if(pic&&pic.data){
                const ext=(pic.format||'image/jpeg').replace('image/','').replace('jpg','jpeg')||'jpeg';
                const coverName=audioFile.filename.replace(/\.[^.]+$/,'')+'-cover.'+ext;
                const coverPath=path.resolve(__dirname,'public','gallery',coverName);
                fs.writeFileSync(coverPath,Buffer.from(pic.data));
                cover='/gallery/'+coverName;
            }
        }catch(e){console.warn('ID3 cover extract:',e.message);}
    }
    const artist=san(req.body.artist||'');
    const publishDate=req.body.publish_date||null;
    mainDb.get('SELECT MAX(sort_order) as mx FROM audio_tracks WHERE category_id=?',[catId],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO audio_tracks (category_id,title,artist,audio_url,cover,sort_order,publish_date) VALUES (?,?,?,?,?,?,?)',[catId,title,artist,audioUrl,cover,so,publishDate],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            mainDb.run('UPDATE audio_categories SET cover=? WHERE id=? AND (cover IS NULL OR cover="")',[cover||audioUrl,catId]);
            res.json({success:true,id:this.lastID,audio_url:audioUrl,cover});
        });
    });
});
app.delete('/api/admin/audio/tracks/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT audio_url,cover FROM audio_tracks WHERE id=?',[id],(err,t)=>{
        if(t&&t.audio_url&&t.audio_url.startsWith('/audio/')) unlinkPublicFile(t.audio_url);
        if(t&&t.cover&&t.cover.startsWith('/gallery/')) unlinkPublicFile(t.cover);
        mainDb.run('DELETE FROM audio_tracks WHERE id=?',[id],()=>res.json({success:true}));
    });
});
app.put('/api/admin/audio/categories/:id',adminAuth,uploadImage.single('audio_cover'),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const name=san(req.body.name||'').trim();if(!name) return res.status(400).json({error:'نام الزامی است'});
    const desc=san(req.body.description||'');
    const parentId=req.body.parent_id&&+req.body.parent_id>0?+req.body.parent_id:null;
    const coverUrl=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    const newCover=req.file?`/gallery/${req.file.filename}`:coverUrl;
    if(newCover){
        mainDb.run('UPDATE audio_categories SET name=?,description=?,cover=?,parent_id=? WHERE id=?',[name,desc,newCover,parentId,id],err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
    } else {
        mainDb.run('UPDATE audio_categories SET name=?,description=?,parent_id=? WHERE id=?',[name,desc,parentId,id],err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
    }
});
// sort قبل از :id تا Express آن را با id='sort' مطابقت ندهد
app.put('/api/admin/audio/sort',adminAuth,express.json(),(req,res)=>{
    const ids=req.body.ids;if(!Array.isArray(ids)) return res.status(400).json({error:'ids required'});
    const stmt=mainDb.prepare('UPDATE audio_categories SET sort_order=? WHERE id=?');
    ids.forEach((id,i)=>stmt.run([i,id]));
    stmt.finalize(()=>res.json({success:true}));
});
app.put('/api/admin/audio/tracks/sort',adminAuth,express.json(),(req,res)=>{
    const ids=req.body.ids;if(!Array.isArray(ids)) return res.status(400).json({error:'ids required'});
    const stmt=mainDb.prepare('UPDATE audio_tracks SET sort_order=? WHERE id=?');
    ids.forEach((id,i)=>stmt.run([i,id]));
    stmt.finalize(()=>res.json({success:true}));
});
app.put('/api/admin/audio/tracks/:id',adminAuth,uploadAudio.fields([{name:'audio_file',maxCount:1},{name:'audio_cover',maxCount:1}]),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const title=san(req.body.title||'').trim();if(!title) return res.status(400).json({error:'عنوان الزامی است'});
    const artist=san(req.body.artist||'');
    const publishDate=req.body.publish_date||null;
    const sets=['title=?','artist=?','publish_date=?'];const vals=[title,artist,publishDate];
    const audioFile=req.files&&req.files['audio_file']?req.files['audio_file'][0]:null;
    const audioUrlInput=req.body.audio_url&&req.body.audio_url.trim().length>5?san(req.body.audio_url.trim()):null;
    if(audioFile){sets.push('audio_url=?');vals.push(`/audio/${audioFile.filename}`);}
    else if(audioUrlInput){sets.push('audio_url=?');vals.push(audioUrlInput);}
    const coverFile=req.files&&req.files['audio_cover']?req.files['audio_cover'][0]:null;
    const coverUrlInput=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    if(coverFile){sets.push('cover=?');vals.push(`/gallery/${coverFile.filename}`);}
    else if(coverUrlInput){sets.push('cover=?');vals.push(coverUrlInput);}
    vals.push(id);
    mainDb.run(`UPDATE audio_tracks SET ${sets.join(',')} WHERE id=?`,vals,err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
});

// === AUDIO DOWNLOAD (force download with proper headers) ===
app.get('/api/download/audio/:filename',(req,res)=>{
    const filename=path.basename(req.params.filename);
    const filePath=path.join(__dirname,'public','audio',filename);
    if(!fs.existsSync(filePath)) return res.status(404).send('فایل یافت نشد');
    res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type','audio/mpeg');
    res.sendFile(filePath);
});

// === APARAT URL PARSER ===
function parseAparatEmbed(raw) {
    if(!raw || !raw.trim()) return null;
    raw = raw.trim();
    // Extract src from iframe HTML
    if(raw.includes('<iframe')) {
        const m = raw.match(/src\s*=\s*["']([^"']+)["']/i);
        if(m && m[1]) raw = m[1];
        else return null;
    }
    // Already an embed/player URL → use as-is
    if(/aparat\.com\/(video\/video\/embed|vplayer\.php|embed)/.test(raw) || /player\.aparat\.com\/embed/.test(raw)) {
        return raw;
    }
    // Direct video page: https://www.aparat.com/v/HASH or https://aparat.com/v/HASH
    const directMatch = raw.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/i);
    if(directMatch) {
        return `https://www.aparat.com/video/video/embed/videohash/${directMatch[1]}/vt/frame`;
    }
    // videohash already in URL
    const hashMatch = raw.match(/videohash\/([a-zA-Z0-9]+)/i);
    if(hashMatch) return raw;
    // Fallback: if it's a valid URL, try using it directly
    if(/^https?:\/\//.test(raw)) return raw;
    return null;
}

function extractAparatThumb(embedUrl) {
    if(!embedUrl) return '';
    const m = embedUrl.match(/videohash\/([a-zA-Z0-9]+)/i) || embedUrl.match(/embed\/([a-zA-Z0-9]+)/i);
    if(m) return `https://static.cdn.asset.aparat.com/avt/${m[1]}_16.jpg`;
    return '';
}

// === PUBLIC VIDEO API ===
app.get('/api/videos/categories',(req,res)=>{
    const hasParent = req.query.parent_id !== undefined && req.query.parent_id !== 'null' && req.query.parent_id !== '';
    const parentId = hasParent ? parseInt(req.query.parent_id, 10) : null;
    if (hasParent && (isNaN(parentId) || parentId < 0)) return res.status(400).json({error:'parent_id نامعتبر'});
    const sql = `SELECT vc.*, (SELECT COUNT(*) FROM video_items WHERE category_id=vc.id) as video_count, (SELECT COUNT(*) FROM video_categories WHERE parent_id=vc.id) as sub_count FROM video_categories vc WHERE ${hasParent?'vc.parent_id=?':'vc.parent_id IS NULL'} ORDER BY vc.sort_order ASC, vc.created_at DESC`;
    mainDb.all(sql, hasParent?[parentId]:[], (err,rows)=>{
        if(err) return res.status(500).json({error:'خطای داخلی'});
        res.json(rows||[]);
    });
});
app.get('/api/videos/categories/:id/items',(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const sortBy = req.query.sort === 'date' ? 'COALESCE(vi.publish_date,vi.created_at) DESC' : 'vi.sort_order ASC, COALESCE(vi.publish_date,vi.created_at) ASC';
    // _catCover = فقط کاور دسته (جدا از thumbnail ویدیو)، برای fallback در کلاینت
    mainDb.all(`SELECT vi.*, COALESCE(vc.cover,'') as _catCover FROM video_items vi LEFT JOIN video_categories vc ON vi.category_id=vc.id WHERE vi.category_id=? ORDER BY ${sortBy}`,[id],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        res.json(rows||[]);
    });
});

// === ADMIN VIDEO API ===
app.get('/api/admin/video/categories',adminAuth,(req,res)=>{
    mainDb.all(`SELECT vc.*, (SELECT COUNT(*) FROM video_items WHERE category_id=vc.id) as video_count, (SELECT COUNT(*) FROM video_categories WHERE parent_id=vc.id) as sub_count FROM video_categories vc ORDER BY vc.sort_order ASC, vc.created_at DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/admin/video/all-items',adminAuth,(req,res)=>{
    mainDb.all(`SELECT vi.id,vi.title,vc.name as cat_name FROM video_items vi LEFT JOIN video_categories vc ON vi.category_id=vc.id ORDER BY vc.sort_order ASC,vi.sort_order ASC,vi.title ASC`,[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/video/categories',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const name=san(req.body.name||'').trim();
    if(!name) return res.status(400).json({error:'نام دسته‌بندی الزامی است'});
    const coverUrl=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    const cover=req.file?`/gallery/${req.file.filename}`:(coverUrl||'');
    const desc=san(req.body.description||'');
    const parentId=req.body.parent_id&&+req.body.parent_id>0?+req.body.parent_id:null;
    mainDb.get('SELECT MAX(sort_order) as mx FROM video_categories',[],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO video_categories (name,description,cover,sort_order,parent_id) VALUES (?,?,?,?,?)',[name,desc,cover,so,parentId],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            res.json({success:true,id:this.lastID});
        });
    });
});
app.delete('/api/admin/video/categories/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT cover FROM video_categories WHERE id=?',[id],(err,cat)=>{
        if(cat&&cat.cover&&cat.cover.startsWith('/gallery/')) unlinkPublicFile(cat.cover);
        mainDb.run('DELETE FROM video_items WHERE category_id=?',[id],()=>mainDb.run('DELETE FROM video_categories WHERE id=?',[id],()=>res.json({success:true})));
    });
});
app.post('/api/admin/video/items',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const catId=+req.body.category_id;if(isNaN(catId)) return res.status(400).json({error:'دسته‌بندی الزامی است'});
    const title=san(req.body.title||'').trim();if(!title) return res.status(400).json({error:'عنوان ویدیو الزامی است'});
    const rawEmbed=san(req.body.embed_input||'');
    const embedUrl=parseAparatEmbed(rawEmbed);
    if(!embedUrl) return res.status(400).json({error:'لینک یا کد آپارات نامعتبر است'});
    // Thumbnail: uploaded file, provided URL, or auto-extracted from embed
    const thumbUrlInput=req.body.thumbnail_url&&req.body.thumbnail_url.trim().length>5?san(req.body.thumbnail_url.trim()):null;
    const thumbFile=req.file;
    let thumbnail=thumbFile?`/gallery/${thumbFile.filename}`:(thumbUrlInput||extractAparatThumb(embedUrl));
    const desc=san(req.body.description||'');
    const publishDate=req.body.publish_date||null;
    mainDb.get('SELECT MAX(sort_order) as mx FROM video_items WHERE category_id=?',[catId],(err,r)=>{
        const so=(r&&r.mx!=null)?r.mx+1:0;
        mainDb.run('INSERT INTO video_items (category_id,title,embed_url,thumbnail,description,sort_order,publish_date) VALUES (?,?,?,?,?,?,?)',[catId,title,embedUrl,thumbnail,desc,so,publishDate],function(err2){
            if(err2) return res.status(500).json({error:err2.message});
            // Auto-set category cover if empty
            if(thumbnail) mainDb.run('UPDATE video_categories SET cover=? WHERE id=? AND (cover IS NULL OR cover="")',[thumbnail,catId]);
            res.json({success:true,id:this.lastID,embed_url:embedUrl,thumbnail});
        });
    });
});
app.delete('/api/admin/video/items/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT thumbnail FROM video_items WHERE id=?',[id],(err,v)=>{
        if(v&&v.thumbnail&&v.thumbnail.startsWith('/gallery/')) unlinkPublicFile(v.thumbnail);
        mainDb.run('DELETE FROM video_items WHERE id=?',[id],()=>res.json({success:true}));
    });
});
app.put('/api/admin/video/categories/:id',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const name=san(req.body.name||'').trim();if(!name) return res.status(400).json({error:'نام الزامی است'});
    const desc=san(req.body.description||'');
    const parentId=req.body.parent_id&&+req.body.parent_id>0?+req.body.parent_id:null;
    const coverUrl=req.body.cover_url&&req.body.cover_url.trim().length>5?san(req.body.cover_url.trim()):null;
    const newCover=req.file?`/gallery/${req.file.filename}`:coverUrl;
    if(newCover){
        mainDb.run('UPDATE video_categories SET name=?,description=?,cover=?,parent_id=? WHERE id=?',[name,desc,newCover,parentId,id],err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
    } else {
        mainDb.run('UPDATE video_categories SET name=?,description=?,parent_id=? WHERE id=?',[name,desc,parentId,id],err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
    }
});
// sort قبل از :id
app.put('/api/admin/video/sort',adminAuth,express.json(),(req,res)=>{
    const ids=req.body.ids;if(!Array.isArray(ids)) return res.status(400).json({error:'ids required'});
    const stmt=mainDb.prepare('UPDATE video_categories SET sort_order=? WHERE id=?');
    ids.forEach((id,i)=>stmt.run([i,id]));
    stmt.finalize(()=>res.json({success:true}));
});
app.put('/api/admin/video/items/sort',adminAuth,express.json(),(req,res)=>{
    const ids=req.body.ids;if(!Array.isArray(ids)) return res.status(400).json({error:'ids required'});
    const stmt=mainDb.prepare('UPDATE video_items SET sort_order=? WHERE id=?');
    ids.forEach((id,i)=>stmt.run([i,id]));
    stmt.finalize(()=>res.json({success:true}));
});
app.put('/api/admin/video/items/:id',adminAuth,uploadImage.single('gallery_image'),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const title=san(req.body.title||'').trim();if(!title) return res.status(400).json({error:'عنوان الزامی است'});
    const desc=san(req.body.description||'');
    const publishDate=req.body.publish_date||null;
    const sets=['title=?','description=?','publish_date=?'];const vals=[title,desc,publishDate];
    const embedRaw=req.body.embed_url||'';
    if(embedRaw.trim()){const embedUrl=parseAparatEmbed(embedRaw);if(embedUrl){sets.push('embed_url=?');vals.push(embedUrl);}}
    const thumbUrlInput=req.body.thumb_url&&req.body.thumb_url.trim().length>5?san(req.body.thumb_url.trim()):null;
    if(req.file){sets.push('thumbnail=?');vals.push(`/gallery/${req.file.filename}`);}
    else if(thumbUrlInput){sets.push('thumbnail=?');vals.push(thumbUrlInput);}
    vals.push(id);
    mainDb.run(`UPDATE video_items SET ${sets.join(',')} WHERE id=?`,vals,err=>err?res.status(500).json({error:err.message}):res.json({success:true}));
});
// === استخراج کاور از فایل‌های صوتی موجود ===
// استخراج کاور از فایل صوتی با music-metadata
async function _extractAudioCover(fp) {
    const lib = await getMusicMeta();
    if (!lib) return null;
    try {
        const meta = await lib.parseFile(fp, { skipCovers: false, duration: false });
        const pic = lib.selectCover ? lib.selectCover(meta.common.picture) : (meta.common.picture && meta.common.picture[0]);
        if (!pic || !pic.data) return null;
        const ext = ((pic.format || 'image/jpeg').replace('image/','').replace('jpeg','jpg')) || 'jpg';
        return { data: Buffer.from(pic.data), ext: ext === 'jpg' ? 'jpg' : ext };
    } catch(e) { return null; }
}
// استخراج thumbnail از فایل ویدیویی با ffmpeg
function _extractVideoCover(fp) {
    return new Promise(resolve => {
        const {execFile} = require('child_process');
        const outFile = fp + '__thumb__.jpg';
        execFile('ffmpeg', ['-y', '-i', fp, '-ss', '00:00:02', '-vframes', '1', '-q:v', '3', '-vf', 'scale=320:-2', outFile], { timeout: 20000 }, (e) => {
            if (e || !fs.existsSync(outFile)) return resolve(null);
            const data = fs.readFileSync(outFile);
            try { fs.unlinkSync(outFile); } catch(e2) {}
            resolve({ data, ext: 'jpg' });
        });
    });
}

app.post('/api/admin/audio/extract-covers', adminAuth, async(req, res) => {
    const galleryDir = path.join(__dirname, 'public', 'gallery');
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
    // فایل‌های صوتی بدون کاور را پیدا کن
    mainDb.all(`SELECT at.id, at.audio_url, at.cover, COALESCE(ac.cover,'') as cat_cover
                FROM audio_tracks at LEFT JOIN audio_categories ac ON at.category_id=ac.id
                WHERE (at.cover IS NULL OR at.cover='') AND at.audio_url LIKE '/audio/%'`,
    [], async (err, tracks) => {
        if (err) return res.status(500).json({ error: err.message });
        let updated = 0, fromFile = 0, fromCategory = 0;
        for (const tr of (tracks || [])) {
            try {
                const fp = path.resolve(__dirname, 'public', tr.audio_url.replace(/^\//, ''));
                let coverImg = null;
                if (fs.existsSync(fp)) {
                    coverImg = await _extractAudioCover(fp);
                }
                if (coverImg) {
                    // ذخیره کاور استخراج‌شده از فایل
                    const coverName = crypto.randomBytes(8).toString('hex') + '-cover.' + coverImg.ext;
                    const coverPath = path.join(galleryDir, coverName);
                    fs.writeFileSync(coverPath, coverImg.data);
                    await new Promise(r => mainDb.run('UPDATE audio_tracks SET cover=? WHERE id=?', ['/gallery/' + coverName, tr.id], r));
                    updated++; fromFile++;
                } else if (tr.cat_cover) {
                    // fallback: کاور دسته‌بندی
                    await new Promise(r => mainDb.run('UPDATE audio_tracks SET cover=? WHERE id=?', [tr.cat_cover, tr.id], r));
                    updated++; fromCategory++;
                }
            } catch(e) {}
        }
        res.json({ success: true, updated, fromFile, fromCategory, total: (tracks || []).length });
    });
});

app.post('/api/admin/video/extract-covers', adminAuth, async(req, res) => {
    const galleryDir = path.join(__dirname, 'public', 'gallery');
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
    mainDb.all(`SELECT vi.id, vi.video_url, vi.thumbnail, COALESCE(vc.cover,'') as cat_cover
                FROM video_items vi LEFT JOIN video_categories vc ON vi.category_id=vc.id
                WHERE (vi.thumbnail IS NULL OR vi.thumbnail='') AND vi.video_url LIKE '/audio/%'`,
    [], async (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        let updated = 0, fromFile = 0, fromCategory = 0;
        for (const vi of (items || [])) {
            try {
                const fp = path.resolve(__dirname, 'public', vi.video_url.replace(/^\//, ''));
                let coverImg = null;
                if (fs.existsSync(fp)) {
                    coverImg = await _extractVideoCover(fp);
                }
                if (coverImg) {
                    const coverName = crypto.randomBytes(8).toString('hex') + '-thumb.jpg';
                    fs.writeFileSync(path.join(galleryDir, coverName), coverImg.data);
                    await new Promise(r => mainDb.run('UPDATE video_items SET thumbnail=? WHERE id=?', ['/gallery/' + coverName, vi.id], r));
                    updated++; fromFile++;
                } else if (vi.cat_cover) {
                    await new Promise(r => mainDb.run('UPDATE video_items SET thumbnail=? WHERE id=?', [vi.cat_cover, vi.id], r));
                    updated++; fromCategory++;
                }
            } catch(e) {}
        }
        res.json({ success: true, updated, fromFile, fromCategory, total: (items || []).length });
    });
});

// === PUBLIC LATEST MEDIA APIs ===
app.get('/api/gallery/latest',(req,res)=>{
    const limit=Math.min(parseInt(req.query.limit||'8'),20);
    mainDb.all('SELECT * FROM gallery_photos ORDER BY created_at DESC LIMIT ?',[limit],(err,rows)=>res.json(rows||[]));
});
app.get('/api/videos/latest',(req,res)=>{
    const limit=Math.min(parseInt(req.query.limit||'5'),20);
    mainDb.all(`SELECT vi.*, COALESCE(NULLIF(vi.thumbnail,''), vc.cover) as thumbnail, COALESCE(vc.cover,'') as _catCover FROM video_items vi LEFT JOIN video_categories vc ON vi.category_id=vc.id ORDER BY COALESCE(vi.publish_date, vi.created_at) DESC LIMIT ?`,[limit],(err,rows)=>res.json(rows||[]));
});
app.get('/api/audio/all-dates',(req,res)=>{
    mainDb.all(`SELECT at.id,at.title,at.audio_url,at.publish_date,at.artist,COALESCE(NULLIF(at.cover,''),ac.cover) as cover FROM audio_tracks at LEFT JOIN audio_categories ac ON at.category_id=ac.id WHERE at.publish_date IS NOT NULL AND at.publish_date!='' ORDER BY at.publish_date DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/videos/all-dates',(req,res)=>{
    mainDb.all(`SELECT vi.id,vi.title,vi.embed_url,vi.publish_date,COALESCE(NULLIF(vi.thumbnail,''),vc.cover) as thumbnail FROM video_items vi LEFT JOIN video_categories vc ON vi.category_id=vc.id WHERE vi.publish_date IS NOT NULL AND vi.publish_date!='' ORDER BY vi.publish_date DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.get('/api/audio/latest',(req,res)=>{
    const limit=Math.min(parseInt(req.query.limit||'5'),20);
    mainDb.all(`SELECT at.*, COALESCE(NULLIF(at.cover,''), ac.cover) as cover FROM audio_tracks at LEFT JOIN audio_categories ac ON at.category_id=ac.id ORDER BY COALESCE(at.publish_date, at.created_at) DESC LIMIT ?`,[limit],(err,rows)=>res.json(rows||[]));
});

// Routes
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/sw.js',(req,res)=>{res.setHeader('Content-Type','application/javascript');res.sendFile(path.join(__dirname,'public','sw.js'));});
app.use((req,res)=>{if(req.path.startsWith('/api/')) return res.status(404).json({error:'مسیر یافت نشد'});res.sendFile(path.join(__dirname,'public','index.html'));});
app.use((err,req,res,next)=>{
    console.error('Error:', err.code, err.message, err.stack);
    if(err && err.message && err.message.startsWith('CORS')) return res.status(403).json({error:'CORS blocked'});
    if(err.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'حجم فایل بیش از حد مجاز است (تصاویر حداکثر ۵۰ مگابایت، صوت حداکثر ۱۰۰ مگابایت)'});
    if(err.code==='LIMIT_UNEXPECTED_FILE') return res.status(400).json({error:'فیلد آپلود نامعتبر'});
    if(err.code==='ENOENT') return res.status(500).json({error:'خطا در ذخیره فایل - لطفاً با مدیر تماس بگیرید'});
    if(err.type==='entity.too.large') return res.status(413).json({error:'حجم درخواست بیش از حد مجاز'});
    // در production هیچ جزییاتی لو نرود
    const showDetails = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: showDetails ? ('خطای داخلی سرور: '+(err.message||'')) : 'خطای داخلی سرور' });
});

// تولید خودکار آیکون‌های maskable هنگام راه‌اندازی سرور
async function ensureMaskableIcons() {
    if (!sharp) return;
    const iconsDir = path.join(__dirname, 'public', 'icons');
    const src = path.join(iconsDir, 'icon-512.png');
    if (!fs.existsSync(src)) return;
    const srcMtime = fs.statSync(src).mtimeMs;
    for (const s of [192, 512]) {
        const dest = path.join(iconsDir, `icon-${s}-maskable.png`);
        let needsRegen = true;
        try { needsRegen = !fs.existsSync(dest) || srcMtime > fs.statSync(dest).mtimeMs; } catch(e) {}
        if (!needsRegen) continue;
        try {
            await sharp(src)
                .resize(Math.round(s * 0.8), Math.round(s * 0.8), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .extend({ top: Math.round(s * 0.1), bottom: Math.round(s * 0.1), left: Math.round(s * 0.1), right: Math.round(s * 0.1), background: { r: 255, g: 255, b: 255, alpha: 0 } })
                .png().toFile(dest);
            console.log(`✅ maskable icon ${s}x${s} generated`);
        } catch(e) { console.warn(`⚠️ maskable icon ${s} failed:`, e.message); }
    }
}

app.listen(PORT,()=>{
    console.log(`\n🚀 سرور: http://localhost:${PORT}`);
    console.log(`🔐 ادمین: http://localhost:${PORT}/admin`);
    if (!process.env.ADMIN_PASSWORD) {
        console.warn('⚠️  WARNING: ADMIN_PASSWORD env var is not set — using default. Change it in production!');
    }
    console.log('');
    ensureMaskableIcons();
});
