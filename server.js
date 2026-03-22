require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
let webpush; try { webpush = require('web-push'); } catch(e) { webpush = null; }

// VAPID keys (stored in env or defaults generated once)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAL3iRBxoSa5U16TRyhqQubEAb97VXAkF0jU0iKh2rX7MX4cIYXK2qTFiBMSHL59F3lUWCYtaAvtnruUwDmgSbE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'Y2NG_PXSMfMXfxbZ_UGX4lW7sWASyOuALHbL4QSYg4E';
if (webpush) {
    webpush.setVapidDetails('mailto:admin@localhost', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

let rateLimit, helmet;
try { rateLimit = require('express-rate-limit'); } catch(e) { rateLimit = null; }
try { helmet = require('helmet'); } catch(e) { helmet = null; }

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@secure2024';

// Security middleware
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    }));
}

app.use(cors());

// Rate limiting
if (rateLimit) {
    // فقط روی API اعمال میشه نه فایل‌های استاتیک
    const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 1500 });
    const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'تعداد تلاش بیش از حد است' } });
    app.use('/api/auth', authLimiter);
    app.use('/api/', apiLimiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Dynamic manifest.json (reads PWA settings from DB)
app.get('/manifest.json', (req, res) => {
    const keys = ['pwa_name','pwa_short_name','pwa_description','pwa_theme_color','pwa_bg_color','icon_version'];
    mainDb.all(`SELECT key,value FROM settings WHERE key IN (${keys.map(()=>'?').join(',')})`, keys, (err, rows) => {
        const s = {};
        if (rows) rows.forEach(r => { s[r.key] = r.value; });
        const v = s.icon_version || '1';
        const iconSizes = [72,96,128,144,152,192,384,512];
        const manifest = {
            name: s.pwa_name || 'مرکز نشر آثار آیت الله دستغیب',
            short_name: s.pwa_short_name || 'مرکز نشر آثار',
            description: s.pwa_description || 'اپلیکیشن مرکز نشر آثار',
            theme_color: s.pwa_theme_color || '#0d9488',
            background_color: s.pwa_bg_color || '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            lang: 'fa',
            dir: 'rtl',
            id: '/',
            icons: iconSizes.map(sz => ({
                src: `/icons/icon-${sz}.png?v=${v}`,
                sizes: `${sz}x${sz}`,
                type: 'image/png',
                purpose: 'any maskable'
            }))
        };
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(JSON.stringify(manifest));
    });
});

// HTML files: no-cache so updates are reflected immediately
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));

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
        mainDb.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'broadcast', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS user_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, notification_id INTEGER NOT NULL, is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, subscription TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id))`);


        const defaults = [
            ['site_name','مرکز نشر آثار آیت الله دستغیب'],
            ['site_subtitle','آیت الله دستغیب'],
            ['primary_color','#0d9488'],
            ['secondary_color','#0f766e'],
            ['logo_url',''],
            ['favicon_url',''],
            ['live_url',''],
            ['live_active','0'],
            ['live_embed',''],
            ['slider_padding','0'],
            ['slider_radius','0'],
            ['slider_height','180'],
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
        for(let i=1;i<=3;i++) mainDb.run(`INSERT OR IGNORE INTO banners (position,title,image,link,active) VALUES (?,'',' ','',0)`,[i]);
        // Migration: add user_id to tickets if not exists
        mainDb.run(`ALTER TABLE tickets ADD COLUMN user_id INTEGER DEFAULT NULL`, () => {});
        // Migration: add notifications tables if not exists (already created above)
    });
}

// Dirs
['public/covers','public/banners','public/sliders','public/logos','public/icons','books'].forEach(d => {
    const p = path.join(__dirname, d);
    if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true});
});

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dirs = { cover:'public/covers', database:'books', banner_image:'public/banners', slider_image:'public/sliders', logo:'public/logos', favicon:'public/icons' };
        cb(null, path.join(__dirname, dirs[file.fieldname] || 'public/covers'));
    },
    filename: (req, file, cb) => cb(null, crypto.randomBytes(8).toString('hex') + path.extname(file.originalname))
});
const uploadImage = multer({ storage, limits:{fileSize:10*1024*1024} });
const upload = multer({ storage, limits:{fileSize:400*1024*1024} });

// Auth middleware
function adminAuth(req,res,next) {
    if(req.headers['x-admin-token']===ADMIN_PASSWORD) return next();
    res.status(401).json({error:'دسترسی غیرمجاز'});
}
function userAuth(req,res,next) {
    const uid = req.headers['x-user-id'];
    if(!uid||isNaN(+uid)) return res.status(401).json({error:'لطفاً وارد حساب کاربری شوید'});
    req.userId=+uid; next();
}
function san(s){ return typeof s==='string'?s.replace(/<script[^>]*>.*?<\/script>/gi,'').replace(/javascript:/gi,'').trim():s; }

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
    mainDb.all('SELECT id,title,author,description,cover,page_count,created_at FROM books ORDER BY created_at DESC',[],(err,rows)=>{
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
app.get('/api/search', async (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) return res.json({ books: [], pages: [] });

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

// === API BANNERS (PUBLIC) ===
app.get('/api/banners',(req,res)=>{
    res.set('Cache-Control','no-store');
    mainDb.all('SELECT * FROM banners ORDER BY position ASC',[],(err,rows)=>res.json(rows||[]));
});

// === API SLIDERS (PUBLIC) ===
app.get('/api/sliders',(req,res)=>{
    res.set('Cache-Control','no-store');
    mainDb.all('SELECT * FROM sliders WHERE active=1 ORDER BY sort_order ASC',[],(err,rows)=>res.json(rows||[]));
});

// === API AUTH ===
app.post('/api/auth/register',(req,res)=>{
    const u=san(req.body.username),p=req.body.password;
    if(!u||!p) return res.status(400).json({error:'نام کاربری و رمز عبور الزامی است'});
    if(u.length<3) return res.status(400).json({error:'نام کاربری حداقل ۳ کاراکتر باشد'});
    if(p.length<6) return res.status(400).json({error:'رمز عبور حداقل ۶ کاراکتر باشد'});
    const hash = bcrypt.hashSync(p, 10);
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

// === NOTIFICATIONS (PUBLIC - for users) ===
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
app.post('/api/admin/login',(req,res)=>{
    if(req.body.password===ADMIN_PASSWORD) res.json({success:true,token:ADMIN_PASSWORD});
    else res.status(401).json({error:'رمز عبور اشتباه است'});
});

app.post('/api/admin/books',adminAuth,upload.fields([{name:'database',maxCount:1},{name:'cover',maxCount:1}]),async(req,res)=>{
    try{
        const t=san(req.body.title),a=san(req.body.author),d=san(req.body.description);
        if(!t||!req.files['database']) return res.status(400).json({error:'عنوان و فایل دیتابیس الزامی است'});
        const dbf=req.files['database'][0],cf=req.files['cover']?req.files['cover'][0]:null;
        const cp=cf?`/covers/${cf.filename}`:'';
        const pc=await countPages(path.resolve(__dirname,'books',dbf.filename));
        mainDb.run('INSERT INTO books (title,author,description,cover,db_filename,page_count) VALUES (?,?,?,?,?,?)',[t,a||'',d||'',cp,dbf.filename,pc],function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({success:true,id:this.lastID,page_count:pc});
        });
    }catch(e){res.status(500).json({error:e.message});}
});
app.delete('/api/admin/books/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT db_filename,cover FROM books WHERE id=?',[id],(err,b)=>{
        if(err||!b) return res.status(404).json({error:'کتاب یافت نشد'});
        const dp=path.resolve(__dirname,'books',path.basename(b.db_filename));
        if(fs.existsSync(dp)) fs.unlinkSync(dp);
        if(b.cover){const cp=path.resolve(__dirname,'public',b.cover.replace(/^\//,''));if(fs.existsSync(cp)) fs.unlinkSync(cp);}
        mainDb.run('DELETE FROM books WHERE id=?',[id],()=>res.json({success:true}));
    });
});
app.put('/api/admin/books/:id',adminAuth,uploadImage.fields([{name:'cover',maxCount:1}]),(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT * FROM books WHERE id=?',[id],(err,b)=>{
        if(err||!b) return res.status(404).json({error:'کتاب یافت نشد'});
        const cf=req.files&&req.files['cover']?req.files['cover'][0]:null;
        let cp=b.cover;
        if(cf){if(b.cover){const op=path.resolve(__dirname,'public',b.cover.replace(/^\//,''));if(fs.existsSync(op)) fs.unlinkSync(op);}cp=`/covers/${cf.filename}`;}
        mainDb.run('UPDATE books SET title=?,author=?,description=?,cover=? WHERE id=?',[san(req.body.title)||b.title,san(req.body.author)||b.author,san(req.body.description)||b.description,cp,id],()=>res.json({success:true}));
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
app.post('/api/admin/logo',adminAuth,uploadImage.single('logo'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل لوگو ارائه نشده'});
    const lu=`/logos/${req.file.filename}`;
    mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("logo_url",?,CURRENT_TIMESTAMP)',[lu],()=>res.json({success:true,logo_url:lu}));
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
    // Copy uploaded file to all PWA icon sizes (browser handles scaling)
    const sizes=[72,96,128,144,152,192,384,512];
    sizes.forEach(s=>{
        try{ fs.copyFileSync(srcPath, path.join(__dirname,'public','icons',`icon-${s}.png`)); }catch(e){}
    });
    const newVersion = Date.now().toString();
    mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("favicon_url",?,CURRENT_TIMESTAMP)',[fu],()=>{
        mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("icon_version",?,CURRENT_TIMESTAMP)',[newVersion],()=>{
            res.json({success:true,favicon_url:fu});
        });
    });
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
            if(img&&img.length>2&&img.trim().length>0&&!img.startsWith('http')){const op=path.resolve(__dirname,'public',img.replace(/^\//,''));if(fs.existsSync(op)) fs.unlinkSync(op);}
            img=`/banners/${req.file.filename}`;
        } else if(req.body.image_url&&req.body.image_url.trim().length>5) {
            img=san(req.body.image_url.trim());
        }
        const act=req.body.active==='1'||req.body.active==='true'?1:0;
        const title=san(req.body.title||'');
        const link=san(req.body.link||'');
        const validSections=['after_slider','after_shortcuts','after_books','after_lectures'];
        const pageSec=validSections.includes(req.body.page_section)?req.body.page_section:(bn&&bn.page_section||'after_books');
        mainDb.run(`INSERT OR REPLACE INTO banners (position,title,image,link,active,page_section,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
            [pos,title,img,link,act,pageSec],()=>res.json({success:true,image:img}));
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
        mainDb.run('INSERT INTO sliders (title,image,link,sort_order,display_section) VALUES (?,?,?,?,?)',[san(req.body.title||''),img,san(req.body.link||''),r?r.c:0,section],function(err){
            if(err) return res.status(500).json({error:err.message});
            res.json({success:true,id:this.lastID,image:img});
        });
    });
});
app.delete('/api/admin/sliders/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.get('SELECT image FROM sliders WHERE id=?',[id],(err,sl)=>{
        if(sl&&sl.image&&sl.image.length>2){const p=path.resolve(__dirname,'public',sl.image.replace(/^\//,''));if(fs.existsSync(p)) fs.unlinkSync(p);}
        mainDb.run('DELETE FROM sliders WHERE id=?',[id],()=>res.json({success:true}));
    });
});

// Admin Users
app.get('/api/admin/users',adminAuth,(req,res)=>{
    mainDb.all(`SELECT u.id,u.username,u.created_at,(SELECT COUNT(*) FROM messages WHERE user_id=u.id) as msg_count,(SELECT created_at FROM messages WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as last_active FROM users u ORDER BY u.created_at DESC`,[],(err,rows)=>{
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
        // Assign to all users, then send push after inserts are queued
        mainDb.all('SELECT id FROM users',[],(err2,users)=>{
            if(users&&users.length) users.forEach(u=>mainDb.run('INSERT OR IGNORE INTO user_notifications (user_id,notification_id) VALUES (?,?)',[u.id,notifId]));
            // Push is called after inserts are queued - SQLite serial queue ensures inserts complete first
            sendPushToAll({title, body: msg, icon:'/icons/icon-192.png', badge:'/icons/icon-72.png', tag:'broadcast-'+notifId, data:{url:'/'}});
            res.json({success:true,id:notifId});
        });
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

// Routes
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/sw.js',(req,res)=>{res.setHeader('Content-Type','application/javascript');res.sendFile(path.join(__dirname,'public','sw.js'));});
app.use((req,res)=>{if(req.path.startsWith('/api/')) return res.status(404).json({error:'مسیر یافت نشد'});res.sendFile(path.join(__dirname,'public','index.html'));});
app.use((err,req,res,next)=>{console.error('Error:',err.message);if(err.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'حجم فایل بیش از حد مجاز است (تصاویر حداکثر ۱۰ مگابایت، دیتابیس حداکثر ۴۰۰ مگابایت)'});res.status(500).json({error:'خطای داخلی سرور'});});

app.listen(PORT,()=>{
    console.log(`\n🚀 سرور: http://localhost:${PORT}`);
    console.log(`🔐 ادمین: http://localhost:${PORT}/admin`);
    console.log(`🔑 رمز: ${ADMIN_PASSWORD}\n`);
});
