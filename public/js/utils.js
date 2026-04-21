// ====================================================
// بررسی Tailwind هنگام لود
// ====================================================
window.addEventListener('load', () => {
    if (typeof tailwind === 'undefined') {
        const txt = document.getElementById('loading-text');
        const spn = document.getElementById('loading-spinner');
        if (txt) txt.innerHTML = '<span style="color:#ef4444;font-size:16px;">❌ خطا در بارگذاری</span><br><br>لطفاً صفحه را رفرش کنید.';
        if (spn) spn.style.display = 'none';
    }
});

// ====================================================
// تبدیل اعداد انگلیسی به فارسی
// ====================================================
function toFa(n) { return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function convertDOMNumbers(el) {
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        if (/[0-9]/.test(node.nodeValue)) node.nodeValue = toFa(node.nodeValue);
    }
}

// ====================================================
// Toast
// ====================================================
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.opacity='1';t.style.pointerEvents='auto';t.style.transform='translate(-50%, -20px)';setTimeout(()=>{t.style.opacity='0';t.style.pointerEvents='none';t.style.transform='translate(-50%, 0)';},2500);}

// ====================================================
// مودال تصویر
// ====================================================
function openImageModal(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    img.src = src;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => img.classList.remove('scale-95'), 10);
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('fullscreen-image');
    img.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        img.src = '';
    }, 300);
}

// ====================================================
// ====================================================
// لینک‌های خارجی — باز کردن در تب جدید
// ====================================================
function openWebView(url) {
    if (!url) return;
    window.open(url, '_blank');
}
function closeWebView() {}
function webviewGoBack() {}
function webviewReload() {
}

function webviewOpenExternal() {}
function webviewCopyUrl() {
    if (false) {
        showToast('لینک کپی شد');
    }
}

// ====================================================
// رهگیری سراسری لینک‌ها → باز کردن در مرورگر داخلی
// ====================================================
document.addEventListener('click', function(e) {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    // لینک‌های خالی، هش، جاوااسکریپت → بذار عادی عمل کنه
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    // لینک‌های دانلود مستقیم فایل → بذار دانلود بشه
    if (anchor.hasAttribute('download')) return;
    if (/\.(mp3|mp4|m4a|wav|ogg|mkv|webm|pdf|zip|rar|apk)(\?|$)/i.test(href)) return;
    // لینک‌های داخلی اپ (بدون http) → بذار عادی عمل کنه
    if (!href.startsWith('http://') && !href.startsWith('https://')) return;
    // لینک‌های به خود اپ → بذار عادی عمل کنه
    try {
        const linkHost = new URL(href).hostname;
        if (linkHost === window.location.hostname) return;
    } catch(ex) { return; }
    // اگه داخل iframe هست رهگیری نکن
    if (anchor.closest('iframe')) return;
    // اگه داخل پنل ادمین هست رهگیری نکن
    if (document.getElementById('admin-panel')) return;

    e.preventDefault();
    e.stopPropagation();
    openWebView(href);
}, true);

// ====================================================
// تزریق استایل به iframe
// ====================================================
function injectCSSIntoWebView() {
    const iframe = document.getElementById('audio-webview');
    if(!iframe) return;
    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
            const style = iframeDoc.createElement('style');
            style.innerHTML = `
                header, footer, #masthead, #colophon,
                .site-header, .site-footer,
                .elementor-location-header, .elementor-location-footer,
                .main-header, .main-footer, nav.main-navigation
                { display: none !important; }
                body { padding-top: 0 !important; margin-top: 0 !important; }
            `;
            iframeDoc.head.appendChild(style);
        }
    } catch (e) {
        console.warn("CORS limitation for iframe styling.");
    }
}

function injectCSSIntoPaymentWebView() {
    const iframe = document.getElementById('payment-iframe');
    if (!iframe) return;
    try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc) {
            const s = doc.createElement('style');
            s.innerHTML = `header,footer,#masthead,#colophon,.site-header,.site-footer,.elementor-location-header,.elementor-location-footer,.main-header,.main-footer,nav.main-navigation,.sidebar,.widget-area,#secondary{display:none!important;}body{padding-top:0!important;margin-top:0!important;}`;
            doc.head.appendChild(s);
        }
    } catch(e) {}
}

// ====================================================
// موتور استخراج رسانه (مشترک بین سخنرانی، رسانه، اخبار)
// ====================================================
function extractMediaFromPost(post) {
    const postString = JSON.stringify(post).replace(/\\u002F/g, '/').replace(/\\+\//g, '/');

    let videos = [];
    let audioTracks = []; // [{src, title, duration, thumb}]
    let iframes = [];
    let images = [];

    const aparatRegex = /aparat\.com\/(?:video\/video\/embed\/videohash\/|embed\/(?:videohash\/)?|v\/)([a-zA-Z0-9]+)/gi;
    let amatch;
    const aparatHashes = new Set();
    while ((amatch = aparatRegex.exec(postString)) !== null) {
        if (!aparatHashes.has(amatch[1])) {
            aparatHashes.add(amatch[1]);
            iframes.push(`https://www.aparat.com/video/video/embed/videohash/${amatch[1]}/vt/frame`);
        }
    }

    // --- regex برای ویدیوهای مستقیم (نه mp3/صوت) ---
    const videoRegex = /https?:\/\/[^\s"'<>\\]+\.(mp4|mkv|webm)(?:\?[^\s"'<>\\]*)?/gi;
    (postString.match(videoRegex) || []).forEach(url => videos.push(url.replace(/\\+$/, '')));

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content.rendered;

    // ۱. استخراج گالری/پلی‌لیست صوتی وردپرس (مهم‌ترین منبع)
    const seenSrcs = new Set();
    const addTrack = (src, title='', duration='', thumb='') => {
        const clean = src.trim();
        if (!clean || seenSrcs.has(clean)) return;
        seenSrcs.add(clean);
        audioTracks.push({ src: clean, title, duration, thumb });
    };

    // روش ۱الف: regex روی HTML خام (مطمئن‌ترین روش)
    const rawHtml = post.content ? (post.content.rendered || '') : '';
    const playlistRegex = /<script[^>]+class=["'][^"']*wp-playlist-script[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
    let plMatch;
    while ((plMatch = playlistRegex.exec(rawHtml)) !== null) {
        try {
            const jsonText = plMatch[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
            const data = JSON.parse(jsonText);
            if (data.tracks && Array.isArray(data.tracks)) {
                data.tracks.forEach(t => {
                    if (t.src) addTrack(
                        t.src,
                        t.title || '',
                        (t.meta && t.meta.length_formatted) || '',
                        (t.thumb && t.thumb.src) || ''
                    );
                });
            }
        } catch(e) {}
    }

    // روش ۱ب: querySelectorAll (فال‌بک برای مرورگرهایی که اسکریپت را در DOM نگه می‌دارند)
    tempDiv.querySelectorAll('script.wp-playlist-script').forEach(script => {
        try {
            const data = JSON.parse(script.textContent);
            if (data.tracks && Array.isArray(data.tracks)) {
                data.tracks.forEach(t => {
                    if (t.src) addTrack(
                        t.src,
                        t.title || '',
                        (t.meta && t.meta.length_formatted) || '',
                        (t.thumb && t.thumb.src) || ''
                    );
                });
            }
        } catch(e) {}
    });

    // ۲. استخراج از ضمیمه‌های WP REST API
    if (post._embedded && post._embedded['wp:attachment']) {
        post._embedded['wp:attachment'].forEach(group => {
            const items = Array.isArray(group) ? group : [group];
            items.forEach(att => {
                if (att.mime_type && att.mime_type.startsWith('audio/') && att.source_url) {
                    const title = (att.title && att.title.rendered) ? att.title.rendered : '';
                    addTrack(att.source_url, title);
                }
            });
        });
    }

    // ۳. استخراج از تگ <audio> مستقیم در HTML
    tempDiv.querySelectorAll('audio').forEach(el => {
        const src = el.getAttribute('src');
        if (src) addTrack(src);
        el.querySelectorAll('source').forEach(s => { if (s.getAttribute('src')) addTrack(s.getAttribute('src')); });
    });

    // ۴. لینک‌های دانلود فایل صوتی
    tempDiv.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href.match(/\.(mp3|m4a|wav|ogg)(\?|$)/i)) addTrack(href);
    });

    // ۵. regex روی JSON string (فال‌بک)
    const audioRegex = /https?:\/\/[^\s"'<>\\]+\.(mp3|m4a|wav|ogg)(?:\?[^\s"'<>\\]*)?/gi;
    (postString.match(audioRegex) || []).forEach(url => addTrack(url.replace(/\\+$/, '')));

    // استخراج iframe آپارات از DOM
    tempDiv.querySelectorAll('iframe').forEach(ifr => {
        const src = ifr.getAttribute('src') || '';
        if (src.includes('aparat.com')) {
            const hm = src.match(/aparat\.com\/(?:video\/video\/embed\/videohash\/|embed\/(?:videohash\/)?|v\/)([a-zA-Z0-9]+)/i);
            if (hm && !aparatHashes.has(hm[1])) {
                aparatHashes.add(hm[1]);
                iframes.push(`https://www.aparat.com/video/video/embed/videohash/${hm[1]}/vt/frame`);
            }
        } else if (src && !src.includes('aparat.com')) {
            iframes.push(src);
        }
    });

    tempDiv.querySelectorAll('img').forEach(img => {
        if(img.src && !img.src.includes('emoji')) images.push(img.src);
    });

    const removeSelectors = [
        '.wp-playlist', '.wp-playlist-script', '.wp-playlist-current-item',
        '.wp-playlist-tracks', '.wp-playlist-item', '.wp-playlist-caption',
        '.wp-playlist-next', '.wp-playlist-prev', '.wp-playlist-playing',
        'audio', 'video', 'iframe', 'img',
        '.mejs-container', '.mejs-controls', '.mejs-time', '.mejs-layers',
        '.mejs-captions-button', '.mejs-volume-button', '.mejs-speed-button',
        '.wp-audio-shortcode', '.wp-video-shortcode',
        '.audio-player', '[class*="audio-player"]', '[class*="sound-player"]',
        'figure.wp-block-audio', 'figure.wp-block-video', 'figure.wp-block-embed',
        'figure.wp-block-image', 'figure.wp-block-gallery'
    ];
    tempDiv.querySelectorAll(removeSelectors.join(', ')).forEach(el => el.remove());

    tempDiv.querySelectorAll('a').forEach(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        if(href.match(/\.(mp3|mp4|m4a|wav|ogg|mkv|webm)(\?|$)/)) a.remove();
    });

    let cleanHtml = tempDiv.innerHTML;
    cleanHtml = cleanHtml.replace(/\b(Play|Stop|Pause|Mute|Unmute|00:00)\b/gi, '');
    cleanHtml = cleanHtml.replace(/پخش|توقف|لیست پخش|صدا/g, '');
    cleanHtml = cleanHtml.replace(/متن تفسیر/g, '');
    cleanHtml = cleanHtml.replace(/صوت جلسه[:\s]*/g, '');
    cleanHtml = cleanHtml.replace(/فیلم جلسه[:\s]*/g, '');
    cleanHtml = cleanHtml.replace(/دریافت فایل صوتی/g, '');
    cleanHtml = cleanHtml.replace(/در حال بارگذاری\.*/gi, '');
    cleanHtml = cleanHtml.replace(/انتخاب آهنگ[.‌‍\s]*/g, '');
    cleanHtml = cleanHtml.replace(/Select\s+Track[.‌\s]*/gi, '');
    // پاک کردن نمایشگر زمان و سرعت پلیر وردپرس
    cleanHtml = cleanHtml.replace(/\d+:\d+\s*\/\s*\d+:\d+/g, '');
    cleanHtml = cleanHtml.replace(/\d+:\d+\s+\d+:\d+/g, '');
    cleanHtml = cleanHtml.replace(/\d+:\d{2}/g, '');
    cleanHtml = cleanHtml.replace(/\b\d+[xX×]\b/g, '');

    tempDiv.innerHTML = cleanHtml;

    tempDiv.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, strong, b, em').forEach(el => {
        if (el.innerHTML.trim() === '' || el.innerHTML === '&nbsp;' || el.textContent.trim() === '') el.remove();
    });

    return {
        iframes:     [...new Set(iframes)],
        videos:      [...new Set(videos)],
        audioTracks, // [{src, title, duration, thumb}]
        audios:      audioTracks.map(t => t.src), // backward compat
        images:      [...new Set(images)],
        cleanHtml:   tempDiv.innerHTML
    };
}
