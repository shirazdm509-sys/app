// ====================================================
// متغیرهای رسانه
// ====================================================
// گالری ویدیو محلی
let _videoCatsLoaded = false;
let videoCachedItems = [];

// گالری محلی عکس
let galleryCurrentPhotos = [];
let galleryCurrentIndex = 0;

// گالری صوت
let audioCurrentTracks = [];
let audioCurrentIndex = -1;
let audioEl = null;
let _audioCatsLoaded = false;

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
            content.style.display = 'block';
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-brand-600');
            btn.classList.add('text-gray-500');
            content.classList.add('hidden');
            content.style.display = 'none';
        }
    });

    const vc = document.getElementById('wp-media-player-container');
    if(tab !== 'video' && vc) vc.innerHTML = '';

    if (tab === 'video') initVideoGallery();
    if (tab === 'photo') initGallery();
    if (tab === 'audio') initAudioGallery();
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
// گالری ویدیو آپارات محلی
// ====================================================

async function initVideoGallery() {
    if (_videoCatsLoaded) return;
    await loadVideoCategories();
}

async function loadVideoCategories() {
    setMediaLoading(true);
    const view = document.getElementById('video-categories-view');
    const listView = document.getElementById('video-list-view');
    const playerView = document.getElementById('video-player-view');
    if(listView) listView.classList.add('hidden');
    if(playerView) playerView.classList.add('hidden');
    if(view) view.classList.remove('hidden');

    try {
        const res = await fetch('/api/videos/categories');
        const cats = await res.json();
        _videoCatsLoaded = true;

        if(cats && cats.length > 0) {
            const colors = [
                'from-rose-500 to-rose-700',
                'from-blue-500 to-blue-700',
                'from-violet-500 to-violet-700',
                'from-amber-500 to-amber-700',
                'from-teal-500 to-teal-700',
                'from-emerald-500 to-emerald-700',
                'from-pink-500 to-pink-700',
                'from-indigo-500 to-indigo-700',
            ];
            view.innerHTML = cats.map((cat, i) => {
                const grad = colors[i % colors.length];
                const coverHtml = cat.cover
                    ? `<img src="${cat.cover}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center"><i class="fas fa-film text-white text-3xl opacity-80"></i></div>`;
                return `
                <div onclick="loadVideoList(${cat.id},'${cat.name.replace(/'/g,"\\'")}',${cat.video_count})" class="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all active:scale-95 flex flex-col">
                    <div class="w-full aspect-video overflow-hidden relative">
                        ${coverHtml}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                            <h3 class="font-black text-xs text-white line-clamp-1">${cat.name}</h3>
                            <p class="text-[10px] text-white/70 mt-0.5">${cat.video_count} ویدیو</p>
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                                <i class="fas fa-play text-white text-lg mr-[-2px]"></i>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            view.innerHTML = `<div class="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                <i class="fas fa-film text-5xl opacity-20"></i>
                <p class="text-sm font-bold opacity-50">هنوز ویدیویی اضافه نشده</p>
                <p class="text-xs opacity-40">از پنل مدیریت ویدیو اضافه کنید</p>
            </div>`;
        }
    } catch(e) {
        if(view) view.innerHTML = `<div class="col-span-2 text-center py-12 text-gray-400">
            <i class="fas fa-exclamation-circle text-3xl opacity-30 mb-3"></i>
            <p class="text-sm font-bold opacity-50 mb-3">خطا در بارگذاری</p>
            <button onclick="_videoCatsLoaded=false;loadVideoCategories()" class="bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold">تلاش مجدد</button>
        </div>`;
    } finally { setMediaLoading(false); }
}

async function loadVideoList(categoryId, title, count) {
    setMediaLoading(true);
    const catsView = document.getElementById('video-categories-view');
    const listView = document.getElementById('video-list-view');
    const playerView = document.getElementById('video-player-view');
    const list = document.getElementById('video-items-list');

    if(catsView) catsView.classList.add('hidden');
    if(playerView) playerView.classList.add('hidden');
    if(listView) { listView.classList.remove('hidden'); listView.classList.add('flex'); }
    document.getElementById('video-cat-title').textContent = title;
    document.getElementById('video-count-badge').textContent = count > 0 ? `${count} ویدیو` : '';
    if(list) list.innerHTML = '';

    try {
        const res = await fetch(`/api/videos/categories/${categoryId}/items`);
        const items = await res.json();
        videoCachedItems = items;

        if(items && items.length > 0) {
            list.innerHTML = items.map(v => `
                <div onclick="playVideoItem(${v.id})" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98] items-center">
                    <div class="w-28 h-[63px] bg-gray-900 rounded-xl overflow-hidden relative shadow-sm shrink-0">
                        ${v.thumbnail
                            ? `<img src="${v.thumbnail}" class="w-full h-full object-cover opacity-90">`
                            : `<div class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center"><i class="fas fa-film text-gray-500 text-xl"></i></div>`}
                        <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/40">
                                <i class="fas fa-play text-white text-sm mr-[-1px]"></i>
                            </div>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-xs text-gray-800 line-clamp-2 leading-snug">${v.title}</h4>
                        ${v.description ? `<p class="text-[10px] text-gray-400 mt-1 line-clamp-1">${v.description}</p>` : ''}
                    </div>
                </div>`).join('');
        } else {
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <i class="fas fa-video text-4xl opacity-20"></i>
                <p class="text-xs font-bold opacity-50">هیچ ویدیویی در این دسته وجود ندارد</p>
            </div>`;
        }
    } catch(e) {
        if(list) list.innerHTML = `<div class="text-center py-10 text-gray-400 text-xs">خطا در بارگذاری</div>`;
    } finally { setMediaLoading(false); }
}

function playVideoItem(itemId) {
    const item = videoCachedItems.find(v => v.id === itemId);
    if(!item) return;

    const listView = document.getElementById('video-list-view');
    const playerView = document.getElementById('video-player-view');
    if(listView) { listView.classList.add('hidden'); listView.classList.remove('flex'); }
    if(playerView) { playerView.classList.remove('hidden'); playerView.classList.add('flex'); }

    document.getElementById('video-player-title').textContent = item.title;
    document.getElementById('video-aparat-iframe').src = item.embed_url;

    const descEl = document.getElementById('video-player-desc');
    if(item.description && item.description.trim()) {
        descEl.textContent = item.description;
        descEl.classList.remove('hidden');
    } else {
        descEl.classList.add('hidden');
    }
}

function backToVideoCategories() {
    _videoCatsLoaded = false;
    const catsView = document.getElementById('video-categories-view');
    const listView = document.getElementById('video-list-view');
    const playerView = document.getElementById('video-player-view');
    if(listView) { listView.classList.add('hidden'); listView.classList.remove('flex'); }
    if(playerView) { playerView.classList.add('hidden'); playerView.classList.remove('flex'); document.getElementById('video-aparat-iframe').src = ''; }
    if(catsView) catsView.classList.remove('hidden');
    loadVideoCategories();
}

function backToVideoList() {
    const listView = document.getElementById('video-list-view');
    const playerView = document.getElementById('video-player-view');
    if(playerView) { playerView.classList.add('hidden'); playerView.classList.remove('flex'); document.getElementById('video-aparat-iframe').src = ''; }
    if(listView) { listView.classList.remove('hidden'); listView.classList.add('flex'); }
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

// ====================================================
// گالری صوت محلی
// ====================================================

function getAudioEl() {
    if (!audioEl) {
        audioEl = new Audio();
        audioEl.addEventListener('timeupdate', onAudioTimeUpdate);
        audioEl.addEventListener('loadedmetadata', onAudioLoaded);
        audioEl.addEventListener('ended', onAudioEnded);
        audioEl.addEventListener('play', ()=>updatePlayBtn(true));
        audioEl.addEventListener('pause', ()=>updatePlayBtn(false));
    }
    return audioEl;
}

async function initAudioGallery() {
    if (_audioCatsLoaded) return;
    await loadAudioCategories();
}

async function loadAudioCategories() {
    setMediaLoading(true);
    const view = document.getElementById('audio-categories-view');
    const plView = document.getElementById('audio-playlist-view');
    if(plView) { plView.classList.add('hidden'); plView.classList.remove('flex'); }
    if(view) view.classList.remove('hidden');

    try {
        const res = await fetch('/api/audio/categories');
        const cats = await res.json();
        _audioCatsLoaded = true;

        if(cats && cats.length > 0) {
            const colors = [
                'from-brand-500 to-brand-700',
                'from-violet-500 to-violet-700',
                'from-rose-500 to-rose-700',
                'from-amber-500 to-amber-700',
                'from-emerald-500 to-emerald-700',
                'from-blue-500 to-blue-700',
                'from-pink-500 to-pink-700',
                'from-teal-500 to-teal-700',
            ];
            view.innerHTML = cats.map((cat, i) => {
                const grad = colors[i % colors.length];
                const coverHtml = cat.cover
                    ? `<img src="${cat.cover}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center"><i class="fas fa-headphones text-white text-3xl opacity-80"></i></div>`;
                return `
                <div onclick="loadAudioPlaylist(${cat.id},'${cat.name.replace(/'/g,"\\'")}',${cat.track_count})" class="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all active:scale-95 flex flex-col">
                    <div class="w-full aspect-square overflow-hidden relative">
                        ${coverHtml}
                        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <h3 class="font-black text-xs text-white line-clamp-1">${cat.name}</h3>
                            <p class="text-[10px] text-white/70 mt-0.5">${cat.track_count} صوت</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            view.innerHTML = `<div class="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                <i class="fas fa-headphones text-5xl opacity-20"></i>
                <p class="text-sm font-bold opacity-50">هنوز گالری صوتی ایجاد نشده</p>
                <p class="text-xs opacity-40">از پنل مدیریت صوت اضافه کنید</p>
            </div>`;
        }
    } catch(e) {
        if(view) view.innerHTML = `<div class="col-span-2 text-center py-12 text-gray-400">
            <i class="fas fa-exclamation-circle text-3xl opacity-30 mb-3"></i>
            <p class="text-sm font-bold opacity-50 mb-3">خطا در بارگذاری</p>
            <button onclick="_audioCatsLoaded=false;loadAudioCategories()" class="bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-xs font-bold">تلاش مجدد</button>
        </div>`;
    } finally { setMediaLoading(false); }
}

async function loadAudioPlaylist(categoryId, title, count) {
    setMediaLoading(true);
    const catsView = document.getElementById('audio-categories-view');
    const plView = document.getElementById('audio-playlist-view');
    const list = document.getElementById('audio-tracks-list');

    if(catsView) catsView.classList.add('hidden');
    if(plView) { plView.classList.remove('hidden'); plView.classList.add('flex'); }
    document.getElementById('audio-cat-title').textContent = title;
    document.getElementById('audio-track-count').textContent = count > 0 ? `${count} صوت` : '';
    if(list) list.innerHTML = '';

    try {
        const res = await fetch(`/api/audio/categories/${categoryId}/tracks`);
        const tracks = await res.json();
        audioCurrentTracks = tracks;

        if(tracks && tracks.length > 0) {
            renderAudioTrackList();
            // Auto-select first track
            selectAudioTrack(0, false);
        } else {
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <i class="fas fa-music text-4xl opacity-20"></i>
                <p class="text-xs font-bold opacity-50">هیچ فایل صوتی در این دسته وجود ندارد</p>
            </div>`;
        }
    } catch(e) {
        if(list) list.innerHTML = `<div class="text-center py-10 text-gray-400 text-xs">خطا در بارگذاری</div>`;
    } finally { setMediaLoading(false); }
}

function renderAudioTrackList() {
    const list = document.getElementById('audio-tracks-list');
    if(!list || !audioCurrentTracks.length) return;
    list.innerHTML = audioCurrentTracks.map((tr, idx) => {
        const isActive = idx === audioCurrentIndex;
        return `
        <div id="audio-track-item-${idx}" onclick="selectAudioTrack(${idx}, true)"
            class="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${isActive ? 'bg-brand-50 border border-brand-100' : 'bg-white border border-gray-100 hover:bg-gray-50'} shadow-sm">
            <div class="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center relative">
                ${tr.cover ? `<img src="${tr.cover}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center"><i class="fas fa-music text-white text-sm"></i></div>`}
                ${isActive ? `<div class="absolute inset-0 bg-brand-600/40 flex items-center justify-center"><i class="fas fa-volume-up text-white text-xs animate-pulse"></i></div>` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-xs ${isActive ? 'text-brand-700' : 'text-gray-800'} line-clamp-1">${tr.title}</h4>
                ${tr.artist ? `<p class="text-[10px] ${isActive ? 'text-brand-500' : 'text-gray-400'} mt-0.5">${tr.artist}</p>` : ''}
            </div>
            <div class="shrink-0">
                <span class="text-[10px] font-bold ${isActive ? 'text-brand-500' : 'text-gray-300'}">${idx+1}</span>
            </div>
        </div>`;
    }).join('');
}

function selectAudioTrack(idx, autoPlay) {
    if(idx < 0 || idx >= audioCurrentTracks.length) return;
    audioCurrentIndex = idx;
    const tr = audioCurrentTracks[idx];
    const el = getAudioEl();

    // Update player UI
    const playerCard = document.getElementById('audio-player-card');
    if(playerCard) playerCard.classList.remove('hidden');

    document.getElementById('audio-player-title').textContent = tr.title;
    document.getElementById('audio-player-artist').textContent = tr.artist || '';

    const coverEl = document.getElementById('audio-player-cover');
    if(coverEl) {
        coverEl.innerHTML = tr.cover
            ? `<img src="${tr.cover}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full bg-white/20 flex items-center justify-center"><i class="fas fa-music text-white/60 text-3xl"></i></div>`;
    }

    // Reset progress
    const prog = document.getElementById('audio-progress');
    if(prog) prog.value = 0;
    document.getElementById('audio-current-time').textContent = '۰:۰۰';
    document.getElementById('audio-duration').textContent = '۰:۰۰';

    // Load audio
    el.src = tr.audio_url;
    el.load();
    if(autoPlay) el.play().catch(()=>{});

    renderAudioTrackList();

    // Scroll track into view
    setTimeout(()=>{
        const item = document.getElementById(`audio-track-item-${idx}`);
        if(item) item.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 100);
}

function onAudioTimeUpdate() {
    if(!audioEl || !audioEl.duration) return;
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    const prog = document.getElementById('audio-progress');
    if(prog) prog.value = pct;
    document.getElementById('audio-current-time').textContent = formatAudioTime(audioEl.currentTime);
}

function onAudioLoaded() {
    if(!audioEl) return;
    document.getElementById('audio-duration').textContent = formatAudioTime(audioEl.duration);
}

function onAudioEnded() {
    // Auto-play next
    if(audioCurrentIndex < audioCurrentTracks.length - 1) {
        selectAudioTrack(audioCurrentIndex + 1, true);
    } else {
        updatePlayBtn(false);
    }
}

function updatePlayBtn(playing) {
    const icon = document.getElementById('audio-play-icon');
    if(!icon) return;
    icon.className = playing ? 'fas fa-pause text-xl' : 'fas fa-play text-xl mr-0.5';
}

function toggleAudioPlay() {
    const el = getAudioEl();
    if(!el.src || el.src === window.location.href) return;
    if(el.paused) el.play().catch(()=>{});
    else el.pause();
}

function seekAudio(val) {
    const el = getAudioEl();
    if(!el.duration) return;
    el.currentTime = (val / 100) * el.duration;
}

function skipAudio(seconds) {
    const el = getAudioEl();
    if(!el.src) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + seconds));
}

function prevAudioTrack() { if(audioCurrentIndex > 0) selectAudioTrack(audioCurrentIndex - 1, !audioEl?.paused); }
function nextAudioTrack() { if(audioCurrentIndex < audioCurrentTracks.length - 1) selectAudioTrack(audioCurrentIndex + 1, !audioEl?.paused); }

function setAudioSpeed(speed) {
    const el = getAudioEl();
    el.playbackRate = speed;
    document.querySelectorAll('.audio-speed-btn').forEach(btn => {
        const s = parseFloat(btn.dataset.speed);
        btn.className = btn.className.replace(/bg-\w+-\d+ text-\w+-\d+/g, '').trim();
        if(s === speed) {
            btn.className = 'audio-speed-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-100 text-brand-700 transition';
        } else {
            btn.className = 'audio-speed-btn px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition';
        }
    });
}

function backToAudioCategories() {
    _audioCatsLoaded = false;
    if(audioEl) { audioEl.pause(); }
    const catsView = document.getElementById('audio-categories-view');
    const plView = document.getElementById('audio-playlist-view');
    if(plView) { plView.classList.add('hidden'); plView.classList.remove('flex'); }
    if(catsView) catsView.classList.remove('hidden');
    loadAudioCategories();
}

function formatAudioTime(sec) {
    if(isNaN(sec) || !isFinite(sec)) return '۰:۰۰';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const toFarsiNum = n => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    return toFarsiNum(m) + ':' + toFarsiNum(s.toString().padStart(2,'0'));
}

async function downloadCurrentAudio() {
    if(audioCurrentIndex < 0 || !audioCurrentTracks[audioCurrentIndex]) return;
    const tr = audioCurrentTracks[audioCurrentIndex];
    try {
        if(tr.audio_url.startsWith('/')) {
            const a = document.createElement('a');
            a.href = tr.audio_url;
            a.download = tr.title + '.mp3';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } else {
            const response = await fetch(tr.audio_url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = tr.title + '.mp3';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch(e) {
        window.open(tr.audio_url, '_blank');
    }
}

async function shareCurrentAudio() {
    if(audioCurrentIndex < 0 || !audioCurrentTracks[audioCurrentIndex]) return;
    const tr = audioCurrentTracks[audioCurrentIndex];
    try {
        if(navigator.share) {
            await navigator.share({ title: tr.title, url: tr.audio_url });
        } else {
            await navigator.clipboard.writeText(tr.audio_url);
            if(typeof showToast === 'function') showToast('لینک صوت کپی شد');
        }
    } catch(e) {}
}
