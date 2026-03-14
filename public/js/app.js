// ====================================================
// ناوبری اصلی
// ====================================================
function navToScreen(name) {
    const prevActive = document.querySelector('.screen.active');
    const prevName = prevActive ? prevActive.id.replace('screen-', '') : null;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById('screen-' + name);
    if (targetScreen) targetScreen.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`[data-nav="${name}"]`);
    if (navBtn) navBtn.classList.add('active');

    if (name === 'live') {
        initLiveScreen();
    } else {
        const c = document.getElementById('live-embed-container');
        if (c) c.innerHTML = '';
    }

    if (name === 'home') loadBanners();
    if (name === 'lectures') initWP(prevName === 'lectures');
    if (name === 'news') initNews();
    if (name === 'statements') initStatements();
    if (name === 'qa') { updateQAUserUI(); if (qaUser) renderQATickets(); else showQAAuth(); }
    if (name === 'media') initMedia();
    else {
        const wpPlayer = document.getElementById('wp-media-player-container');
        if (wpPlayer) wpPlayer.innerHTML = "";
    }

    const payIframe = document.getElementById('payment-iframe');
    if (payIframe) {
        if (name === 'payment') {
            if (!payIframe.src || payIframe.src === window.location.href) payIframe.src = 'https://dastgheibqoba.info/pay/?webview=1';
        } else {
            payIframe.src = '';
        }
    }
}

// ====================================================
// مقداردهی اولیه اپلیکیشن
// ====================================================
async function init() {
    const safetyTimeout = setTimeout(() => {
        hideLoading();
        const appWr = document.getElementById('app-wrapper');
        if(appWr) appWr.classList.remove('hidden');
    }, 2500);

    try {
        try { await applySiteSettings(); } catch(e) { console.warn('Settings err:', e); }
        try { loadSettings(); } catch(e) {}
        try {
            const r = await fetch('/api/books');
            allBooks = await r.json();
            if(!Array.isArray(allBooks)) allBooks = [];
        } catch(e) {
            console.warn('Books err:', e);
            allBooks=[];
        }
        try { renderLibrary(); } catch(e) { console.warn('Render err:', e); }
        try { await loadBanners(); } catch(e) { console.warn('Banners err:', e); }
        try { fetchLatestLectures(); } catch(e) { console.warn('Lectures err:', e); }
        if (qaUser) { try { startNotifPolling(); } catch(e) {} }
    } catch(e) {
        console.error("Critical Init Error:", e);
    } finally {
        clearTimeout(safetyTimeout);
        if (typeof tailwind !== 'undefined') {
            hideLoading();
            const appWr = document.getElementById('app-wrapper');
            if(appWr) appWr.classList.remove('hidden');
            setTimeout(() => { try { loadSliders(); } catch(e) {} }, 50);
        }
    }
}

// ====================================================
// اسلایدر صفحه اصلی
// ====================================================
let sliderData = [], sliderIndex = 0, sliderTimer = null, sliderSlideW = 0;

async function loadSliders() {
    const res = await fetch('/api/sliders');
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return;

    const valid = await Promise.all(raw.map(sl => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            if (img.naturalWidth < 10 || img.naturalHeight < 10) return resolve(null);
            resolve(sl);
        };
        img.onerror = () => resolve(null);
        img.src = sl.image;
    })));
    sliderData = valid.filter(Boolean);

    if (sliderData.length === 0) return;
    const wrapper = document.getElementById('home-slider');
    const track = document.getElementById('slider-track');
    const dots = document.getElementById('slider-dots');
    if (!wrapper || !track || !dots) return;
    const s = window._siteSettings || {};
    const padding = parseInt(s.slider_padding || '0');
    const radius = parseInt(s.slider_radius || '0');
    const height = parseInt(s.slider_height || '180');
    wrapper.style.display = 'block';
    wrapper.style.height = height + 'px';
    wrapper.style.padding = padding + 'px';
    wrapper.style.borderRadius = radius + 'px';
    if (padding > 0) wrapper.style.boxSizing = 'border-box';
    wrapper.getBoundingClientRect();
    sliderSlideW = wrapper.offsetWidth || document.getElementById('app-wrapper')?.offsetWidth || window.innerWidth;
    const slideW = sliderSlideW;
    track.style.width = (sliderData.length * slideW) + 'px';
    track.innerHTML = sliderData.map(sl => {
        const onclick = sl.link ? `onclick="openWebView('${sl.link.replace(/'/g,"\\'")}');sliderTimer&&clearInterval(sliderTimer);"` : '';
        return `<div style="flex-shrink:0;width:${slideW}px;height:100%;cursor:pointer;overflow:hidden;border-radius:${radius}px;" ${onclick}><img src="${sl.image}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="${sl.title||''}"></div>`;
    }).join('');
    dots.innerHTML = sliderData.map((_,i) =>
        `<button onclick="goToSlide(${i})" class="w-2 h-2 rounded-full transition-all ${i===0?'bg-white w-4':'bg-white/50'}"></button>`
    ).join('');
    sliderIndex = 0;
    startSliderAuto();
}

function goToSlide(i) {
    sliderIndex = (i + sliderData.length) % sliderData.length;
    const track = document.getElementById('slider-track');
    const w = sliderSlideW || document.getElementById('home-slider')?.offsetWidth || window.innerWidth;
    if (track) track.style.transform = `translateX(-${sliderIndex * w}px)`;
    document.querySelectorAll('#slider-dots button').forEach((b, idx) => {
        b.className = `w-2 h-2 rounded-full transition-all ${idx === sliderIndex ? 'bg-white w-4' : 'bg-white/50'}`;
    });
}
function sliderNext() { goToSlide(sliderIndex + 1); }
function sliderPrev() { goToSlide(sliderIndex - 1); }
function startSliderAuto() {
    if (sliderTimer) clearInterval(sliderTimer);
    sliderTimer = setInterval(() => sliderNext(), 4000);
}

// ====================================================
// بنرهای صفحه اصلی
// ====================================================
async function loadBanners() {
    ['after_slider','after_shortcuts','after_books','after_lectures'].forEach(sec => {
        const el = document.getElementById('home-banner-' + sec);
        if (el) el.innerHTML = '';
    });
    try {
        const res = await fetch('/api/banners', { cache: 'no-store' });
        if (!res.ok) return;
        const banners = await res.json();
        if (!Array.isArray(banners)) return;
        const active = banners.filter(b => +b.active === 1 && b.image && b.image.trim().length > 2);
        const s = window._siteSettings || {};
        const padding = parseInt(s.banner_padding ?? '4');
        const radius = parseInt(s.banner_radius ?? '16');
        const height = parseInt(s.banner_height ?? '120');
        const groups = {};
        active.forEach(b => {
            const sec = b.page_section || 'after_books';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(b);
        });
        for (const [sec, items] of Object.entries(groups)) {
            const container = document.getElementById('home-banner-' + sec);
            if (!container) continue;
            container.style.padding = '0 ' + padding + 'px';
            container.innerHTML = items.map(b => {
                const onclick = b.link ? `onclick="openWebView('${b.link.replace(/'/g,"\\'")}');"` : '';
                return `<div class="overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform" style="border-radius:${radius}px;" ${onclick}>
                    <img src="${b.image}" class="w-full object-cover" style="max-height:${height}px;" alt="${b.title||''}">
                </div>`;
            }).join('');
        }
    } catch(e) {
        console.warn('Banners load error:', e);
    }
}

// ====================================================
// توابع کمکی
// ====================================================
function hideLoading() {
    const el = document.getElementById('loading-screen');
    if(!el) return;
    el.style.opacity='0';
    el.style.pointerEvents='none';
    setTimeout(()=> {
        el.classList.add('hidden');
        el.style.display = 'none';
    }, 500);
}

function loginDummy() {
    showToast('با موفقیت وارد شدید!');
    navToScreen('home');
}

// ====================================================
// بخش پرسش و پاسخ (QA)
// ====================================================
let qaUser = JSON.parse(localStorage.getItem('qa_user') || 'null');
let _notifPollingInterval = null;
function startNotifPolling() {
    if (_notifPollingInterval) return;
    loadNotifications();
    _notifPollingInterval = setInterval(loadNotifications, 5000);
}
let qaTickets = [];

function showQAAuth() {
    const el = document.getElementById('qa-auth');
    el.classList.remove('hidden'); el.classList.add('flex');
}
function hideQAAuth() {
    const el = document.getElementById('qa-auth');
    el.classList.add('hidden'); el.classList.remove('flex');
}
function qaAuthTab(tab) {
    const isLogin = tab === 'login';
    const loginForm = document.getElementById('qa-auth-login');
    const regForm = document.getElementById('qa-auth-register');
    loginForm.classList.toggle('hidden', !isLogin); loginForm.classList.toggle('flex', isLogin);
    regForm.classList.toggle('hidden', isLogin); regForm.classList.toggle('flex', !isLogin);
    document.getElementById('qa-tab-login').className = `flex-1 py-2 rounded-lg text-sm font-bold transition ${isLogin ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`;
    document.getElementById('qa-tab-register').className = `flex-1 py-2 rounded-lg text-sm font-bold transition ${!isLogin ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`;
}
async function qaLogin() {
    const u = document.getElementById('qa-login-username').value.trim();
    const p = document.getElementById('qa-login-password').value;
    if (!u || !p) { showToast('نام کاربری و رمز عبور را وارد کنید'); return; }
    try {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) });
        const d = await r.json();
        if (r.ok && d.success) {
            qaUser = { id: d.id, username: d.username };
            localStorage.setItem('qa_user', JSON.stringify(qaUser));
            hideQAAuth(); updateQAUserUI(); renderQATickets();
            showToast('خوش آمدید ' + d.username);
            startNotifPolling();
        } else { showToast(d.error || 'نام کاربری یا رمز عبور اشتباه است'); }
    } catch(e) { showToast('خطا در اتصال به سرور'); }
}
async function qaRegister() {
    const u = document.getElementById('qa-reg-username').value.trim();
    const p = document.getElementById('qa-reg-password').value;
    const p2 = document.getElementById('qa-reg-password2').value;
    if (!u || !p) { showToast('نام کاربری و رمز عبور را وارد کنید'); return; }
    if (p !== p2) { showToast('رمز عبور و تکرار آن یکسان نیستند'); return; }
    try {
        const r = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) });
        const d = await r.json();
        if (r.ok && d.success) {
            document.getElementById('qa-login-username').value = u;
            document.getElementById('qa-login-password').value = p;
            qaAuthTab('login');
            await qaLogin();
        } else { showToast(d.error || 'خطا در ثبت‌نام'); }
    } catch(e) { showToast('خطا در اتصال به سرور'); }
}
function qaLogout() {
    qaUser = null; qaTickets = [];
    localStorage.removeItem('qa_user');
    updateQAUserUI(); showQAAuth();
    showToast('از حساب کاربری خارج شدید');
}
function updateQAUserUI() {
    const loggedIn = !!qaUser;
    const badge = document.getElementById('qa-username-badge');
    const logoutBtn = document.getElementById('qa-logout-btn');
    const newBtn = document.getElementById('qa-new-btn');
    if (badge) { badge.textContent = qaUser ? qaUser.username : ''; badge.classList.toggle('hidden', !loggedIn); }
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);
    if (newBtn) newBtn.classList.toggle('hidden', !loggedIn);
}

function showQAForm() {
    if (!qaUser) { showQAAuth(); return; }
    const f = document.getElementById('qa-form');
    f.classList.remove('hidden'); f.classList.add('flex');
}
function hideQAForm() {
    const f = document.getElementById('qa-form');
    f.classList.add('hidden'); f.classList.remove('flex');
}
async function submitQATicket() {
    if (!qaUser) { showQAAuth(); return; }
    const subject = document.getElementById('qa-subject').value.trim();
    const message = document.getElementById('qa-message').value.trim();
    if (!subject || !message) { showToast('موضوع و متن سوال الزامی است'); return; }
    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: {'Content-Type':'application/json', 'x-user-id': String(qaUser.id)},
            body: JSON.stringify({subject, message})
        });
        const d = await res.json();
        if (res.ok && d.success) {
            document.getElementById('qa-subject').value = '';
            document.getElementById('qa-message').value = '';
            hideQAForm(); showToast('سوال شما ارسال شد');
            renderQATickets();
        } else { showToast(d.error || 'خطا در ارسال'); }
    } catch(e) { showToast('خطا در اتصال به سرور'); }
}

async function renderQATickets() {
    const c = document.getElementById('qa-tickets-list');
    if (!c) return;
    if (!qaUser) { showQAAuth(); return; }
    c.innerHTML = `<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div></div>`;
    try {
        const res = await fetch('/api/tickets', { headers: {'x-user-id': String(qaUser.id)} });
        if (res.status === 401) { qaLogout(); return; }
        const tickets = await res.json();
        qaTickets = Array.isArray(tickets) ? tickets : [];
        if (!qaTickets.length) {
            c.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-comments text-5xl mb-4 opacity-30"></i><p class="text-sm font-bold mb-2">هنوز سوالی ارسال نشده</p><p class="text-xs opacity-70">از دکمه «سوال جدید» استفاده کنید</p></div>`;
            return;
        }
        const statusMap = { open:{text:'در انتظار پاسخ',cls:'bg-blue-50 text-blue-600'}, answered:{text:'پاسخ داده شد',cls:'bg-green-50 text-green-600'}, closed:{text:'بسته شد',cls:'bg-gray-100 text-gray-500'} };
        c.innerHTML = qaTickets.map(t => {
            const s = statusMap[t.status] || statusMap.open;
            const date = toFa(new Date(t.updated_at).toLocaleDateString('fa-IR'));
            return `<div onclick="openQAConversation(${t.id},'${t.subject.replace(/'/g,"\\'")}')" class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition">
                <div class="flex items-start justify-between mb-2">
                    <h4 class="font-bold text-sm text-gray-800 flex-1 ml-2">${t.subject}</h4>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${s.cls}">${s.text}</span>
                </div>
                <p class="text-xs text-gray-500 mb-3 line-clamp-2">${t.first_message || ''}</p>
                <div class="flex items-center justify-between text-[10px] text-gray-400">
                    <span><i class="far fa-calendar ml-1"></i>${date}</span>
                    <span class="flex items-center gap-1"><i class="fas fa-chevron-left text-[8px]"></i>تیکت #${t.id}</span>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        c.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">خطا در بارگذاری سوالات</div>`;
    }
}

let activeQATicketId = null;

async function openQAConversation(ticketId, subject) {
    activeQATicketId = ticketId;
    document.getElementById('qa-conv-title').textContent = subject;
    document.getElementById('qa-conv-status').textContent = '';
    const conv = document.getElementById('qa-conversation');
    conv.classList.remove('hidden');
    conv.classList.add('flex');
    await loadQAConversationMessages(ticketId);
}

async function sendQAConvMessage() {
    const inp = document.getElementById('qa-conv-input');
    const t = inp.value.trim();
    if (!t || !activeQATicketId || !qaUser) return;
    inp.value = '';
    try {
        const r = await fetch('/api/tickets/' + activeQATicketId + '/messages', {
            method: 'POST',
            headers: {'Content-Type':'application/json','x-user-id': String(qaUser.id)},
            body: JSON.stringify({text: t})
        });
        const d = await r.json();
        if (r.ok && d.success) {
            await loadQAConversationMessages(activeQATicketId);
        } else {
            showToast(d.error || 'خطا در ارسال پیام');
            if (d.error && d.error.includes('حداکثر')) {
                document.getElementById('qa-conv-reply').classList.add('hidden');
                document.getElementById('qa-conv-limit-msg').classList.remove('hidden');
            }
        }
    } catch(e) { showToast('خطا در اتصال'); }
}

function closeQAConversation() {
    activeQATicketId = null;
    const conv = document.getElementById('qa-conversation');
    conv.classList.add('hidden');
    conv.classList.remove('flex');
    refreshAllTicketStatuses();
}

async function refreshQAConversation() {
    if (activeQATicketId) await loadQAConversationMessages(activeQATicketId);
}

function renderMsgBubble(text, senderType, timeStr) {
    const isAdmin = senderType === 'admin';
    return `<div class="flex ${isAdmin ? 'justify-start' : 'justify-end'}">
        <div class="max-w-[80%] ${isAdmin ? 'bg-brand-50 border border-brand-100 text-brand-900' : 'bg-white border border-gray-200 text-gray-800'} px-4 py-3 rounded-2xl shadow-sm">
            ${isAdmin ? `<div class="text-[10px] font-black text-brand-600 mb-1"><i class="fas fa-user-shield ml-1"></i>پاسخ ادمین</div>` : ''}
            <p class="text-sm leading-relaxed">${text}</p>
            ${timeStr ? `<span class="text-[9px] text-gray-400 mt-1 block">${timeStr}</span>` : ''}
        </div>
    </div>`;
}

async function loadQAConversationMessages(ticketId) {
    const c = document.getElementById('qa-conv-messages');
    c.innerHTML = `<div class="flex justify-center py-8"><div class="w-8 h-8 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div></div>`;

    const localTicket = qaTickets.find(x => x.id == ticketId);

    try {
        const [ticketRes, msgsRes] = await Promise.all([
            fetch('/api/tickets/' + ticketId),
            fetch('/api/tickets/' + ticketId + '/messages')
        ]);

        let ticket = null, msgs = null;
        try { ticket = await ticketRes.json(); } catch(e) {}
        try { msgs = await msgsRes.json(); } catch(e) {}

        if (ticket && ticket.status) {
            if (localTicket) { localTicket.status = ticket.status; localStorage.setItem('qa_tickets', JSON.stringify(qaTickets)); }
            const statusMap = { open: 'در انتظار پاسخ', answered: 'پاسخ داده شد', closed: 'بسته شد' };
            document.getElementById('qa-conv-status').textContent = statusMap[ticket.status] || '';
        }

        if (Array.isArray(msgs) && msgs.length > 0) {
            c.innerHTML = msgs.map(m => renderMsgBubble(m.text, m.sender_type, new Date(m.created_at).toLocaleString('fa-IR'))).join('');
            c.scrollTop = c.scrollHeight;
            const replyDiv = document.getElementById('qa-conv-reply');
            const limitMsg = document.getElementById('qa-conv-limit-msg');
            if (ticket && ticket.status === 'closed') {
                if(replyDiv) replyDiv.classList.add('hidden');
                if(limitMsg){ limitMsg.classList.remove('hidden'); limitMsg.textContent='این تیکت بسته شده است.'; }
            } else {
                let consecutiveUser = 0;
                for(let i = msgs.length-1; i>=0; i--){ if(msgs[i].sender_type==='user') consecutiveUser++; else break; }
                if (consecutiveUser >= 2) {
                    if(replyDiv) replyDiv.classList.add('hidden');
                    if(limitMsg) limitMsg.classList.remove('hidden');
                } else {
                    if(replyDiv) replyDiv.classList.remove('hidden');
                    if(limitMsg) limitMsg.classList.add('hidden');
                }
            }
            return;
        }

        c.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">پیامی یافت نشد</div>`;
        const replyDiv = document.getElementById('qa-conv-reply');
        if (replyDiv && ticket && ticket.status !== 'closed') replyDiv.classList.remove('hidden');
    } catch(e) {
        c.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">خطا در دریافت پیام‌ها</div>`;
    }
}

async function refreshAllTicketStatuses() { await renderQATickets(); }

// ====================================================
// اعلان‌ها
// ====================================================
let _notifications = [];

async function loadNotifications() {
    if (!qaUser) return;
    try {
        const r = await fetch('/api/notifications', { headers: {'x-user-id': String(qaUser.id)} });
        if (!r.ok) return;
        _notifications = await r.json();
        const unread = _notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) { if(unread>0){badge.classList.remove('hidden');}else{badge.classList.add('hidden');} }
    } catch(e) {}
}

function openNotifications() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.remove('hidden');
    renderNotifications();
    if (qaUser) loadNotifications();
}

function closeNotifications() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.add('hidden');
}

function renderNotifications() {
    const c = document.getElementById('notif-list');
    if (!c) return;
    if (!qaUser) {
        c.innerHTML = `<div class="text-center py-10 text-gray-400"><i class="fas fa-bell-slash text-4xl mb-3 opacity-30"></i><p class="text-sm font-bold">برای مشاهده اعلان‌ها وارد شوید</p><button onclick="closeNotifications();navToScreen('qa')" class="mt-4 bg-brand-600 text-white px-5 py-2 rounded-xl text-xs font-bold">ورود به حساب</button></div>`;
        return;
    }
    if (!_notifications.length) {
        c.innerHTML = `<div class="text-center py-10 text-gray-400"><i class="fas fa-bell text-4xl mb-3 opacity-30"></i><p class="text-sm font-bold">اعلانی وجود ندارد</p></div>`;
        return;
    }
    c.innerHTML = _notifications.map(n => `
        <div class="bg-${n.is_read?'gray-50 border-gray-100':'brand-50 border-brand-100'} border rounded-2xl p-4 cursor-pointer" onclick="markNotifRead(${n.id},this)">
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0"><i class="fas fa-${n.type==='ticket_reply'?'ticket-alt':'bullhorn'} text-brand-600 text-xs"></i></div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-sm text-gray-800">${n.title}</h4>
                        <p class="text-xs text-gray-600 mt-0.5 line-clamp-2">${n.message}</p>
                    </div>
                </div>
                ${!n.is_read?'<span class="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1.5"></span>':''}
            </div>
            <span class="text-[10px] text-gray-400 mt-2 block">${new Date(n.created_at).toLocaleString('fa-IR')}</span>
        </div>
    `).join('');
}

function markNotifRead(id, el) {
    if (!qaUser) return;
    const n = _notifications.find(x=>x.id===id);
    if (n) n.is_read = 1;
    renderNotifications();
    fetch('/api/notifications/read', {method:'POST',headers:{'Content-Type':'application/json','x-user-id':String(qaUser.id)},body:JSON.stringify({notification_id:id})}).catch(()=>{});
    const badge = document.getElementById('notif-badge');
    const unread = _notifications.filter(n => !n.is_read).length;
    if (badge && unread===0) badge.classList.add('hidden');
}

async function markAllNotifsRead() {
    if (!qaUser) return;
    try {
        await fetch('/api/notifications/read-all', {method:'POST',headers:{'x-user-id':String(qaUser.id)}});
        _notifications.forEach(n=>n.is_read=1);
        renderNotifications();
        const badge = document.getElementById('notif-badge');
        if (badge) badge.classList.add('hidden');
    } catch(e) {}
}

// ====================================================
// جستجوی کلی
// ====================================================
function openGlobalSearch() {
    const m = document.getElementById('global-search-modal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); document.getElementById('global-search-input').focus(); }
}
function closeGlobalSearch() {
    const m = document.getElementById('global-search-modal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}
async function performGlobalSearch() {
    const q = document.getElementById('global-search-input').value.trim();
    if (!q) return;
    const c = document.getElementById('global-search-results');
    c.innerHTML = `<div class="flex justify-center py-10"><div class="w-8 h-8 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div></div>`;
    try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await r.json();
        let html = '';
        if (data.books && data.books.length) {
            html += `<h3 class="text-xs font-black text-gray-500 mb-2 px-1"><i class="fas fa-book ml-1 text-brand-600"></i>کتاب‌های مرتبط</h3>`;
            html += data.books.map(b => `<button onclick="closeGlobalSearch();openBook(${b.id})" class="w-full text-right p-3 bg-white rounded-xl border border-gray-100 hover:bg-brand-50 transition shadow-sm flex items-center gap-3 mb-2">
                ${b.cover?`<img src="${b.cover}" class="w-10 h-14 rounded-lg object-cover shrink-0">`:`<div class="w-10 h-14 bg-brand-50 rounded-lg flex items-center justify-center shrink-0"><i class="fas fa-book text-brand-300 text-sm"></i></div>`}
                <div class="text-right min-w-0">
                    <h4 class="font-bold text-sm text-gray-800 mb-0.5 line-clamp-1">${b.title}</h4>
                    <p class="text-xs text-gray-400">${b.author||'ناشناس'}</p>
                </div>
            </button>`).join('');
        }
        if (data.pages && data.pages.length) {
            html += `<h3 class="text-xs font-black text-gray-500 mb-2 mt-4 px-1"><i class="fas fa-file-alt ml-1 text-emerald-600"></i>یافت شده در متن کتاب‌ها</h3>`;
            html += data.pages.map(p => `<button onclick="closeGlobalSearch();openBook(${p.bookId})" class="w-full text-right p-3 bg-white rounded-xl border border-gray-100 hover:bg-emerald-50 transition shadow-sm mb-2 block">
                <div class="flex items-center gap-2 mb-1">
                    ${p.bookCover?`<img src="${p.bookCover}" class="w-7 h-10 rounded object-cover shrink-0">`:`<div class="w-7 h-10 bg-emerald-50 rounded flex items-center justify-center shrink-0"><i class="fas fa-book text-emerald-300 text-xs"></i></div>`}
                    <div class="text-right min-w-0">
                        <span class="font-bold text-xs text-emerald-700">${p.bookTitle}</span>
                        ${p.pageName?`<span class="block text-[10px] text-gray-400">${p.pageName}</span>`:''}
                    </div>
                </div>
                <p class="text-xs text-gray-600 text-right leading-5 line-clamp-2 pr-1">${p.snippet}...</p>
            </button>`).join('');
        }
        if (!html) html = `<div class="text-center py-12 text-gray-400"><i class="fas fa-search text-4xl mb-3 opacity-30"></i><p class="text-sm font-bold">نتیجه‌ای برای «${q}» یافت نشد</p></div>`;
        c.innerHTML = html;
    } catch(e) {
        c.innerHTML = `<div class="text-center py-12 text-red-400"><i class="fas fa-exclamation-circle text-3xl mb-3"></i><p class="text-sm font-bold">خطا در جستجو</p></div>`;
    }
}

// ====================================================
// Event Listeners و راه‌اندازی
// ====================================================
document.addEventListener('DOMContentLoaded',()=>{
    const si=document.getElementById('search-input');if(si)si.addEventListener('keypress',e=>{if(e.key==='Enter')performSearch();});
    const gsi=document.getElementById('global-search-input');if(gsi)gsi.addEventListener('keypress',e=>{if(e.key==='Enter')performGlobalSearch();});
    const slider=document.getElementById('page-slider');if(slider)slider.addEventListener('input',e=>goToPage(parseInt(e.target.value)));
    setupSwipe();

    // selectionchange: روش یکپارچه برای دسکتاپ و موبایل
    let _selChangeTimer = null;
    let _lastTouchEnd = 0;
    const _isMobile = window.matchMedia('(pointer: coarse)').matches;

    document.addEventListener('touchend', () => { _lastTouchEnd = Date.now(); });

    document.addEventListener('selectionchange', () => {
        clearTimeout(_selChangeTimer);
        _selChangeTimer = setTimeout(() => {
            const tb = document.getElementById('highlight-toolbar');
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                if (tb && tb.contains(document.activeElement)) return;
                hideHighlightToolbar();
                return;
            }
            const container = getHighlightContainer(sel.anchorNode);
            if (!container) { hideHighlightToolbar(); return; }
            const r = sel.getRangeAt(0).getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            // موبایل: فقط بعد از touchend نشون بده (نه حین drag)
            if (_isMobile && Date.now() - _lastTouchEnd > 800) return;
            showHighlightToolbar(r.left + r.width / 2, r.top, _isMobile);
        }, _isMobile ? 400 : 50);
    });
    // کلیک/تاچ خارج از toolbar → بستن
    document.addEventListener('mousedown', (e) => {
        const tb = document.getElementById('highlight-toolbar');
        if (tb && !tb.contains(e.target)) hideHighlightToolbar();
    });
});

// ====================================================
// مدیریت دکمه Back اندروید / مرورگر
// ====================================================
function _isVisible(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    return !el.classList.contains('hidden') && el.style.display !== 'none';
}
function _hasClass(id, cls) {
    const el = document.getElementById(id);
    return el ? el.classList.contains(cls) : false;
}

// stack داخلی ناوبری
let _screenStack = ['home'];

const _origNavToScreen = navToScreen;
function navToScreen(name) {
    _origNavToScreen(name);
    // اضافه به stack (اگه دوبار همون صفحه نزده باشیم)
    if (_screenStack[_screenStack.length - 1] !== name) {
        _screenStack.push(name);
        if (_screenStack.length > 10) _screenStack.shift();
    }
}

function handleBackButton() {
    // لایه‌ها به ترتیب z-index از بالا به پایین
    if (_isVisible('pwa-install-modal'))    { closePwaModal();      return; }
    if (_isVisible('image-modal'))          { closeImageModal();    return; }
    if (_isVisible('webview-modal'))        { closeWebview();       return; }
    if (_isVisible('notif-panel'))          { closeNotifications(); return; }
    if (_isVisible('global-search-modal'))  { closeGlobalSearch();  return; }
    if (_isVisible('note-modal'))           { closeNoteModal();     return; }
    if (_isVisible('search-modal'))         { closeSearch();        return; }
    if (_isVisible('settings-overlay'))     { closeSettings();      return; }
    if (_hasClass('reader-overlay', 'open')){ closeReader();        return; }
    if (_hasClass('toc-overlay', 'open'))   { closeToc();           return; }

    const singleViews = ['lectures-single-view','news-single-view','statements-single-view'];
    for (const id of singleViews) {
        if (_isVisible(id)) { document.getElementById(id).classList.add('hidden'); return; }
    }
    if (_isVisible('qa-conversation-view')) { closeQAConversation(); return; }

    // برگشت به صفحه قبلی در stack
    if (_screenStack.length > 1) {
        _screenStack.pop();
        const prev = _screenStack[_screenStack.length - 1];
        _origNavToScreen(prev); // مستقیم بدون push مجدد به stack
        return;
    }

    // اگه روی home هستیم و هیچ لایه‌ای باز نیست → برو home (نمایش بده)
    _origNavToScreen('home');
}

document.addEventListener('DOMContentLoaded', () => {
    // یک state اضافه تا back button در مرورگر/اندروید interceptشه
    history.pushState({ pwaApp: true }, document.title, location.href);
});

window.addEventListener('popstate', () => {
    // بلافاصله state رو برگردون تا back بعدی هم کار کنه
    history.pushState({ pwaApp: true }, document.title, location.href);
    handleBackButton();
});

init();

// ====================================================
// PWA Service Worker + Push Notifications
// ====================================================
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered');
        window._swReg = reg;
        if (qaUser) { setTimeout(() => subscribeToPush(reg), 2000); }
    } catch(e) { console.warn('SW registration failed:', e); }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
    return output;
}

async function subscribeToPush(reg) {
    if (!reg || !('pushManager' in reg)) return;
    if (!qaUser) return;
    try {
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
        const keyRes = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await keyRes.json();
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': qaUser.id },
            body: JSON.stringify({ subscription: sub })
        });
        console.log('Push subscribed');
    } catch(e) { console.warn('Push subscribe failed:', e); }
}

registerServiceWorker();

// ====================================================
// PWA Install Prompt
// ====================================================
let _pwaInstallPrompt = null;
const _isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const _isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

function _showInstallBtn() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.remove('hidden');
}

// نمایش دکمه اگر standalone نباشد
if (!_isStandalone) {
    document.addEventListener('DOMContentLoaded', _showInstallBtn);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _pwaInstallPrompt = e;
    _showInstallBtn();
});

window.addEventListener('appinstalled', () => {
    _pwaInstallPrompt = null;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.add('hidden');
});

function showPwaInstallPrompt() {
    if (_isStandalone) return;
    if (_pwaInstallPrompt) {
        // Chrome / Android / Edge - نصب مستقیم
        _pwaInstallPrompt.prompt();
        _pwaInstallPrompt.userChoice.then(() => { _pwaInstallPrompt = null; });
    } else if (_isIos) {
        // iOS Safari - راهنمای دستی
        const modal = document.getElementById('pwa-install-modal');
        const iosGuide = document.getElementById('pwa-ios-guide');
        if (modal && iosGuide) { modal.classList.remove('hidden'); iosGuide.classList.remove('hidden'); }
    } else {
        // سایر مرورگرها
        const modal = document.getElementById('pwa-install-modal');
        const genericGuide = document.getElementById('pwa-generic-guide');
        if (modal && genericGuide) { modal.classList.remove('hidden'); genericGuide.classList.remove('hidden'); }
    }
}

function closePwaModal() {
    const modal = document.getElementById('pwa-install-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('pwa-ios-guide')?.classList.add('hidden');
        document.getElementById('pwa-generic-guide')?.classList.add('hidden');
    }
}

// ====================================================
// تم کلی سایت (دارک / لایت)
// ====================================================
let globalTheme = localStorage.getItem('globalTheme') || 'light';

function applyGlobalTheme(theme) {
    globalTheme = theme;
    if (theme === 'dark') {
        document.body.classList.add('global-dark');
        const icon = document.getElementById('global-theme-icon');
        if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
    } else {
        document.body.classList.remove('global-dark');
        const icon = document.getElementById('global-theme-icon');
        if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
    }
    localStorage.setItem('globalTheme', theme);
}

function toggleGlobalTheme() { applyGlobalTheme(globalTheme === 'dark' ? 'light' : 'dark'); }

applyGlobalTheme(globalTheme);
