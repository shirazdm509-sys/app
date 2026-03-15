// ====================================================
// بررسی Tailwind هنگام لود
// ====================================================
window.addEventListener('load', () => {
    if (typeof tailwind === 'undefined') {
        const txt = document.getElementById('loading-text');
        const spn = document.getElementById('loading-spinner');
        if (txt) txt.innerHTML = '<span style="color:#ef4444;font-size:16px;">❌ اینترنت شما مسدود است!</span><br><br>لطفاً فیلترشکن خود را روشن کرده و صفحه را رفرش کنید.';
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
// WebView Modal
// ====================================================
function openWebView(url) {
    if (!url) return;
    const modal = document.getElementById('webview-modal');
    const iframe = document.getElementById('webview-iframe');
    const urlBar = document.getElementById('webview-url-bar');
    const loading = document.getElementById('webview-loading');
    try { urlBar.textContent = new URL(url).hostname; } catch(e) { urlBar.textContent = url; }
    loading.classList.remove('hidden');
    iframe.src = '';
    iframe.onload = () => {
        loading.classList.add('hidden');
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.querySelectorAll('a[target="_blank"], a[target="_top"], a[target="_parent"]').forEach(a => {
                a.removeAttribute('target');
            });
        } catch(e) {}
    };
    iframe.src = url;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeWebView() {
    const modal = document.getElementById('webview-modal');
    const iframe = document.getElementById('webview-iframe');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    iframe.src = '';
}

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
    const postString = JSON.stringify(post).replace(/\\u002F/g, '/').replace(/\\\//g, '/');

    let videos = [];
    let audios = [];
    let iframes = [];
    let images = [];

    const mediaRegex = /https?:\/\/[^\s"'<>]+\.(mp3|m4a|wav|ogg|mp4|mkv|webm)(?:\?[^\s"'<>]*)?/gi;
    const matches = postString.match(mediaRegex) || [];
    matches.forEach(url => {
        const lower = url.toLowerCase();
        if (lower.includes('.mp4') || lower.includes('.mkv') || lower.includes('.webm')) videos.push(url);
        else audios.push(url);
    });

    const aparatRegex = /aparat\.com\/(?:video\/video\/embed\/videohash\/|embed\/(?:videohash\/)?|v\/)([a-zA-Z0-9]+)/gi;
    let amatch;
    const aparatHashes = new Set();
    while ((amatch = aparatRegex.exec(postString)) !== null) {
        if (!aparatHashes.has(amatch[1])) {
            aparatHashes.add(amatch[1]);
            iframes.push(`https://www.aparat.com/video/video/embed/videohash/${amatch[1]}/vt/frame`);
        }
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content.rendered;

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
        '.wp-playlist', '.wp-playlist-script', 'audio', 'video', 'iframe', 'img',
        '.mejs-container', '.mejs-controls', '.wp-audio-shortcode', '.wp-video-shortcode',
        '.audio-player', 'figure.wp-block-audio', 'figure.wp-block-video', 'figure.wp-block-embed', 'figure.wp-block-image', 'figure.wp-block-gallery'
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
    cleanHtml = cleanHtml.replace(/دریافت فایل صوتی/g, '');

    tempDiv.innerHTML = cleanHtml;

    tempDiv.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, strong, b, em').forEach(el => {
        if (el.innerHTML.trim() === '' || el.innerHTML === '&nbsp;' || el.textContent.trim() === '') el.remove();
    });

    return {
        iframes: [...new Set(iframes)],
        videos: [...new Set(videos)],
        audios: [...new Set(audios)],
        images: [...new Set(images)],
        cleanHtml: tempDiv.innerHTML
    };
}
