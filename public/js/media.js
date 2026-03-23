// ====================================================
// متغیرهای رسانه
// ====================================================
let wpMediaPlaylists = [];
let wpMediaState = { view: 'playlists', currentPlaylistId: null, currentPlaylistTitle: '' };
let cachedMediaPosts = [];

// گالری محلی
let galleryCurrentPhotos = [];
let galleryCurrentIndex = 0;

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
    if (tab === 'photo') initGallery();
}

function setMediaLoading(show) {
    const loading = document.getElementById('media-loading');
    const videoContent = document.getElementById('media-content-video');
    const photoContent = document.getElementById('media-content-photo');
    if(!loading) return;
    if (show) {
        loading.classList.remove('hidden'); loading.classList.add('flex');
        if(videoContent) { videoContent.style.opacity = '0.3'; videoContent.style.pointerEvents = 'none'; }
        if(photoContent) { photoContent.style.opacity = '0.4'; photoContent.style.pointerEvents = 'none'; }
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
// گالری عکس محلی
// ====================================================
let _galleryCatsLoaded = false;

async function initGallery() {
    if (_galleryCatsLoaded) return;
    await loadGalleryCategories();
}

async function loadGalleryCategories() {
    setMediaLoading(true);
    const view = document.getElementById('gallery-categories-view');
    const photosView = document.getElementById('gallery-photos-view');
    if(photosView) { photosView.classList.add('hidden'); photosView.classList.remove('flex'); }
    if(view) view.classList.remove('hidden');

    try {
        const res = await fetch('/api/gallery/categories');
        const cats = await res.json();
        _galleryCatsLoaded = true;

        if(cats && cats.length > 0) {
            const colors = [
                'from-teal-400 to-teal-600',
                'from-emerald-400 to-emerald-600',
                'from-cyan-400 to-cyan-600',
                'from-blue-400 to-blue-600',
                'from-violet-400 to-violet-600',
                'from-rose-400 to-rose-600',
                'from-amber-400 to-amber-600',
                'from-pink-400 to-pink-600',
            ];
            view.innerHTML = cats.map((cat, i) => {
                const grad = colors[i % colors.length];
                const coverHtml = cat.cover
                    ? `<img src="${cat.cover}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center"><i class="fas fa-images text-white text-3xl opacity-80"></i></div>`;
                return `
                <div onclick="loadGalleryPhotos(${cat.id},'${cat.name.replace(/'/g,"\\'")}',${cat.photo_count})" class="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all active:scale-95 flex flex-col">
                    <div class="w-full aspect-square overflow-hidden relative">
                        ${coverHtml}
                        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                            <h3 class="font-black text-xs text-white line-clamp-1">${cat.name}</h3>
                            <p class="text-[10px] text-white/70 mt-0.5">${cat.photo_count} تصویر</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            view.innerHTML = `<div class="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                <i class="fas fa-images text-5xl opacity-20"></i>
                <p class="text-sm font-bold opacity-50">هنوز گالری‌ای ایجاد نشده</p>
                <p class="text-xs opacity-40">از پنل مدیریت گالری اضافه کنید</p>
            </div>`;
        }
    } catch(e) {
        if(view) view.innerHTML = `<div class="col-span-2 text-center py-12 text-gray-400">
            <i class="fas fa-exclamation-circle text-3xl opacity-30 mb-3"></i>
            <p class="text-sm font-bold opacity-50 mb-3">خطا در بارگذاری</p>
            <button onclick="_galleryCatsLoaded=false;loadGalleryCategories()" class="bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold">تلاش مجدد</button>
        </div>`;
    } finally { setMediaLoading(false); }
}

async function loadGalleryPhotos(categoryId, title, count) {
    setMediaLoading(true);
    const catsView = document.getElementById('gallery-categories-view');
    const photosView = document.getElementById('gallery-photos-view');
    const grid = document.getElementById('gallery-photos-grid');

    if(catsView) catsView.classList.add('hidden');
    if(photosView) { photosView.classList.remove('hidden'); photosView.classList.add('flex'); }
    document.getElementById('gallery-category-title').textContent = title;
    document.getElementById('gallery-photo-count').textContent = count > 0 ? `${count} تصویر` : '';
    if(grid) grid.innerHTML = '';

    try {
        const res = await fetch(`/api/gallery/categories/${categoryId}/photos`);
        const photos = await res.json();
        galleryCurrentPhotos = photos;

        if(photos && photos.length > 0) {
            grid.innerHTML = photos.map((ph, idx) => `
                <div onclick="openGalleryImage(${idx})" class="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer relative group shadow-sm">
                    <img src="${ph.image}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200"></div>
                </div>`).join('');
        } else {
            grid.innerHTML = `<div class="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <i class="fas fa-image text-4xl opacity-20"></i>
                <p class="text-xs font-bold opacity-50">هیچ تصویری در این دسته وجود ندارد</p>
            </div>`;
        }
    } catch(e) {
        if(grid) grid.innerHTML = `<div class="col-span-3 text-center py-10 text-gray-400 text-xs">خطا در بارگذاری</div>`;
    } finally { setMediaLoading(false); }
}

function backToGalleryCategories() {
    _galleryCatsLoaded = false;
    const catsView = document.getElementById('gallery-categories-view');
    const photosView = document.getElementById('gallery-photos-view');
    if(photosView) { photosView.classList.add('hidden'); photosView.classList.remove('flex'); }
    if(catsView) catsView.classList.remove('hidden');
    loadGalleryCategories();
}

function openGalleryImage(index) {
    if(!galleryCurrentPhotos || galleryCurrentPhotos.length === 0) return;
    galleryCurrentIndex = index;
    const modal = document.getElementById('image-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    updateModalImage();
    updateModalDots();
}

function updateModalImage() {
    const ph = galleryCurrentPhotos[galleryCurrentIndex];
    if(!ph) return;
    const img = document.getElementById('fullscreen-image');
    const titleEl = document.getElementById('modal-image-title');
    img.src = ph.image;
    if(titleEl) titleEl.textContent = ph.title || '';

    const prevBtn = document.getElementById('modal-prev-btn');
    const nextBtn = document.getElementById('modal-next-btn');
    if(prevBtn) prevBtn.style.visibility = galleryCurrentIndex > 0 ? 'visible' : 'hidden';
    if(nextBtn) nextBtn.style.visibility = galleryCurrentIndex < galleryCurrentPhotos.length - 1 ? 'visible' : 'hidden';
}

function updateModalDots() {
    const dotsEl = document.getElementById('modal-dots');
    if(!dotsEl) return;
    const total = galleryCurrentPhotos.length;
    if(total <= 1) { dotsEl.innerHTML = ''; return; }
    const maxDots = 8;
    if(total <= maxDots) {
        dotsEl.innerHTML = galleryCurrentPhotos.map((_,i) =>
            `<div class="w-1.5 h-1.5 rounded-full transition-all ${i === galleryCurrentIndex ? 'bg-white w-4' : 'bg-white/40'}"></div>`
        ).join('');
    } else {
        dotsEl.innerHTML = `<span class="text-white/60 text-xs font-bold">${galleryCurrentIndex + 1} / ${total}</span>`;
    }
}

function navigateGallery(dir) {
    const newIdx = galleryCurrentIndex + dir;
    if(newIdx < 0 || newIdx >= galleryCurrentPhotos.length) return;
    galleryCurrentIndex = newIdx;
    updateModalImage();
    updateModalDots();
}

function handleModalBackdropClick(e) {
    if(e.target === document.getElementById('image-modal') || e.target === document.getElementById('modal-img-container')) {
        closeImageModal();
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function downloadCurrentImage() {
    const ph = galleryCurrentPhotos[galleryCurrentIndex];
    if(!ph) return;
    try {
        const response = await fetch(ph.image);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = ph.image.split('.').pop().split('?')[0] || 'jpg';
        a.download = (ph.title || 'تصویر') + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        const a = document.createElement('a');
        a.href = ph.image;
        a.target = '_blank';
        a.click();
    }
}

async function shareCurrentImage() {
    const ph = galleryCurrentPhotos[galleryCurrentIndex];
    if(!ph) return;
    const shareData = { title: ph.title || 'تصویر گالری', url: ph.image };
    try {
        if(navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(ph.image);
            if(typeof showToast === 'function') showToast('لینک تصویر کپی شد');
        }
    } catch(e) {}
}
