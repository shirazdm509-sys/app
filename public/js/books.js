// ====================================================
// متغیرهای کتابخانه و کتاب‌خوان
// ====================================================
let allBooks=[], currentBookId=null, bookData=[], currentIndex=0;
let fontSize=16, currentTheme='light', currentFont='vazir', lineHeight=2.2;
let uiVisible=true, bookmarks=[], notes={};
let touchStartX=0, touchEndX=0;

// ====================================================
// رندر کتابخانه
// ====================================================
function renderLibrary() {
    const grid=document.getElementById('books-grid'), empty=document.getElementById('lib-empty'), count=document.getElementById('lib-count');
    const homeContainer=document.getElementById('home-books-container');
    if(!grid || !homeContainer || !empty) return;

    count.textContent = allBooks.length ? toFa(allBooks.length)+' عنوان کتاب' : '';
    if (!allBooks.length) {
        grid.innerHTML='';
        homeContainer.innerHTML='';
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        return;
    }
    empty.classList.add('hidden');
    empty.classList.remove('flex');

    const colors=['from-brand-600 to-brand-400','from-blue-600 to-sky-400','from-rose-600 to-pink-400','from-amber-500 to-orange-400','from-blue-900 to-blue-700'];

    const renderCard = (book, i, isHome=false) => {
        const saved=parseInt(localStorage.getItem('book_'+book.id+'_page')||'0');
        const progress=saved&&book.page_count?Math.round((saved/book.page_count)*100):0;
        const widthClass = isHome ? 'w-32 shrink-0 snap-center' : 'w-full';
        const offline = isBookOffline(book.id);

        // دکمه دانلود خارج از overflow-hidden قرار میگیره
        return `<div onclick="openBook(${book.id})" class="${widthClass} relative cursor-pointer book-card active:scale-95">
            <div class="rounded-xl overflow-hidden shadow-md border border-gray-100 mb-2 aspect-[3/4] max-h-28 book-cover-wrap">
                ${book.cover?`<img src="${book.cover}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:''}
                <div class="w-full h-full bg-gradient-to-br ${colors[i%colors.length]} flex items-center justify-center p-2" style="${book.cover?'display:none':''}"><span class="text-white text-center font-black text-[10px] leading-tight drop-shadow-md">${book.title}</span></div>
                ${progress>0?`<div class="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-1.5 py-1"><div class="w-full bg-white/20 rounded-full h-0.5 overflow-hidden"><div class="bg-brand-400 h-full rounded-full" style="width:${progress}%"></div></div><span class="text-[8px] text-white/90 mt-0.5 block">${progress}٪</span></div>`:''}
            </div>
            <button onclick="event.stopPropagation();toggleOfflineBook(${book.id})" id="dl-btn-${book.id}"
                class="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-20 ${offline ? 'bg-brand-500 text-white' : 'bg-white/90 text-gray-600'}"
                title="${offline ? 'حذف از حافظه آفلاین' : 'دانلود برای آفلاین'}">
                <i class="fas ${offline ? 'fa-check' : 'fa-download'} text-[10px]"></i>
            </button>
            <h3 class="book-title font-bold text-[13px] text-gray-800 truncate px-0.5 transition-all duration-200">${book.title}</h3>
            <p class="text-[10px] text-gray-400 px-0.5 mt-0.5">${book.author||'ناشناس'}</p>
        </div>`;
    };

    grid.innerHTML = allBooks.map((b,i)=>renderCard(b,i,false)).join('');
    homeContainer.innerHTML = allBooks.slice(0, 5).map((b,i)=>renderCard(b,i,true)).join('') +
        `<div class="shrink-0 w-4"></div>`;
}

async function openBook(bookId) {
    const ls=document.getElementById('loading-screen');
    ls.style.display='flex';
    ls.classList.remove('hidden');
    ls.style.opacity='1';
    try {
        let rows;
        const isOnline = navigator.onLine;
        const offlineData = await getOfflineBook(bookId).catch(() => null);

        if (!isOnline && offlineData) {
            // حالت آفلاین: بارگذاری از IndexedDB
            rows = offlineData.pages;
            showToast('بارگذاری از حافظه آفلاین');
        } else {
            // حالت آنلاین: دریافت از سرور
            const r = await fetch('/api/books/'+bookId+'/pages');
            try { rows = await r.json(); } catch(err) { throw new Error('پاسخ سرور نامعتبر است'); }
            if (!r.ok) throw new Error(rows.error || 'مشکل در ارتباط با سرور');
        }

        if (!Array.isArray(rows)) throw new Error('ساختار اطلاعات کتاب نامعتبر است');
        if (rows.length === 0) throw new Error('این کتاب هیچ محتوایی ندارد');

        currentBookId=bookId;
        bookData=rows.map((item,index)=>({
            index: index,
            name: item.name || 'بدون عنوان',
            text: item.text || '',
            season: item.season || 'بدون فصل'
        }));

        loadBookUserData();
        buildTOC();

        const slider=document.getElementById('page-slider');
        if(slider) slider.max=bookData.length-1;

        currentIndex=parseInt(localStorage.getItem('book_'+bookId+'_page')||'0');
        if(currentIndex>=bookData.length || isNaN(currentIndex)) currentIndex=0;

        const book=allBooks.find(b=>b.id == bookId);
        document.getElementById('toc-book-title').textContent=book?book.title:'کتاب';
        document.getElementById('book-main-title').textContent=book?book.title:'کتاب';

        hideLoading();
        openToc();
    } catch(e) {
        console.error("Open Book Error:", e);
        hideLoading();
        showToast('خطا: ' + e.message);
    }
}

async function toggleOfflineBook(bookId) {
    if (isBookOffline(bookId)) {
        if (!confirm('این کتاب از حافظه آفلاین حذف شود؟')) return;
        await removeOfflineBook(bookId);
        updateDlBtn(bookId, false);
        showToast('کتاب از حافظه حذف شد');
    } else {
        const btn = document.getElementById('dl-btn-' + bookId);
        if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin text-[9px]"></i>'; btn.disabled = true; }
        try {
            const pageCount = await downloadBookForOffline(bookId, (pct, msg) => {
                if (btn) btn.title = msg;
            });
            updateDlBtn(bookId, true);
            showToast(`کتاب ذخیره شد (${toFa(pageCount)} صفحه)`);
        } catch(e) {
            if (btn) { btn.disabled = false; updateDlBtn(bookId, false); }
            showToast('خطا در دانلود: ' + e.message);
        }
    }
}

function updateDlBtn(bookId, downloaded) {
    const btn = document.getElementById('dl-btn-' + bookId);
    if (!btn) return;
    btn.disabled = false;
    btn.className = `absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-20 ${downloaded ? 'bg-brand-500 text-white' : 'bg-white/90 text-gray-600'}`;
    btn.title = downloaded ? 'حذف از حافظه آفلاین' : 'دانلود برای آفلاین';
    btn.innerHTML = `<i class="fas ${downloaded ? 'fa-check' : 'fa-download'} text-[10px]"></i>`;
}

// ====================================================
// TOC و کتاب‌خوان
// ====================================================
function openToc() {
    updateTocProgressUI();
    buildBookmarksTab();
    buildNotesTab();
    document.getElementById('toc-overlay').classList.add('open');
}
function closeToc() { document.getElementById('toc-overlay').classList.remove('open'); }
function openReader() { document.getElementById('reader-overlay').classList.add('open'); }
function closeReader() { document.getElementById('reader-overlay').classList.remove('open'); openToc(); }

function buildTOC() {
    const container=document.getElementById('main-toc-container'); if(!container||!bookData.length) return;
    let seasons={};
    bookData.forEach((p,i)=>{ const s=p.season||'بدون فصل'; if(!seasons[s]) seasons[s]=[]; seasons[s].push({...p,originalIndex:i}); });
    let html='';
    Object.keys(seasons).forEach(season=>{
        const pages=seasons[season];
        html+=`<div class="mb-2"><div class="flex items-center gap-2 mb-2 px-1"><i class="fas fa-folder text-brand-500 text-xs"></i><span class="text-xs font-bold text-gray-400 uppercase tracking-wider">${season}</span><span class="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">${toFa(pages.length)}</span></div>`;
        pages.forEach(p=>{ html+=`<button onclick="goToPage(${p.originalIndex})" class="w-full text-right px-4 py-3 bg-white hover:bg-brand-50 rounded-xl text-sm text-gray-700 transition mb-1 border border-gray-100 truncate shadow-sm"><span class="text-gray-300 text-xs ml-2">${toFa(p.originalIndex+1)}.</span> ${p.name}</button>`; });
        html+='</div>';
    });
    container.innerHTML=html;
}

function updateTocProgressUI() {
    if(!bookData.length) return;
    const pct=Math.round(((currentIndex+1)/bookData.length)*100);
    const bar=document.getElementById('toc-progress-bar'), text=document.getElementById('toc-progress-text'), info=document.getElementById('toc-page-info');
    if(bar) bar.style.width=pct+'%'; if(text) text.textContent=toFa(pct)+'٪'; if(info) info.textContent='صفحه '+toFa(currentIndex+1)+' از '+toFa(bookData.length);
}

function resumeReading() { if(bookData.length) goToPage(currentIndex); }

function switchTab(tab) {
    const tabs = ['toc', 'bookmarks', 'notes'];
    tabs.forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        const content = document.getElementById('tab-content-' + t);
        if(!btn || !content) return;
        if (t === tab) {
            btn.classList.add('bg-white', 'shadow-sm', 'text-brand-600');
            btn.classList.remove('text-gray-500');
            content.classList.remove('hidden');
            if (t === 'bookmarks') buildBookmarksTab();
            if (t === 'notes') buildNotesTab();
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-brand-600');
            btn.classList.add('text-gray-500');
            content.classList.add('hidden');
        }
    });
}

function goToPage(index) {
    if(index<0||index>=bookData.length) return;
    currentIndex=index; const page=bookData[currentIndex];
    let htmlText=page.text;
    if(!htmlText.includes('<p>')&&!htmlText.includes('<br>')) htmlText=htmlText.replace(/\n/g,'<br><br>');
    htmlText=htmlText.replace(/\[(\d+)\]/g,'<sup class="text-brand-600 font-bold mx-0.5">[$1]</sup>');
    let finalHTML=`<h2 class="text-3xl font-black mb-8 pb-4 border-b-2 border-brand-100 leading-snug">${page.name}</h2>`+htmlText;
    if(notes[currentIndex]) finalHTML+=`<div class="mt-12 pt-6 border-t border-dashed border-gray-300 bg-gray-50 p-4 rounded-2xl"><h3 class="text-sm font-bold text-gray-500 mb-2"><i class="fas fa-pen-alt ml-1"></i> یادداشت:</h3><p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${notes[currentIndex]}</p></div>`;
    const tc=document.getElementById('text-content');
    if(tc){tc.innerHTML=finalHTML;tc.style.fontSize=fontSize+'px';convertDOMNumbers(tc);}
    document.getElementById('header-title').textContent=page.name;
    document.getElementById('chapter-title').textContent=page.season||'';
    document.getElementById('page-counter').textContent=toFa(currentIndex+1)+' / '+toFa(bookData.length);
    const slider=document.getElementById('page-slider'); if(slider) slider.value=currentIndex;
    const cc=document.getElementById('content-container'); if(cc) cc.scrollTop=0;
    const bmi=document.getElementById('menu-bookmark-icon');
    if(bmi) bmi.className=bookmarks.includes(currentIndex)?'fas fa-bookmark ml-3 w-4 text-center text-brand-600':'far fa-bookmark ml-3 w-4 text-center';
    if(currentBookId) localStorage.setItem('book_'+currentBookId+'_page',currentIndex);
    closeToc(); openReader();
}

function nextPage(){goToPage(currentIndex-1);}
function prevPage(){goToPage(currentIndex+1);}

function toggleReaderUI(){
    const h=document.getElementById('reader-header'),f=document.getElementById('reader-footer');
    uiVisible=!uiVisible; h.classList.toggle('slide-up-hide',!uiVisible); f.classList.toggle('slide-down-hide',!uiVisible);
}

function setupSwipe(){
    const el=document.getElementById('content-container'); if(!el) return;
    el.addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0].screenX;},{passive:true});
    el.addEventListener('touchend',e=>{touchEndX=e.changedTouches[0].screenX;const d=touchStartX-touchEndX;if(Math.abs(d)>60){if(d>0)nextPage();else prevPage();}},{passive:true});
    el.addEventListener('click',()=>{if(window.getSelection().toString().length>0)return;toggleReaderUI();document.getElementById('page-action-menu').classList.add('hidden');});
}

// ====================================================
// نشان‌ها و یادداشت‌ها
// ====================================================
function loadBookUserData(){if(!currentBookId)return;bookmarks=JSON.parse(localStorage.getItem('book_'+currentBookId+'_bookmarks')||'[]');notes=JSON.parse(localStorage.getItem('book_'+currentBookId+'_notes')||'{}');}
function saveBookUserData(){if(!currentBookId)return;localStorage.setItem('book_'+currentBookId+'_bookmarks',JSON.stringify(bookmarks));localStorage.setItem('book_'+currentBookId+'_notes',JSON.stringify(notes));}
function toggleBookmark(){const idx=bookmarks.indexOf(currentIndex);if(idx>-1){bookmarks.splice(idx,1);showToast('نشان حذف شد');}else{bookmarks.push(currentIndex);showToast('نشان‌گذاری شد');}saveBookUserData();const bmi=document.getElementById('menu-bookmark-icon');if(bmi)bmi.className=bookmarks.includes(currentIndex)?'fas fa-bookmark ml-3 w-4 text-center text-brand-600':'far fa-bookmark ml-3 w-4 text-center';document.getElementById('page-action-menu').classList.add('hidden');}

function buildBookmarksTab(){
    const c=document.getElementById('bookmarks-container');if(!c)return;
    if(!bookmarks.length){
        c.innerHTML='<div class="text-center py-12"><i class="far fa-bookmark text-4xl text-gray-200 mb-3"></i><p class="text-gray-400 text-sm">هنوز نشانی اضافه نشده</p></div>';
        return;
    }
    c.innerHTML=bookmarks.sort((a,b)=>a-b).map(idx=>{
        const p=bookData[idx];if(!p)return'';
        return`<button onclick="goToPage(${idx})" class="w-full text-right px-4 py-3 bg-white hover:bg-brand-50 rounded-xl text-sm text-gray-700 transition mb-1 border border-gray-100 flex items-center shadow-sm"><i class="fas fa-bookmark text-brand-500 ml-3 text-xs"></i><span class="truncate">${p.name}</span><span class="text-xs text-gray-300 mr-auto">صفحه ${toFa(idx+1)}</span></button>`;
    }).join('');
}

function buildNotesTab() {
    const c = document.getElementById('notes-container'); if(!c) return;
    const noteKeys = Object.keys(notes).map(Number).sort((a,b) => a-b);
    if(!noteKeys.length){
        c.innerHTML='<div class="text-center py-12"><i class="far fa-sticky-note text-4xl text-gray-200 mb-3"></i><p class="text-gray-400 text-sm">هنوز یادداشتی اضافه نشده</p></div>';
        return;
    }
    c.innerHTML = noteKeys.map(idx => {
        const p = bookData[idx]; if(!p) return '';
        const noteText = notes[idx].length > 40 ? notes[idx].substring(0, 40) + '...' : notes[idx];
        return `<button onclick="goToPage(${idx})" class="w-full text-right px-4 py-3 bg-white hover:bg-brand-50 rounded-xl text-sm text-gray-700 transition mb-1 border border-gray-100 flex flex-col shadow-sm">
                    <div class="flex items-center w-full mb-2">
                        <i class="fas fa-pen-alt text-brand-500 ml-2 text-xs"></i>
                        <span class="font-bold truncate">${p.name}</span>
                        <span class="text-[10px] text-gray-300 mr-auto">صفحه ${toFa(idx+1)}</span>
                    </div>
                    <p class="text-xs text-gray-500 leading-relaxed text-right line-clamp-2">${noteText}</p>
                </button>`;
    }).join('');
}

function openNoteModal(){document.getElementById('page-action-menu').classList.add('hidden');document.getElementById('note-textarea').value=notes[currentIndex]||'';document.getElementById('note-modal').classList.remove('hidden');document.getElementById('note-modal').classList.add('flex');}
function closeNoteModal(){document.getElementById('note-modal').classList.add('hidden');document.getElementById('note-modal').classList.remove('flex');}
function saveNote(){const v=document.getElementById('note-textarea').value.trim();if(v)notes[currentIndex]=v;else delete notes[currentIndex];saveBookUserData();closeNoteModal();goToPage(currentIndex);showToast('یادداشت ذخیره شد');}

// ====================================================
// جستجوی داخل کتاب
// ====================================================
function openSearch(){document.getElementById('search-modal').classList.remove('hidden');document.getElementById('search-modal').classList.add('flex');document.getElementById('search-input').focus();}
function closeSearch(){document.getElementById('search-modal').classList.add('hidden');document.getElementById('search-modal').classList.remove('flex');}
function performSearch(){const q=document.getElementById('search-input').value.trim().toLowerCase();if(!q)return;const results=bookData.filter(p=>p.name.toLowerCase().includes(q)||p.text.toLowerCase().includes(q));const c=document.getElementById('search-results');if(!results.length){c.innerHTML='<div class="text-center py-12 text-gray-400"><p>نتیجه‌ای یافت نشد</p></div>';return;}c.innerHTML=results.map(p=>{const s=p.text.replace(/<[^>]*>/g,'').substring(0,100);return`<button onclick="goToPage(${p.index});closeSearch()" class="w-full text-right p-4 bg-white rounded-xl border border-gray-100 hover:bg-brand-50 transition shadow-sm"><h4 class="font-bold text-sm text-gray-800 mb-1">${p.name}</h4><p class="text-xs text-gray-400 line-clamp-2">${s}...</p></button>`;}).join('');}

// ====================================================
// تنظیمات خواندن
// ====================================================
function loadSettings() {
    fontSize = parseInt(localStorage.getItem('reader_fontSize') || '16');
    lineHeight = parseFloat(localStorage.getItem('reader_lineHeight') || '2.2');
    currentTheme = localStorage.getItem('reader_theme') || 'light';
    currentFont = localStorage.getItem('reader_font') || 'vazir';
    const sc = localStorage.getItem('reader_titleColor');
    if (sc) document.documentElement.style.setProperty('--title-color', sc);
    document.documentElement.style.setProperty('--line-height', lineHeight);
    applyTheme();
    applyFont();

    const tc = document.getElementById('text-content');
    if (tc) tc.style.fontSize = fontSize + 'px';
    ['single-post-content', 'news-single-content', 'statements-single-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.fontSize = fontSize + 'px';
    });
    document.getElementById('font-size-display').textContent = fontSize + 'px';
    document.getElementById('line-height-display').textContent = lineHeight.toFixed(1);
    applySiteSettings();
}

async function applySiteSettings() {
    try {
        const r = await fetch('/api/settings');
        if (!r.ok) return;
        const s = await r.json();
        const nameEl = document.querySelector('#screen-home header h1');
        const subEl = document.querySelector('#screen-home header h2');
        if (nameEl && s.site_name) nameEl.textContent = s.site_name;
        if (subEl && s.site_subtitle) subEl.textContent = s.site_subtitle;
        if (s.site_name) document.title = s.site_name;
        if (s.logo_url) {
            const logoWrapper = document.querySelector('#screen-home header .w-11');
            if (logoWrapper) logoWrapper.innerHTML = `<img src="${s.logo_url}" class="w-full h-full object-contain">`;
        }
        if (s.favicon_url) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = s.favicon_url;
        }
        if (s.primary_color) document.documentElement.style.setProperty('--brand-color', s.primary_color);
        const themeBtn = document.getElementById('global-theme-btn');
        if (themeBtn) {
            if (s.dark_mode_enabled === '0') themeBtn.style.display = 'none';
            else themeBtn.style.display = '';
        }
        window._siteSettings = s;
    } catch(e) {}
}

function openSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
    setTimeout(() => { document.getElementById('settings-overlay').style.opacity = '1'; }, 10);
    document.getElementById('settings-modal').style.transform = 'translateY(0)';
}

function closeSettings() {
    document.getElementById('settings-overlay').style.opacity = '0';
    document.getElementById('settings-modal').style.transform = 'translateY(100%)';
    setTimeout(() => { document.getElementById('settings-overlay').classList.add('hidden'); }, 300);
}

function setTheme(t) { currentTheme = t; localStorage.setItem('reader_theme', t); applyTheme(); }

function applyTheme() {
    ['reader-overlay', 'toc-overlay', 'screen-lectures', 'screen-news', 'screen-statements'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
        el.classList.add('theme-' + currentTheme);
    });
    ['light', 'sepia', 'dark'].forEach(t => {
        const b = document.getElementById('theme-btn-' + t);
        if (b) {
            b.classList.toggle('border-brand-500', t === currentTheme);
            b.classList.toggle('border-transparent', t !== currentTheme);
        }
    });
}

function setFont(f) { currentFont = f; localStorage.setItem('reader_font', f); applyFont(); }

function applyFont() {
    const tc = document.getElementById('text-content');
    if (tc) { tc.classList.remove('font-vazir', 'font-shabnam', 'font-tahoma'); tc.classList.add('font-' + currentFont); }
    const wpc = document.getElementById('single-post-content');
    if (wpc) { wpc.classList.remove('font-vazir', 'font-shabnam', 'font-tahoma'); wpc.classList.add('font-' + currentFont); }
    ['news-single-content', 'statements-single-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('font-vazir', 'font-shabnam', 'font-tahoma'); el.classList.add('font-' + currentFont); }
    });
    ['vazir', 'shabnam', 'tahoma'].forEach(f => {
        const b = document.getElementById('font-btn-' + f);
        if (!b) return;
        if (f === currentFont) {
            b.classList.add('bg-brand-50', 'shadow-sm', 'font-bold', 'text-brand-600', 'border', 'border-brand-200');
            b.classList.remove('text-gray-500', 'bg-white');
        } else {
            b.classList.remove('bg-brand-50', 'shadow-sm', 'font-bold', 'text-brand-600', 'border', 'border-brand-200');
            b.classList.add('text-gray-500', 'bg-white');
        }
    });
}

function changeFontSize(d) {
    fontSize = Math.max(14, Math.min(32, fontSize + d * 2));
    localStorage.setItem('reader_fontSize', fontSize);
    const tc = document.getElementById('text-content');
    if (tc) tc.style.fontSize = fontSize + 'px';
    ['single-post-content', 'news-single-content', 'statements-single-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.fontSize = fontSize + 'px';
    });
    document.getElementById('font-size-display').textContent = fontSize + 'px';
}

function changeLineHeight(d) {
    lineHeight = Math.max(1.0, Math.min(4.0, lineHeight + d));
    localStorage.setItem('reader_lineHeight', lineHeight);
    document.documentElement.style.setProperty('--line-height', lineHeight);
    document.getElementById('line-height-display').textContent = lineHeight.toFixed(1);
}

function setTitleColor(c) {
    document.documentElement.style.setProperty('--title-color', c);
    localStorage.setItem('reader_titleColor', c);
}

function togglePageMenu(){document.getElementById('page-action-menu').classList.toggle('hidden');}
function copyPageText(){const p=bookData[currentIndex];if(!p)return;navigator.clipboard.writeText(p.name+'\n\n'+p.text.replace(/<[^>]*>/g,'')).then(()=>showToast('متن کپی شد'));document.getElementById('page-action-menu').classList.add('hidden');}

// ====================================================
// هایلایت متن
// ====================================================
let highlightData = {};

function getHighlightKey() { return `hl_${currentBookId}_${currentIndex}`; }
function loadHighlights() { const k = getHighlightKey(); highlightData[k] = JSON.parse(localStorage.getItem(k) || '[]'); }
function saveHighlights() { const k = getHighlightKey(); localStorage.setItem(k, JSON.stringify(highlightData[k] || [])); }

const HIGHLIGHT_CONTAINERS = ['text-content', 'single-post-content', 'news-single-content', 'statements-single-content'];

// ذخیره selection روی موبایل (iOS selection را قبل از onclick پاک می‌کند)
let _savedRange = null;
function saveSelectionForMobile() {
    const sel = window.getSelection();
    _savedRange = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;
}
function restoreSelectionIfNeeded() {
    const sel = window.getSelection();
    if (sel && (sel.isCollapsed || sel.rangeCount === 0) && _savedRange) {
        sel.removeAllRanges();
        sel.addRange(_savedRange);
    }
}

function getHighlightContainer(node) {
    for (const id of HIGHLIGHT_CONTAINERS) {
        const el = document.getElementById(id);
        if (el && el.contains(node)) return el;
    }
    return null;
}

function applyHighlight(color) {
    restoreSelectionIfNeeded();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const tc = getHighlightContainer(range.commonAncestorContainer);
    if (!tc) return;

    const mark = document.createElement('mark');
    mark.style.backgroundColor = color;
    mark.style.borderRadius = '3px';
    mark.style.padding = '0 2px';
    mark.dataset.hlId = Date.now().toString();
    try {
        range.surroundContents(mark);
    } catch(e) {
        const frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
    }
    sel.removeAllRanges();
    hideHighlightToolbar();

    if (tc.id === 'text-content') {
        const k = getHighlightKey();
        if (!highlightData[k]) highlightData[k] = [];
        highlightData[k].push({ id: mark.dataset.hlId, color });
        saveHighlights();
    }
    showToast('هایلایت اعمال شد');
}

function removeHighlight() {
    restoreSelectionIfNeeded();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer.parentElement;
        if (container && container.tagName === 'MARK') {
            const parent = container.parentNode;
            while (container.firstChild) parent.insertBefore(container.firstChild, container);
            parent.removeChild(container);
        }
        sel.removeAllRanges();
    }
    hideHighlightToolbar();
    showToast('هایلایت حذف شد');
}

async function shareSelectedText() {
    restoreSelectionIfNeeded();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hideHighlightToolbar(); return; }
    const text = sel.toString().trim();
    if (!text) { hideHighlightToolbar(); return; }
    hideHighlightToolbar();
    sel.removeAllRanges();

    let title = document.title;
    const headerTitle = document.getElementById('lectures-header-title') ||
                        document.getElementById('news-header-title') ||
                        document.getElementById('statements-header-title');
    if (headerTitle && headerTitle.textContent.trim()) title = headerTitle.textContent.trim();

    const shareText = `«${text}»\n\n— ${title}`;

    if (navigator.share) {
        try { await navigator.share({ title, text: shareText }); return; }
        catch(e) { if (e.name === 'AbortError') return; }
    }

    try {
        await navigator.clipboard.writeText(shareText);
        showToast('متن کپی شد');
    } catch(e) {
        const ta = document.createElement('textarea');
        ta.value = shareText; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta); showToast('متن کپی شد');
    }
}

function showHighlightToolbar(x, y, isMobile = false) {
    const tb = document.getElementById('highlight-toolbar');
    if (!tb) return;
    saveSelectionForMobile();
    if (isMobile) {
        // موبایل: bottom bar ثابت پایین صفحه — تداخل با native menu نداره
        tb.style.left = '50%';
        tb.style.top = '';
        tb.style.bottom = '72px';
        tb.style.transform = 'translateX(-50%)';
    } else {
        // دسکتاپ: بالای selection
        tb.style.bottom = '';
        tb.style.transform = 'translateX(-50%)';
        requestAnimationFrame(() => {
            const tbH = tb.offsetHeight || 44;
            const tbW = tb.offsetWidth || 260;
            const clampedX = Math.max(tbW / 2 + 8, Math.min(x, window.innerWidth - tbW / 2 - 8));
            tb.style.left = clampedX + 'px';
            tb.style.top = Math.max(10, y - tbH - 10) + 'px';
        });
    }
    tb.classList.remove('hidden');
}

function hideHighlightToolbar() {
    const tb = document.getElementById('highlight-toolbar');
    if (tb) tb.classList.add('hidden');
}
