require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

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
    const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
    const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 15, message: { error: 'تعداد تلاش بیش از حد است' } });
    app.use('/api/auth', authLimiter);
    app.use(generalLimiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
        mainDb.run(`CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subject TEXT NOT NULL, status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS ticket_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, text TEXT NOT NULL, sender_type TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ticket_id) REFERENCES tickets(id))`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, position INTEGER UNIQUE NOT NULL, title TEXT DEFAULT '', image TEXT DEFAULT '', link TEXT DEFAULT '', active INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        mainDb.run(`CREATE TABLE IF NOT EXISTS sliders (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT DEFAULT '', image TEXT DEFAULT '', link TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        const defaults = [
            ['site_name','مرکز نشر آثار آیت الله دستغیب'],
            ['site_subtitle','آیت الله دستغیب'],
            ['primary_color','#0d9488'],
            ['secondary_color','#0f766e'],
            ['logo_url',''],
            ['live_url',''],
            ['live_active','0'],
        ];
        defaults.forEach(([k,v]) => mainDb.run(`INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)`, [k,v]));
        for(let i=1;i<=3;i++) mainDb.run(`INSERT OR IGNORE INTO banners (position,title,image,link,active) VALUES (?,'',' ','',0)`,[i]);
    });
}

// Dirs
['public/covers','public/banners','public/sliders','public/logos','books'].forEach(d => {
    const p = path.join(__dirname, d);
    if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true});
});

// Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dirs = { cover:'public/covers', database:'books', banner_image:'public/banners', slider_image:'public/sliders', logo:'public/logos' };
        cb(null, path.join(__dirname, dirs[file.fieldname] || 'public/covers'));
    },
    filename: (req, file, cb) => cb(null, crypto.randomBytes(8).toString('hex') + path.extname(file.originalname))
});
const upload = multer({ storage, limits:{fileSize:50*1024*1024} });

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
        const db=new sqlite3.Database(p,sqlite3.OPEN_READONLY,async err=>{
            if(err) return resolve(0);
            const t=await findBestTable(db);
            if(!t){db.close();return resolve(0);}
            db.get(`SELECT COUNT(*) as cnt FROM "${t}"`,[],(err,r)=>{db.close();resolve(err?0:r.cnt);});
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

// === API SETTINGS (PUBLIC) ===
app.get('/api/settings',(req,res)=>{
    mainDb.all('SELECT key,value FROM settings',[],(err,rows)=>{
        if(err) return res.status(500).json({error:err.message});
        const s={};rows.forEach(r=>s[r.key]=r.value);res.json(s);
    });
});

// === API BANNERS (PUBLIC) ===
app.get('/api/banners',(req,res)=>{
    mainDb.all('SELECT * FROM banners ORDER BY position ASC',[],(err,rows)=>res.json(rows||[]));
});

// === API SLIDERS (PUBLIC) ===
app.get('/api/sliders',(req,res)=>{
    mainDb.all('SELECT * FROM sliders WHERE active=1 ORDER BY sort_order ASC',[],(err,rows)=>res.json(rows||[]));
});

// === API AUTH ===
app.post('/api/auth/register',(req,res)=>{
    const u=san(req.body.username),p=req.body.password;
    if(!u||!p) return res.status(400).json({error:'نام کاربری و رمز عبور الزامی است'});
    if(u.length<3) return res.status(400).json({error:'نام کاربری حداقل ۳ کاراکتر باشد'});
    mainDb.run('INSERT INTO users (username,password) VALUES (?,?)',[u,p],function(err){
        if(err){if(err.message.includes('UNIQUE')) return res.status(400).json({error:'این نام کاربری قبلاً ثبت شده'});return res.status(500).json({error:err.message});}
        res.json({success:true,id:this.lastID,username:u});
    });
});
app.post('/api/auth/login',(req,res)=>{
    const u=san(req.body.username),p=req.body.password;
    if(!u||!p) return res.status(400).json({error:'نام کاربری و رمز عبور را وارد کنید'});
    mainDb.get('SELECT id,username FROM users WHERE username=? AND password=?',[u,p],(err,row)=>{
        if(err) return res.status(500).json({error:err.message});
        if(!row) return res.status(401).json({error:'نام کاربری یا رمز عبور اشتباه است'});
        res.json({success:true,id:row.id,username:row.username});
    });
});
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
app.post('/api/tickets',(req,res)=>{
    const u=san(req.body.username),s=san(req.body.subject),m=san(req.body.message);
    if(!s||!m) return res.status(400).json({error:'موضوع و پیام الزامی است'});
    mainDb.run('INSERT INTO tickets (username,subject) VALUES (?,?)',[u||'ناشناس',s],function(err){
        if(err) return res.status(500).json({error:err.message});
        const tid=this.lastID;
        mainDb.run('INSERT INTO ticket_messages (ticket_id,text,sender_type) VALUES (?,?,"user")',[tid,m],()=>res.json({success:true,ticket_id:tid}));
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
app.put('/api/admin/books/:id',adminAuth,upload.fields([{name:'cover',maxCount:1}]),(req,res)=>{
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
app.post('/api/admin/logo',adminAuth,upload.single('logo'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'فایل لوگو ارائه نشده'});
    const lu=`/logos/${req.file.filename}`;
    mainDb.run('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES ("logo_url",?,CURRENT_TIMESTAMP)',[lu],()=>res.json({success:true,logo_url:lu}));
});

// Admin Banners
app.get('/api/admin/banners',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM banners ORDER BY position ASC',[],(err,rows)=>res.json(rows||[]));
});
app.put('/api/admin/banners/:pos',adminAuth,upload.single('banner_image'),(req,res)=>{
    const pos=+req.params.pos;if(isNaN(pos)||pos<1||pos>3) return res.status(400).json({error:'موقعیت نامعتبر'});
    mainDb.get('SELECT * FROM banners WHERE position=?',[pos],(err,bn)=>{
        let img=bn?bn.image:'';
        if(req.file){if(img&&img.length>2){const op=path.resolve(__dirname,'public',img.replace(/^\//,''));if(fs.existsSync(op)) fs.unlinkSync(op);}img=`/banners/${req.file.filename}`;}
        const act=req.body.active==='1'||req.body.active==='true'?1:0;
        mainDb.run(`INSERT OR REPLACE INTO banners (position,title,image,link,active,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`,
            [pos,san(req.body.title||''),img,san(req.body.link||''),act],()=>res.json({success:true,image:img}));
    });
});

// Admin Sliders
app.get('/api/admin/sliders',adminAuth,(req,res)=>{
    mainDb.all('SELECT * FROM sliders ORDER BY sort_order ASC',[],(err,rows)=>res.json(rows||[]));
});
app.post('/api/admin/sliders',adminAuth,upload.single('slider_image'),(req,res)=>{
    if(!req.file) return res.status(400).json({error:'تصویر اسلایدر الزامی است'});
    mainDb.get('SELECT COUNT(*) as c FROM sliders',[],(err,r)=>{
        if(r&&r.c>=5) return res.status(400).json({error:'حداکثر ۵ اسلاید مجاز است'});
        const img=`/sliders/${req.file.filename}`;
        mainDb.run('INSERT INTO sliders (title,image,link,sort_order) VALUES (?,?,?,?)',[san(req.body.title||''),img,san(req.body.link||''),r?r.c:0],function(err){
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
    mainDb.all(`SELECT u.id,u.username,u.created_at,(SELECT COUNT(*) FROM messages WHERE user_id=u.id) as msg_count,(SELECT created_at FROM messages WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) as last_active FROM users u ORDER BY u.created_at DESC`,[],(err,rows)=>res.json(rows||[]));
});
app.delete('/api/admin/users/:id',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    mainDb.run('DELETE FROM messages WHERE user_id=?',[id],()=>mainDb.run('DELETE FROM users WHERE id=?',[id],()=>res.json({success:true})));
});

// Admin QA
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
        res.json({success:true});
    });
});
app.put('/api/admin/tickets/:id/status',adminAuth,(req,res)=>{
    const id=+req.params.id;if(isNaN(id)) return res.status(400).json({error:'شناسه نامعتبر'});
    const s=['open','answered','closed'].includes(req.body.status)?req.body.status:'open';
    mainDb.run('UPDATE tickets SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[s,id],()=>res.json({success:true}));
});

// Routes
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/sw.js',(req,res)=>{res.setHeader('Content-Type','application/javascript');res.sendFile(path.join(__dirname,'public','sw.js'));});
app.use((req,res)=>{if(req.path.startsWith('/api/')) return res.status(404).json({error:'مسیر یافت نشد'});res.sendFile(path.join(__dirname,'public','index.html'));});
app.use((err,req,res,next)=>{console.error('Error:',err.message);if(err.code==='LIMIT_FILE_SIZE') return res.status(413).json({error:'حجم فایل بیش از حد مجاز است'});res.status(500).json({error:'خطای داخلی سرور'});});

app.listen(PORT,()=>{
    console.log(`\n🚀 سرور: http://localhost:${PORT}`);
    console.log(`🔐 ادمین: http://localhost:${PORT}/admin`);
    console.log(`🔑 رمز: ${ADMIN_PASSWORD}\n`);
});
