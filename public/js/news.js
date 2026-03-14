// ====================================================
// موتور اخبار (News)
// ====================================================
let newsState = { view: 'main', currentCat: { id: null, name: '' } };
let cachedNewsPosts = [];
const NEWS_CAT_NAMES = ['اخبار', 'خبر', 'news'];

function setNewsLoading(show) {
    const el = document.getElementById('news-loading');
    if (!el) return;
    if (show) { el.classList.remove('hidden'); el.classList.add('flex'); }
    else { el.classList.add('hidden'); el.classList.remove('flex'); }
}

async function initNews() { showNewsAllPosts(); }

async function showNewsAllPosts() {
    newsState.view = 'posts';
    newsState.currentCat = { id: null, name: 'اخبار' };
    document.getElementById('news-header-title').textContent = 'اخبار';
    document.getElementById('news-categories-view').classList.add('hidden');
    document.getElementById('news-single-view').classList.add('hidden');
    const postsView = document.getElementById('news-posts-view');
    postsView.classList.remove('hidden'); postsView.classList.add('flex');
    if (cachedNewsPosts.length > 0) { postsView.innerHTML = renderWPPostsList(cachedNewsPosts, 'news'); return; }
    postsView.innerHTML = '';
    setNewsLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?_embed=1&per_page=50`);
        cachedNewsPosts = await res.json();
        postsView.innerHTML = renderWPPostsList(cachedNewsPosts, 'news');
    } catch(e) {
        postsView.innerHTML = `<div class="text-center py-12 text-gray-400 text-sm font-bold">خطا در دریافت اطلاعات</div>`;
    }
    setNewsLoading(false);
}

function showNewsMain() {
    newsState.view = 'main';
    document.getElementById('news-header-title').textContent = 'اخبار';
    document.getElementById('btn-news-settings').classList.add('hidden');
    const catView = document.getElementById('news-categories-view');
    const postsView = document.getElementById('news-posts-view');
    const singleView = document.getElementById('news-single-view');
    catView.classList.remove('hidden');
    postsView.classList.add('hidden'); postsView.classList.remove('flex');
    singleView.classList.add('hidden'); singleView.classList.remove('flex');

    let cats = allWPCats.filter(c => NEWS_CAT_NAMES.some(n => c.name.trim().includes(n)) && c.count > 0);
    if (cats.length === 0) cats = allWPCats.filter(c => c.parent === 0 && c.count > 0).slice(0, 6);
    catView.innerHTML = cats.length > 0
        ? renderWPCatGrid(cats, 'news')
        : `<div class="col-span-2 text-center py-10 text-gray-400 text-sm font-bold">دسته‌بندی اخبار یافت نشد</div>`;
}

async function showNewsPosts(catId, catName) {
    newsState.view = 'posts';
    newsState.currentCat = { id: catId, name: catName };
    document.getElementById('news-header-title').textContent = catName;
    document.getElementById('news-categories-view').classList.add('hidden');
    document.getElementById('news-single-view').classList.add('hidden');
    const postsView = document.getElementById('news-posts-view');
    postsView.classList.remove('hidden'); postsView.classList.add('flex');
    postsView.innerHTML = '';
    setNewsLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?categories=${catId}&_embed=1&per_page=30`);
        cachedNewsPosts = await res.json();
        postsView.innerHTML = renderWPPostsList(cachedNewsPosts, 'news');
    } catch(e) {
        postsView.innerHTML = `<div class="text-center py-12 text-gray-400 text-sm font-bold">خطا در دریافت اطلاعات</div>`;
    }
    setNewsLoading(false);
}

function showNewsSingle(postId) {
    const post = cachedNewsPosts.find(p => p.id === postId);
    if (!post) return;
    newsState.view = 'single';
    const screen = document.getElementById('screen-news');
    if (screen) screen.classList.add('reading-mode');
    document.getElementById('news-header-title').textContent = post.title.rendered.replace(/<[^>]*>/g,'');
    document.getElementById('btn-news-settings').classList.remove('hidden');
    document.getElementById('news-posts-view').classList.add('hidden');
    document.getElementById('news-posts-view').classList.remove('flex');
    const sv = document.getElementById('news-single-view');
    sv.classList.remove('hidden'); sv.classList.add('flex');
    renderWPSingle(post, 'news');
}

function newsNavBack() {
    if (newsState.view === 'single') {
        const screen = document.getElementById('screen-news');
        if (screen) screen.classList.remove('reading-mode');
        showNewsAllPosts();
    }
    else navToScreen('home');
}

// ====================================================
// موتور بیانیه‌ها (Statements)
// ====================================================
let statementsState = { view: 'main', currentCat: { id: null, name: '' } };
let cachedStatementsPosts = [];
const STATEMENTS_CAT_NAMES = ['بیانیه', 'اطلاعیه', 'بیانیه‌ها'];

function setStatementsLoading(show) {
    const el = document.getElementById('statements-loading');
    if (!el) return;
    if (show) { el.classList.remove('hidden'); el.classList.add('flex'); }
    else { el.classList.add('hidden'); el.classList.remove('flex'); }
}

async function initStatements() { showStatementsAllPosts(); }

async function showStatementsAllPosts() {
    statementsState.view = 'posts';
    statementsState.currentCat = { id: null, name: 'بیانیه‌ها' };
    document.getElementById('statements-header-title').textContent = 'بیانیه‌ها';
    document.getElementById('btn-statements-settings').classList.add('hidden');
    document.getElementById('statements-categories-view').classList.add('hidden');
    document.getElementById('statements-single-view').classList.add('hidden');
    const postsView = document.getElementById('statements-posts-view');
    postsView.classList.remove('hidden'); postsView.classList.add('flex');
    if (cachedStatementsPosts.length > 0) { postsView.innerHTML = renderWPPostsList(cachedStatementsPosts, 'statements'); return; }
    postsView.innerHTML = '';
    setStatementsLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?_embed=1&per_page=50`);
        cachedStatementsPosts = await res.json();
        postsView.innerHTML = renderWPPostsList(cachedStatementsPosts, 'statements');
    } catch(e) {
        postsView.innerHTML = `<div class="text-center py-12 text-gray-400 text-sm font-bold">خطا در دریافت اطلاعات</div>`;
    }
    setStatementsLoading(false);
}

function showStatementsMain() {
    statementsState.view = 'main';
    document.getElementById('statements-header-title').textContent = 'بیانیه‌ها';
    document.getElementById('btn-statements-settings').classList.add('hidden');
    const catView = document.getElementById('statements-categories-view');
    const postsView = document.getElementById('statements-posts-view');
    const singleView = document.getElementById('statements-single-view');
    catView.classList.remove('hidden');
    postsView.classList.add('hidden'); postsView.classList.remove('flex');
    singleView.classList.add('hidden'); singleView.classList.remove('flex');

    let cats = allWPCats.filter(c => STATEMENTS_CAT_NAMES.some(n => c.name.trim().includes(n)) && c.count > 0);
    if (cats.length === 0) cats = allWPCats.filter(c => c.parent === 0 && c.count > 0).slice(0, 6);
    catView.innerHTML = cats.length > 0
        ? renderWPCatGrid(cats, 'statements')
        : `<div class="col-span-2 text-center py-10 text-gray-400 text-sm font-bold">دسته‌بندی بیانیه‌ها یافت نشد</div>`;
}

async function showStatementsPosts(catId, catName) {
    statementsState.view = 'posts';
    statementsState.currentCat = { id: catId, name: catName };
    document.getElementById('statements-header-title').textContent = catName;
    document.getElementById('statements-categories-view').classList.add('hidden');
    document.getElementById('statements-single-view').classList.add('hidden');
    const postsView = document.getElementById('statements-posts-view');
    postsView.classList.remove('hidden'); postsView.classList.add('flex');
    postsView.innerHTML = '';
    setStatementsLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?categories=${catId}&_embed=1&per_page=30`);
        cachedStatementsPosts = await res.json();
        postsView.innerHTML = renderWPPostsList(cachedStatementsPosts, 'statements');
    } catch(e) {
        postsView.innerHTML = `<div class="text-center py-12 text-gray-400 text-sm font-bold">خطا در دریافت اطلاعات</div>`;
    }
    setStatementsLoading(false);
}

function showStatementsSingle(postId) {
    const post = cachedStatementsPosts.find(p => p.id === postId);
    if (!post) return;
    statementsState.view = 'single';
    const screen = document.getElementById('screen-statements');
    if (screen) screen.classList.add('reading-mode');
    document.getElementById('statements-header-title').textContent = post.title.rendered.replace(/<[^>]*>/g,'');
    document.getElementById('btn-statements-settings').classList.remove('hidden');
    document.getElementById('statements-posts-view').classList.add('hidden');
    document.getElementById('statements-posts-view').classList.remove('flex');
    const sv = document.getElementById('statements-single-view');
    sv.classList.remove('hidden'); sv.classList.add('flex');
    renderWPSingle(post, 'statements');
}

function statementsNavBack() {
    if (statementsState.view === 'single') {
        const screen = document.getElementById('screen-statements');
        if (screen) screen.classList.remove('reading-mode');
        showStatementsAllPosts();
    }
    else navToScreen('home');
}

// ====================================================
// توابع مشترک WP برای اخبار و بیانیه‌ها
// ====================================================
function renderWPCatGrid(cats, screen) {
    const colors = ['text-amber-500 bg-amber-50', 'text-teal-500 bg-teal-50', 'text-blue-500 bg-blue-50', 'text-rose-500 bg-rose-50', 'text-purple-500 bg-purple-50', 'text-green-500 bg-green-50'];
    const onclickFn = screen === 'news' ? 'showNewsPosts' : 'showStatementsPosts';
    return cats.map((c, i) => {
        const safeName = c.name.replace(/'/g, "\\'");
        return `<div onclick="${onclickFn}(${c.id},'${safeName}')" class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition active:scale-95 text-center">
            <div class="w-14 h-14 ${colors[i % colors.length]} rounded-full flex items-center justify-center text-2xl shadow-sm"><i class="fas fa-folder-open"></i></div>
            <h3 class="font-bold text-xs text-gray-800 text-center line-clamp-2 leading-relaxed">${c.name}</h3>
            <span class="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">${toFa(c.count)} نوشته</span>
        </div>`;
    }).join('');
}

function renderWPPostsList(posts, screen) {
    if (!Array.isArray(posts) || posts.length === 0) return '<div class="text-center py-20 text-gray-400 text-sm font-bold">هیچ نوشته‌ای یافت نشد.</div>';
    const onclickFn = screen === 'news' ? 'showNewsSingle' : 'showStatementsSingle';
    return posts.map(post => {
        let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
        const date = toFa(new Date(post.date).toLocaleDateString('fa-IR'));
        return `<div onclick="${onclickFn}(${post.id})" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98]">
            ${imgUrl ? `<img src="${imgUrl}" class="w-20 h-20 rounded-xl object-contain bg-gray-100 shadow-sm shrink-0">` : `<div class="w-20 h-20 bg-brand-50 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-file-alt text-brand-300 text-2xl"></i></div>`}
            <div class="flex flex-col justify-center min-w-0">
                <h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug mb-2">${post.title.rendered}</h4>
                <span class="text-[10px] text-gray-400 font-medium"><i class="far fa-calendar ml-1"></i>${date}</span>
            </div>
        </div>`;
    }).join('');
}

function renderWPSingle(post, screen) {
    const media = extractMediaFromPost(post);
    let finalHtml = '';
    media.iframes.forEach(src => { finalHtml += `<div class="h_iframe-aparat_embed_frame mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-200"><span style="display: block;padding-top: 57%"></span><iframe scrolling="no" allowFullScreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${src}"></iframe></div>`; });
    media.videos.forEach(src => { finalHtml += `<video controls src="${src}" class="w-full rounded-2xl mb-6 shadow-sm bg-black"></video>`; });
    if (media.audios.length > 0) {
        finalHtml += `<div class="bg-brand-50/50 p-4 rounded-2xl mb-8 border border-brand-100">`;
        media.audios.forEach(src => { finalHtml += `<audio controls src="${src}" class="w-full h-11 mb-3"></audio>`; });
        finalHtml += `</div>`;
    }
    finalHtml += media.cleanHtml;

    const prefix = screen;
    document.getElementById(`${prefix}-single-title`).innerHTML = post.title.rendered;
    document.getElementById(`${prefix}-single-date`).textContent = toFa(new Date(post.date).toLocaleDateString('fa-IR'));
    document.getElementById(`${prefix}-single-content`).innerHTML = finalHtml;
    document.getElementById(`${prefix}-single-content`).style.fontSize = fontSize + 'px';
    convertDOMNumbers(document.getElementById(`${prefix}-single-content`));

    let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
    const imgC = document.getElementById(`${prefix}-single-image`);
    if (imgUrl) { imgC.classList.remove('hidden'); imgC.querySelector('img').src = imgUrl; }
    else { imgC.classList.add('hidden'); }
}
