// ====================================================
// متغیرهای سخنرانی‌ها
// ====================================================
// همه درخواست‌های WP API از طریق سرور پروکسی می‌شوند (رفع CORS و مشکلات شبکه)
function wpFetch(path) {
    return fetch('/api/wp?path=' + encodeURIComponent(path));
}
let allWPCats = [];
let wpState = { view: 'main', mainCat: { id: null, name: '' }, currentCat: { id: null, name: '' } };
const TARGET_MAIN_CATS = ['تفسیر قرآن', 'محرم الحرام', 'مناسبت ها', 'رمضان المبارک'];
let cachedPosts = [];

// ====================================================
// توابع سخنرانی‌ها (WP)
// ====================================================
async function initWP(forceReset = false) {
    if (allWPCats.length === 0) await fetchWPCategories();
    else if (forceReset || wpState.view === 'main') showWPMainCategories();
}

function setWPLoading(show) {
    const loading = document.getElementById('lectures-loading');
    if(!loading) return;
    if (show) { loading.classList.remove('hidden'); loading.classList.add('flex'); }
    else { loading.classList.add('hidden'); loading.classList.remove('flex'); }
}

async function fetchWPCategories() {
    setWPLoading(true);
    const catView = document.getElementById('lectures-categories-view');
    try {
        const res = await wpFetch('categories?per_page=100');
        if (!res.ok) throw new Error('API ERROR');
        allWPCats = await res.json();
        if(!Array.isArray(allWPCats) || allWPCats.length === 0) return;
        showWPMainCategories();
    } catch (e) {
        catView.innerHTML = `<div class="col-span-2 flex flex-col items-center justify-center py-12 text-gray-400"><i class="fas fa-wifi text-4xl mb-3 opacity-50"></i><p class="text-sm font-bold">خطا در دریافت اطلاعات</p><button onclick="fetchWPCategories()" class="mt-4 bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold shadow-sm">تلاش مجدد</button></div>`;
    } finally { setWPLoading(false); }
}

function renderCategoryGrid(cats, isMainView = false) {
    if (cats.length === 0) return '<div class="col-span-2 text-center py-10 text-gray-500 font-bold text-sm">هیچ موردی یافت نشد.</div>';
    const colors = ['text-amber-500 bg-amber-50', 'text-teal-500 bg-teal-50', 'text-blue-500 bg-blue-50', 'text-rose-500 bg-rose-50', 'text-purple-500 bg-purple-50'];
    return cats.map((c, i) => {
        const colorCls = colors[i % colors.length];
        const safeName = c.name ? c.name.replace(/'/g, "\\'") : 'بدون نام';
        const isTargetMain = TARGET_MAIN_CATS.includes(c.name.trim());
        const countBadge = (isMainView || isTargetMain || c.count === 0) ? '' : `<span class="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">${toFa(c.count)} نوشته</span>`;
        return `<div onclick="handleCategoryClick(${c.id}, '${safeName}')" class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md hover:border-brand-100 transition active:scale-95 text-center"><div class="w-14 h-14 ${colorCls} rounded-full flex items-center justify-center text-2xl shadow-sm"><i class="fas fa-folder-open"></i></div><h3 class="font-bold text-xs text-gray-800 text-center line-clamp-2 leading-relaxed">${c.name}</h3>${countBadge}</div>`;
    }).join('');
}

function showWPMainCategories() {
    exitReadingMode();
    wpState.view = 'main';
    document.getElementById('lectures-header-title').textContent = 'سخنرانی‌ها';
    document.getElementById('lectures-posts-view').classList.add('hidden');
    document.getElementById('lectures-posts-view').classList.remove('flex');
    document.getElementById('lectures-single-view').classList.add('hidden');
    document.getElementById('lectures-single-view').classList.remove('flex');
    const catView = document.getElementById('lectures-categories-view');
    catView.classList.remove('hidden');

    let mainCats = allWPCats.filter(c => TARGET_MAIN_CATS.includes(c.name.trim()));
    if (mainCats.length === 0) mainCats = allWPCats.filter(c => c.parent === 0 && c.count > 0);
    catView.innerHTML = renderCategoryGrid(mainCats, true);
}

function handleCategoryClick(catId, catName) {
    const children = allWPCats.filter(c => c.parent === catId && c.count > 0);
    if (wpState.view === 'main') wpState.mainCat = { id: catId, name: catName };
    if (children.length > 0) showWPSubCategories(catId, catName, children);
    else showWPPostsView(catId, catName);
}

function showWPSubCategories(parentId, parentName, children) {
    exitReadingMode();
    wpState.view = 'sub';
    document.getElementById('lectures-header-title').textContent = parentName;
    document.getElementById('lectures-posts-view').classList.add('hidden');
    document.getElementById('lectures-posts-view').classList.remove('flex');
    document.getElementById('lectures-single-view').classList.add('hidden');
    document.getElementById('lectures-single-view').classList.remove('flex');
    const catView = document.getElementById('lectures-categories-view');
    catView.classList.remove('hidden');
    catView.innerHTML = renderCategoryGrid(children, false);
}

async function showWPPostsView(catId, catName) {
    exitReadingMode();
    wpState.view = 'posts';
    wpState.currentCat = { id: catId, name: catName };
    document.getElementById('lectures-categories-view').classList.add('hidden');
    document.getElementById('lectures-single-view').classList.add('hidden');
    document.getElementById('lectures-single-view').classList.remove('flex');
    const postsView = document.getElementById('lectures-posts-view');
    postsView.classList.remove('hidden');
    postsView.classList.add('flex');
    postsView.innerHTML = '';
    document.getElementById('lectures-header-title').textContent = catName;

    setWPLoading(true);
    try {
        const res = await wpFetch(`posts?categories=${catId}&_embed=1&per_page=30`);
        if (!res.ok) throw new Error('API ERROR');
        cachedPosts = await res.json();

        if(!Array.isArray(cachedPosts) || cachedPosts.length === 0) {
            postsView.innerHTML = `<div class="text-center py-20 text-gray-400 text-sm font-bold">هیچ نوشته‌ای در این بخش یافت نشد.</div>`;
        } else {
            postsView.innerHTML = cachedPosts.map(post => {
                let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
                const date = toFa(new Date(post.date).toLocaleDateString('fa-IR'));
                return `<div onclick="showWPSingleView(${post.id})" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98]">${imgUrl ? `<img src="${imgUrl}" class="w-20 h-20 rounded-xl object-contain bg-gray-100 shadow-sm shrink-0">` : `<div class="w-20 h-20 bg-brand-50 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-file-alt text-brand-300 text-2xl"></i></div>`}<div class="flex flex-col justify-center min-w-0"><h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug mb-2">${post.title.rendered}</h4><span class="text-[10px] text-gray-400 font-medium"><i class="far fa-calendar ml-1"></i>${date}</span></div></div>`;
            }).join('');
        }
    } catch (e) {
        postsView.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-400"><p class="text-sm font-bold">خطا در دریافت نوشته‌ها</p><button onclick="showWPPostsView(${catId}, '${catName}')" class="mt-4 bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold shadow-sm">تلاش مجدد</button></div>`;
    }
    setWPLoading(false);
}

function exitReadingMode() {
    const screen = document.getElementById('screen-lectures');
    if (screen) screen.classList.remove('reading-mode');
    const btnSet = document.getElementById('btn-lectures-settings');
    if (btnSet) btnSet.classList.add('hidden');
}

function showWPSingleView(postId) {
    const post = cachedPosts.find(p => p.id === postId);
    if (!post) return;

    wpState.view = 'single';
    const screen = document.getElementById('screen-lectures');
    if (screen) screen.classList.add('reading-mode');
    const btnSet = document.getElementById('btn-lectures-settings');
    if (btnSet) btnSet.classList.remove('hidden');

    document.getElementById('lectures-categories-view').classList.add('hidden');
    document.getElementById('lectures-posts-view').classList.remove('flex');
    document.getElementById('lectures-posts-view').classList.add('hidden');

    const singleView = document.getElementById('lectures-single-view');
    singleView.classList.remove('hidden');
    singleView.classList.add('flex');

    const tempTitle = document.createElement('div');
    tempTitle.innerHTML = post.title.rendered;
    document.getElementById('lectures-header-title').textContent = tempTitle.textContent || tempTitle.innerText || 'بدون عنوان';
    document.getElementById('single-post-title').innerHTML = post.title.rendered;
    document.getElementById('single-post-date').textContent = toFa(new Date(post.date).toLocaleDateString('fa-IR'));

    const media = extractMediaFromPost(post);
    let finalHtml = '';

    media.iframes.forEach(src => { finalHtml += `<div class="h_iframe-aparat_embed_frame mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-200"><span style="display: block;padding-top: 57%"></span><iframe scrolling="no" allowFullScreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${src}"></iframe></div>`; });
    media.videos.forEach(src => { finalHtml += `<video controls src="${src}" class="w-full rounded-2xl mb-6 shadow-sm bg-black"></video>`; });

    if (media.audios.length > 0) {
        finalHtml += `<div class="bg-brand-50/50 p-4 rounded-2xl mb-8 border border-brand-100 shadow-sm">`;
        finalHtml += `<h3 class="font-bold text-sm text-brand-800 mb-4"><i class="fas fa-headphones-alt ml-2"></i>فایل صوتی ضمیمه</h3>`;
        media.audios.forEach((src) => {
            finalHtml += `<audio controls src="${src}" class="w-full h-11 mb-3 outline-none"></audio>`;
            finalHtml += `<a href="${src}" target="_blank" download class="inline-flex items-center justify-center bg-white text-brand-600 px-4 py-2.5 rounded-xl text-[11px] font-bold mb-2 shadow-sm border border-gray-200 hover:bg-gray-50 transition" style="text-decoration: none;"><i class="fas fa-download ml-2"></i> دانلود فایل صوتی</a><br>`;
        });
        finalHtml += `</div>`;
    }

    finalHtml += media.cleanHtml;

    document.getElementById('single-post-content').innerHTML = finalHtml;
    document.getElementById('single-post-content').style.fontSize = fontSize + 'px';
    convertDOMNumbers(document.getElementById('single-post-content'));

    let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
    const imgContainer = document.getElementById('single-post-image');
    if (imgUrl) { imgContainer.classList.remove('hidden'); imgContainer.querySelector('img').src = imgUrl; }
    else { imgContainer.classList.add('hidden'); }
}

function wpNavBack() {
    if (wpState.view === 'single') showWPPostsView(wpState.currentCat.id, wpState.currentCat.name);
    else if (wpState.view === 'posts') {
        if (wpState.mainCat.id && wpState.mainCat.id !== wpState.currentCat.id) {
            const children = allWPCats.filter(c => c.parent === wpState.mainCat.id && c.count > 0);
            showWPSubCategories(wpState.mainCat.id, wpState.mainCat.name, children);
        } else showWPMainCategories();
    } else if (wpState.view === 'sub') showWPMainCategories();
    else navToScreen('home');
}

// ====================================================
// آخرین سخنرانی‌ها (صفحه اصلی)
// ====================================================
async function fetchLatestLectures() {
    const container = document.getElementById('home-lectures-container');
    if (!container) return;
    try {
        const res = await wpFetch('posts?per_page=5&_embed=1&orderby=date&order=desc');
        if (!res.ok) throw new Error();
        const posts = await res.json();
        if (!Array.isArray(posts) || posts.length === 0) { container.innerHTML = '<div class="text-center py-4 text-gray-400 text-xs">محتوایی یافت نشد</div>'; return; }
        container.innerHTML = posts.map(post => {
            let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
            const date = toFa(new Date(post.date).toLocaleDateString('fa-IR'));
            return `<div onclick="openLatestPost(${post.id})" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98]">
                ${imgUrl ? `<img src="${imgUrl}" class="w-14 h-14 rounded-xl object-cover shrink-0">` : `<div class="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-microphone-alt text-amber-400"></i></div>`}
                <div class="flex flex-col justify-center min-w-0">
                    <h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug mb-1">${post.title.rendered}</h4>
                    <span class="text-[10px] text-gray-400"><i class="far fa-calendar ml-1"></i>${date}</span>
                </div>
            </div>`;
        }).join('');
        window._latestPosts = posts;
    } catch(e) {
        container.innerHTML = '<div class="text-center py-4 text-gray-400 text-xs">خطا در دریافت</div>';
    }
}

function openLatestPost(postId) {
    const posts = window._latestPosts || [];
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (allWPCats.length === 0) {
        wpFetch('categories?per_page=100').then(r=>r.json()).then(cats=>{allWPCats=cats;});
    }
    cachedPosts = posts;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const lecturesScreen = document.getElementById('screen-lectures');
    if (lecturesScreen) lecturesScreen.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector('[data-nav="lectures"]');
    if (navBtn) navBtn.classList.add('active');
    const liveEl = document.getElementById('live-embed-container');
    if (liveEl) liveEl.innerHTML = '';
    showWPSingleView(postId);
}

// ناوبری مستقیم برای لینک‌های داخلی بنر
async function openLectureCatById(catId) {
    if (allWPCats.length === 0) {
        try { allWPCats = await wpFetch('categories?per_page=100').then(r => r.json()); } catch(e) {}
    }
    const cat = allWPCats.find(c => c.id === catId);
    if (cat) handleCategoryClick(cat.id, cat.name);
}

async function openLecturePostById(postId) {
    try {
        let post = cachedPosts.find(p => p.id === postId);
        if (!post) {
            const r = await wpFetch(`posts/${postId}?_embed=1`);
            if (r.ok) { post = await r.json(); cachedPosts = [post, ...cachedPosts]; }
        }
        if (post) { wpState.view = 'posts'; showWPSingleView(postId); }
    } catch(e) {}
}
