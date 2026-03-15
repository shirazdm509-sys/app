// ====================================================
// متغیرهای رسانه
// ====================================================
let wpMediaPlaylists = [];
let wpMediaState = { view: 'playlists', currentPlaylistId: null, currentPlaylistTitle: '' };
let cachedMediaPosts = [];

let wpPhotoPlaylists = [];
let wpPhotoState = { view: 'playlists', currentPlaylistId: null, currentPlaylistTitle: '' };
let cachedPhotoPosts = [];

// ====================================================
// تب‌های رسانه
// ====================================================
function switchMediaTab(tab) {
    const tabs = ['video', 'audio', 'photo'];
    tabs.forEach(t => {
        const btn = document.getElementById('tab-media-' + t);
        const content = document.getElementById('media-content-' + t);
        if (!btn || !content) return;
        if(t === tab) {
            btn.classList.add('bg-white', 'shadow-sm', 'text-brand-600');
            btn.classList.remove('text-gray-500');
            content.classList.remove('hidden');
            content.style.display = (t === 'audio') ? 'flex' : 'block';
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-brand-600');
            btn.classList.add('text-gray-500');
            content.classList.add('hidden');
            content.style.display = 'none';
        }
    });

    const vc = document.getElementById('wp-media-player-container');
    if(tab !== 'video' && vc) vc.innerHTML = '';

    if (tab === 'video' && wpMediaPlaylists.length === 0) fetchWPMediaPlaylists();
    if (tab === 'photo' && wpPhotoPlaylists.length === 0) fetchWPPhotoPlaylists();
}

function setMediaLoading(show) {
    const loading = document.getElementById('media-loading');
    const videoContent = document.getElementById('media-content-video');
    const photoContent = document.getElementById('media-content-photo');
    if(!loading) return;
    if (show) {
        loading.classList.remove('hidden'); loading.classList.add('flex');
        if(videoContent) { videoContent.style.opacity = '0.3'; videoContent.style.pointerEvents = 'none'; }
        if(photoContent) { photoContent.style.opacity = '0.3'; photoContent.style.pointerEvents = 'none'; }
    } else {
        loading.classList.add('hidden'); loading.classList.remove('flex');
        if(videoContent) { videoContent.style.opacity = '1'; videoContent.style.pointerEvents = 'auto'; }
        if(photoContent) { photoContent.style.opacity = '1'; photoContent.style.pointerEvents = 'auto'; }
    }
}

async function initMedia() { switchMediaTab('video'); }

// ====================================================
// پخش زنده
// ====================================================
async function initLiveScreen() {
    const c = document.getElementById('live-embed-container');
    if (!c) return;
    c.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-gray-500 gap-3"><i class="fas fa-satellite-dish text-4xl opacity-30 animate-pulse"></i><p class="text-sm font-bold opacity-50">در حال بارگذاری...</p></div>`;
    try {
        const r = await fetch('/api/settings');
        const s = await r.json();
        const embedRaw = (s.live_embed || '').trim();
        const active = s.live_active === '1';
        if (!active || !embedRaw) {
            c.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3"><i class="fas fa-satellite-dish text-4xl opacity-30"></i><p class="text-sm font-bold opacity-40">در حال حاضر پخش زنده‌ای وجود ندارد</p></div>`;
            return;
        }

        let iframeSrc = '';
        if (/^https?:\/\//.test(embedRaw)) {
            iframeSrc = embedRaw;
        } else {
            const m = embedRaw.match(/src\s*=\s*["']([^"']+)["']/i);
            if (m && m[1] && m[1] !== 'undefined' && /^https?:\/\//.test(m[1])) iframeSrc = m[1];
        }

        if (!iframeSrc) {
            c.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3 px-6 text-center"><i class="fas fa-exclamation-triangle text-3xl opacity-40 mb-1"></i><p class="text-sm font-bold opacity-60">کد امبد نامعتبر است</p><p class="text-xs opacity-40">آدرس پخش در کد یافت نشد. لطفاً کد را از آپارات دوباره دریافت کنید یا فقط آدرس iframe را وارد کنید.</p></div>`;
            return;
        }

        c.innerHTML = `<div class="h_iframe-aparat_embed_frame"><span style="display:block;padding-top:57%"></span><iframe scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${iframeSrc}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe></div>`;
    } catch(e) {
        c.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><i class="fas fa-exclamation-circle text-3xl opacity-40"></i><p class="text-sm opacity-50">خطا در بارگذاری پخش زنده</p></div>`;
    }
}

// ====================================================
// بخش ویدیو
// ====================================================
async function fetchWPMediaPlaylists() {
    setMediaLoading(true);
    const plView = document.getElementById('wp-media-playlists-view');
    try {
        const res = await fetch(`${WP_API_URL}/categories?per_page=100`);
        if(!res.ok) throw new Error('WP API Error');
        const cats = await res.json();

        const targetNames = ['ویدئو کلیپ', 'ویدیو کلیپ', 'ویدیوکلیپ', 'ویدئوکلیپ', 'ویدیوها', 'ویدئوها', 'ویدیو', 'فیلم'];
        const mainVideoCat = cats.find(c => targetNames.includes(c.name.trim()) || c.slug.includes('video'));

        let displayCats = mainVideoCat ? cats.filter(c => (c.id === mainVideoCat.id || c.parent === mainVideoCat.id) && c.count > 0) : cats.filter(c => c.count > 0);

        if(displayCats.length > 0) {
            wpMediaPlaylists = displayCats;
            plView.innerHTML = displayCats.map((pl, i) => {
                const colors = ['text-rose-500 bg-rose-50', 'text-blue-500 bg-blue-50', 'text-emerald-500 bg-emerald-50', 'text-amber-500 bg-amber-50'];
                return `<div onclick="showWPMediaVideos('${pl.id}', '${pl.name.replace(/'/g, "\\'")}')" class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition active:scale-95 text-center"><div class="w-14 h-14 ${colors[i % colors.length]} rounded-full flex items-center justify-center text-2xl shadow-sm"><i class="fas fa-play-circle"></i></div><h3 class="font-bold text-xs text-gray-800 line-clamp-2">${pl.name}</h3></div>`;
            }).join('');
        } else plView.innerHTML = '<div class="col-span-2 text-center py-10 text-gray-500 font-bold text-sm">دسته‌بندی ویدیوها یافت نشد.</div>';
    } catch(e) { plView.innerHTML = `<div class="col-span-2 text-center py-12 text-gray-400"><p class="text-sm font-bold">خطا در دریافت اطلاعات</p><button onclick="fetchWPMediaPlaylists()" class="mt-4 bg-rose-50 text-rose-600 px-5 py-2 rounded-full text-xs font-bold">تلاش مجدد</button></div>`; }
    finally { setMediaLoading(false); }
}

async function showWPMediaVideos(categoryId, title) {
    wpMediaState.view = 'videos';
    document.getElementById('wp-media-playlists-view').classList.add('hidden');
    document.getElementById('wp-media-single-view').classList.add('hidden');
    document.getElementById('wp-media-single-view').classList.remove('flex');
    const videosView = document.getElementById('wp-media-videos-view');
    videosView.classList.remove('hidden'); videosView.classList.add('flex');

    const listContainer = document.getElementById('wp-media-videos-list');
    listContainer.innerHTML = '';
    document.getElementById('wp-media-playlist-title').textContent = title;

    setMediaLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?categories=${categoryId}&_embed=1&per_page=50`);
        const data = await res.json();

        let validPosts = [];
        if(data && data.length > 0) {
            data.forEach(post => {
                const mediaInfo = extractMediaFromPost(post);
                if (mediaInfo.iframes.length > 0 || mediaInfo.videos.length > 0) {
                    post.extractedMedia = mediaInfo;
                    validPosts.push(post);
                }
            });
        }

        cachedMediaPosts = validPosts;

        if(validPosts.length > 0) {
            listContainer.innerHTML = validPosts.map(post => {
                let imgUrl = post._embedded && post._embedded['wp:featuredmedia'] ? post._embedded['wp:featuredmedia'][0].source_url : '';
                return `
                <div onclick="playWPMediaVideo(${post.id}, '${post.title.rendered.replace(/'/g, "\\'")}')" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98]">
                    <div class="w-24 h-16 bg-gray-200 rounded-xl overflow-hidden relative shadow-sm shrink-0">
                        ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-rose-50 flex items-center justify-center"><i class="fas fa-video text-rose-300 text-xl"></i></div>`}
                        <div class="absolute inset-0 bg-black/20 flex items-center justify-center"><i class="fas fa-play text-white text-lg opacity-90 drop-shadow-md"></i></div>
                    </div>
                    <div class="flex flex-col justify-center min-w-0 flex-1"><h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug mb-1.5">${post.title.rendered}</h4></div>
                </div>`;
            }).join('');
        } else listContainer.innerHTML = `<div class="text-center py-10 text-gray-400 text-xs font-bold">هیچ ویدیویی در این بخش یافت نشد.</div>`;
    } catch(e) { listContainer.innerHTML = `<div class="text-center py-10 text-gray-400"><button onclick="showWPMediaVideos('${categoryId}', '${title}')" class="bg-gray-100 px-4 py-2 rounded-full text-xs font-bold">تلاش مجدد</button></div>`; }
    finally { setMediaLoading(false); }
}

function playWPMediaVideo(postId, title) {
    const post = cachedMediaPosts.find(p => p.id === postId);
    if(!post || !post.extractedMedia) return;

    wpMediaState.view = 'single';
    document.getElementById('wp-media-videos-view').classList.add('hidden');
    document.getElementById('wp-media-videos-view').classList.remove('flex');
    const singleView = document.getElementById('wp-media-single-view');
    singleView.classList.remove('hidden'); singleView.classList.add('flex');

    document.getElementById('wp-media-video-title').innerHTML = title;

    let playerHtml = '';
    post.extractedMedia.iframes.forEach(src => playerHtml += `<div class="h_iframe-aparat_embed_frame mb-4"><span style="display: block;padding-top: 57%"></span><iframe scrolling="no" allowFullScreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${src}"></iframe></div>`);
    post.extractedMedia.videos.forEach(src => playerHtml += `<video controls src="${src}" style="width:100%; border-radius:12px; margin-bottom:15px;"></video>`);

    document.getElementById('wp-media-player-container').innerHTML = playerHtml;

    const contentContainer = document.getElementById('wp-media-post-content');
    if (post.extractedMedia.cleanHtml.trim() !== '') {
        contentContainer.innerHTML = post.extractedMedia.cleanHtml;
        contentContainer.style.display = 'block';
    } else {
        contentContainer.style.display = 'none';
    }
}

function backToWPMediaPlaylists() {
    wpMediaState.view = 'playlists';
    document.getElementById('wp-media-videos-view').classList.add('hidden');
    document.getElementById('wp-media-videos-view').classList.remove('flex');
    document.getElementById('wp-media-playlists-view').classList.remove('hidden');
}

function backToWPMediaVideos() {
    wpMediaState.view = 'videos';
    document.getElementById('wp-media-single-view').classList.add('hidden');
    document.getElementById('wp-media-single-view').classList.remove('flex');
    document.getElementById('wp-media-videos-view').classList.remove('hidden');
    document.getElementById('wp-media-videos-view').classList.add('flex');
    document.getElementById('wp-media-player-container').innerHTML = '';
}

// ====================================================
// بخش عکس
// ====================================================
async function fetchWPPhotoPlaylists() {
    setMediaLoading(true);
    const plView = document.getElementById('wp-photo-playlists-view');
    try {
        const res = await fetch(`${WP_API_URL}/categories?per_page=100`);
        if(!res.ok) throw new Error('WP API Error');
        const cats = await res.json();

        const targetNames = ['تصاویر', 'عکس', 'گالری', 'گالری تصاویر', 'عکس ها', 'گزارش تصویری'];
        const mainPhotoCat = cats.find(c => targetNames.includes(c.name.trim()) || c.slug.includes('gallery') || c.slug.includes('photo') || c.slug.includes('image'));

        let displayCats = mainPhotoCat ? cats.filter(c => (c.id === mainPhotoCat.id || c.parent === mainPhotoCat.id) && c.count > 0) : cats.filter(c => c.count > 0);

        if(displayCats.length > 0) {
            wpPhotoPlaylists = displayCats;
            plView.innerHTML = displayCats.map((pl, i) => {
                const colors = ['text-emerald-500 bg-emerald-50', 'text-cyan-500 bg-cyan-50', 'text-teal-500 bg-teal-50', 'text-green-500 bg-green-50'];
                return `<div onclick="showWPPhotoPosts('${pl.id}', '${pl.name.replace(/'/g, "\\'")}')" class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition active:scale-95 text-center"><div class="w-14 h-14 ${colors[i % colors.length]} rounded-full flex items-center justify-center text-2xl shadow-sm"><i class="fas fa-images transform -translate-y-0.5"></i></div><h3 class="font-bold text-xs text-gray-800 line-clamp-2">${pl.name}</h3></div>`;
            }).join('');
        } else plView.innerHTML = '<div class="col-span-2 text-center py-10 text-gray-500 font-bold text-sm">دسته‌بندی تصاویر یافت نشد.</div>';
    } catch(e) { plView.innerHTML = `<div class="col-span-2 text-center py-12 text-gray-400"><button onclick="fetchWPPhotoPlaylists()" class="mt-4 bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold">تلاش مجدد</button></div>`; }
    finally { setMediaLoading(false); }
}

async function showWPPhotoPosts(categoryId, title) {
    wpPhotoState.view = 'posts';
    document.getElementById('wp-photo-playlists-view').classList.add('hidden');
    document.getElementById('wp-photo-single-view').classList.add('hidden');
    document.getElementById('wp-photo-single-view').classList.remove('flex');
    const postsView = document.getElementById('wp-photo-posts-view');
    postsView.classList.remove('hidden'); postsView.classList.add('flex');

    const listContainer = document.getElementById('wp-photo-posts-list');
    listContainer.innerHTML = '';
    document.getElementById('wp-photo-playlist-title').textContent = title;

    setMediaLoading(true);
    try {
        const res = await fetch(`${WP_API_URL}/posts?categories=${categoryId}&_embed=1&per_page=50`);
        const data = await res.json();

        let validPosts = [];
        if(data && data.length > 0) {
            data.forEach(post => {
                const mediaInfo = extractMediaFromPost(post);
                if (post._embedded && post._embedded['wp:featuredmedia']) {
                    mediaInfo.images.unshift(post._embedded['wp:featuredmedia'][0].source_url);
                }
                mediaInfo.images = [...new Set(mediaInfo.images)];
                if (mediaInfo.images.length > 0) {
                    post.extractedMedia = mediaInfo;
                    validPosts.push(post);
                }
            });
        }

        cachedPhotoPosts = validPosts;

        if(validPosts.length > 0) {
            listContainer.innerHTML = validPosts.map(post => {
                const date = toFa(new Date(post.date).toLocaleDateString('fa-IR'));
                const firstImage = post.extractedMedia.images[0];
                return `
                <div onclick="showWPPhotoGallery(${post.id}, '${post.title.rendered.replace(/'/g, "\\'")}')" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98] items-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 shadow-inner">
                        <img src="${firstImage}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col justify-center min-w-0 flex-1">
                        <h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug mb-1.5">${post.title.rendered}</h4>
                        <span class="text-[10px] font-medium text-gray-400"><i class="far fa-calendar ml-1"></i>${date} - ${post.extractedMedia.images.length} تصویر</span>
                    </div>
                </div>`;
            }).join('');
        } else listContainer.innerHTML = `<div class="text-center py-10 text-gray-400 text-xs font-bold">هیچ گالری در این بخش یافت نشد.</div>`;
    } catch(e) { listContainer.innerHTML = `<div class="text-center py-10 text-gray-400"><button onclick="showWPPhotoPosts('${categoryId}', '${title}')" class="bg-gray-100 px-4 py-2 rounded-full text-xs font-bold">تلاش مجدد</button></div>`; }
    finally { setMediaLoading(false); }
}

function showWPPhotoGallery(postId, title) {
    const post = cachedPhotoPosts.find(p => p.id === postId);
    if(!post || !post.extractedMedia) return;

    wpPhotoState.view = 'single';
    document.getElementById('wp-photo-posts-view').classList.add('hidden');
    document.getElementById('wp-photo-posts-view').classList.remove('flex');
    const singleView = document.getElementById('wp-photo-single-view');
    singleView.classList.remove('hidden'); singleView.classList.add('flex');

    document.getElementById('wp-photo-post-title').innerHTML = title;

    const container = document.getElementById('wp-photo-gallery-container');
    container.innerHTML = post.extractedMedia.images.map(src => `
        <div class="rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200 aspect-square cursor-pointer" onclick="openImageModal('${src}')">
            <img src="${src}" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
        </div>
    `).join('');

    const contentContainer = document.getElementById('wp-photo-post-content');
    if (post.extractedMedia.cleanHtml.trim() !== '') {
        contentContainer.innerHTML = post.extractedMedia.cleanHtml;
        contentContainer.style.display = 'block';
    } else {
        contentContainer.style.display = 'none';
    }
}

function backToWPPhotoPlaylists() {
    wpPhotoState.view = 'playlists';
    document.getElementById('wp-photo-posts-view').classList.add('hidden');
    document.getElementById('wp-photo-posts-view').classList.remove('flex');
    document.getElementById('wp-photo-playlists-view').classList.remove('hidden');
}

function backToWPPhotoPosts() {
    wpPhotoState.view = 'posts';
    document.getElementById('wp-photo-single-view').classList.add('hidden');
    document.getElementById('wp-photo-single-view').classList.remove('flex');
    document.getElementById('wp-photo-posts-view').classList.remove('hidden');
    document.getElementById('wp-photo-posts-view').classList.add('flex');
}
