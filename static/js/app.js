// Free-floating Windows system with interact.js
const STORAGE_KEY_DESKTOP = 'cyberpodolia_windows_v1';
const STORAGE_KEY_MOBILE = 'cyberpodolia_windows_mobile_v1';
const MOBILE_BREAKPOINT = 900;
const layoutQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
const isMobile = layoutQuery.matches;
let topZIndex = 100;
let allowSave = false;
let defaultLayout = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheDefaultLayout();
    if (!isMobile) {
        allowSave = false;
        initWindows();
        const loaded = loadWindowPositions();
        if (!loaded) {
            scheduleCenterWindowsGroup();
        } else {
            allowSave = true;
        }
    }
    setupButtons();
    setupContactForm();
    setupImageOverlay();
    initWebGLBackground();
    setupBreakpointReload();
});

function cacheDefaultLayout() {
    const layout = {};
    document.querySelectorAll('.window').forEach((win) => {
        const id = win.dataset.id;
        layout[id] = {
            left: win.style.left || '',
            top: win.style.top || '',
            width: win.style.width || '',
            height: win.style.height || '',
            zIndex: win.style.zIndex || ''
        };
    });
    defaultLayout = layout;
}

function initWindows() {
    const windows = document.querySelectorAll('.window');

    windows.forEach((win, index) => {
        // Set initial z-index
        win.style.zIndex = topZIndex + index;

        // Make draggable (only from title bar)
        interact(win)
            .draggable({
                allowFrom: '.widget__title',
                ignoreFrom: 'input, textarea, button, select, a',
                inertia: false,
                modifiers: [],
                listeners: {
                    start(event) {
                        bringToFront(event.target);
                        event.target.classList.add('dragging');
                    },
                    move(event) {
                        const target = event.target;
                        let x = parseFloat(target.getAttribute('data-x')) || parseFloat(target.style.left) || 0;
                        let y = parseFloat(target.getAttribute('data-y')) || parseFloat(target.style.top) || 0;

                        x += event.dx;
                        y += event.dy;

                        target.style.left = x + 'px';
                        target.style.top = y + 'px';

                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    },
                    end(event) {
                        event.target.classList.remove('dragging');
                        saveWindowPositions();
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: false },
                ignoreFrom: '.widget__title, input, textarea, button, select, a',
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 200, height: 150 }
                    })
                ],
                listeners: {
                    start(event) {
                        bringToFront(event.target);
                        event.target.classList.add('resizing');
                    },
                    move(event) {
                        const target = event.target;
                        let x = parseFloat(target.style.left) || 0;
                        let y = parseFloat(target.style.top) || 0;

                        target.style.width = event.rect.width + 'px';
                        target.style.height = event.rect.height + 'px';

                        x += event.deltaRect.left;
                        y += event.deltaRect.top;

                        target.style.left = x + 'px';
                        target.style.top = y + 'px';
                    },
                    end(event) {
                        event.target.classList.remove('resizing');
                        saveWindowPositions();
                    }
                }
            });

        // Click to bring to front
        win.addEventListener('mousedown', () => {
            bringToFront(win);
        });
    });

    // Set first window as active
    if (windows.length > 0) {
        bringToFront(windows[0]);
    }
}

function bringToFront(win) {
    topZIndex++;
    win.style.zIndex = topZIndex;

    // Remove active class from all
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active-window');
    });

    // Add active class to current
    win.classList.add('active-window');

    saveWindowPositions();
}

function saveWindowPositions() {
    if (isMobile || !allowSave) return;
    const windows = {};
    document.querySelectorAll('.window').forEach(win => {
        const id = win.dataset.id;
        windows[id] = {
            left: win.style.left,
            top: win.style.top,
            width: win.style.width,
            height: win.style.height,
            zIndex: win.style.zIndex
        };
    });
    localStorage.setItem(STORAGE_KEY_DESKTOP, JSON.stringify({ windows, topZIndex }));
}

function loadWindowPositions() {
    if (isMobile) return false;
    const saved = localStorage.getItem(STORAGE_KEY_DESKTOP);
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        if (!data || !data.windows || typeof data.windows !== 'object') {
            return false;
        }
        topZIndex = data.topZIndex || 100;

        document.querySelectorAll('.window').forEach(win => {
            const id = win.dataset.id;
            if (data.windows[id]) {
                const pos = data.windows[id];
                win.style.left = pos.left;
                win.style.top = pos.top;
                win.style.width = pos.width;
                win.style.height = pos.height;
                win.style.zIndex = pos.zIndex;
            }
        });
        return Object.keys(data.windows).length > 0;
    } catch (e) {
        console.error('Failed to load window positions:', e);
        return false;
    }
}

function setupButtons() {
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Reset all windows to default positions?')) {
            if (isMobile) {
                localStorage.removeItem(STORAGE_KEY_MOBILE);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            localStorage.removeItem(STORAGE_KEY_DESKTOP);
            allowSave = false;
            restoreDefaultLayout();
            centerWindowsGroup();
            allowSave = true;
        }
    });

    document.getElementById('share-btn').addEventListener('click', () => {
        if (isMobile) {
            alert('Sharing is available on desktop layouts only.');
            return;
        }
        const data = localStorage.getItem(STORAGE_KEY_DESKTOP);
        if (!data) {
            alert('No custom layout to share');
            return;
        }

        const encoded = btoa(data);
        const url = new URL(window.location.href);
        url.searchParams.set('layout', encoded);

        navigator.clipboard.writeText(url.toString()).then(() => {
            alert('Shareable link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy link');
        });
    });
}

// Contact Form
function setupContactForm() {
    const form = document.getElementById('contact-form');
    const statusEl = document.getElementById('status-message');
    const sendBtn = document.getElementById('send-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const company = document.getElementById('contact-company').value;
        const message = document.getElementById('contact-message').value;
        const website = document.getElementById('contact-website').value;

        if (!message) {
            setStatus('error', 'Message is required.');
            return;
        }

        setStatus('sending', 'Sending...');
        sendBtn.disabled = true;

        const clientMeta = {
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screen: {
                w: window.screen.width,
                h: window.screen.height,
                dpr: window.devicePixelRatio
            },
            timestamp: new Date().toISOString()
        };

        const payload = {
            name,
            email,
            company,
            message,
            website,
            clientMeta
        };

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 202) {
                setStatus('sent', 'Message sent successfully!');
                document.getElementById('contact-message').value = '';
            } else {
                const errorData = await response.json();
                setStatus('error', `Error: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            setStatus('error', 'Network error. Please try again.');
        } finally {
            sendBtn.disabled = false;
        }
    });
}

function restoreDefaultLayout() {
    let maxZ = 100;
    document.querySelectorAll('.window').forEach((win) => {
        const id = win.dataset.id;
        const defaults = defaultLayout[id];
        if (!defaults) return;
        win.style.left = defaults.left;
        win.style.top = defaults.top;
        win.style.width = defaults.width;
        win.style.height = defaults.height;
        win.style.zIndex = defaults.zIndex;
        win.setAttribute('data-x', defaults.left ? parseFloat(defaults.left) : 0);
        win.setAttribute('data-y', defaults.top ? parseFloat(defaults.top) : 0);
        const z = parseFloat(defaults.zIndex);
        if (!Number.isNaN(z)) {
            maxZ = Math.max(maxZ, z);
        }
    });
    topZIndex = maxZ;
}

function setupImageOverlay() {
    const overlay = document.getElementById('image-overlay');
    const overlayImg = document.getElementById('image-overlay-img');
    if (!overlay || !overlayImg) return;

    const openOverlay = (src, alt) => {
        overlayImg.src = src;
        overlayImg.alt = alt || 'Screenshot';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
    };

    const closeOverlay = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        overlayImg.src = '';
        overlayImg.alt = '';
    };

    document.querySelectorAll('[data-overlay-src]').forEach((thumb) => {
        thumb.addEventListener('click', (event) => {
            event.preventDefault();
            const src = thumb.getAttribute('data-overlay-src');
            const img = thumb.querySelector('img');
            openOverlay(src, img ? img.alt : 'Screenshot');
        });
    });

    overlay.addEventListener('click', () => {
        closeOverlay();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
            closeOverlay();
        }
    });
}

function setStatus(type, message) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `chat-widget__status chat-widget__status--${type}`;
}

function initWebGLBackground() {
    const canvas = document.getElementById('bg-webgl');
    if (!canvas) return;

    const rootEl = document.documentElement;
    const enableFallback = () => {
        rootEl.classList.add('no-webgl');
    };

    const testCanvas = document.createElement('canvas');
    const testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!testGl || !window.createREGL) {
        enableFallback();
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let regl;
    try {
        regl = window.createREGL({
            canvas,
            attributes: {
                antialias: false,
                alpha: true,
                preserveDrawingBuffer: false,
                powerPreference: 'low-power'
            }
        });
    } catch (e) {
        enableFallback();
        return;
    }

    const fallbackFrag = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution.xy;
  vec2 c=uv-0.5; c.x*=u_resolution.x/u_resolution.y;
  float t=u_time*0.05;
  vec3 a=vec3(0.08,0.12,0.20), b=vec3(0.16,0.24,0.34), d=vec3(0.12,0.18,0.26);
  float flow=sin((c.x+t)*1.2)*0.12+cos((c.y-t)*1.4)*0.12;
  vec3 l1=mix(a,b,smoothstep(-0.6,0.6,c.y+flow));
  float blob=noise(c*2.2+vec2(t*1.4,-t*1.1));
  blob=smoothstep(0.25,0.75,blob);
  vec3 l2=mix(l1,d,blob*0.35);
  l2+=sin((c.x+c.y+t*1.8)*2.2)*0.02;
  float grain=hash(gl_FragCoord.xy+u_time)*0.04;
  vec3 col=l2+grain;
  float m=(u_mouse.x/max(u_resolution.x,1.0)-0.5)*0.08;
  col+=vec3(m,0.0,-m);
  col=pow(col,vec3(0.98));
  gl_FragColor=vec4(col,1.0);
}
`;

    const startTime = performance.now();
    let dpr = 1;
    let width = 0;
    let height = 0;
    const mouse = [0, 0];

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.floor(window.innerWidth * dpr);
        height = Math.floor(window.innerHeight * dpr);
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        if (regl) {
            regl.poll();
        }
    };

    const updateMouse = (x, y) => {
        mouse[0] = x * dpr;
        mouse[1] = (window.innerHeight - y) * dpr;
    };

    const setupRenderer = (fragSource) => {
        try {
            resize();
            window.addEventListener('resize', resize, { passive: true });
            window.addEventListener('mousemove', (event) => {
                updateMouse(event.clientX, event.clientY);
            }, { passive: true });
            window.addEventListener('touchmove', (event) => {
                if (event.touches && event.touches.length > 0) {
                    const touch = event.touches[0];
                    updateMouse(touch.clientX, touch.clientY);
                }
            }, { passive: true });

            // Future multi-pass: add additional draw calls or a ping-pong pass here.
            const draw = regl({
                frag: fragSource,
                vert: `
precision mediump float;
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`,
                attributes: {
                    position: [-1, -1, 3, -1, -1, 3]
                },
                uniforms: {
                    u_time: () => (performance.now() - startTime) / 1000,
                    u_resolution: () => [width, height],
                    u_mouse: () => mouse
                },
                count: 3
            });

            let rafId = null;
            let running = false;

            const render = () => {
                if (!running) return;
                regl.clear({ color: [0, 0, 0, 1], depth: 1 });
                draw();
                rafId = requestAnimationFrame(render);
            };

            const start = () => {
                if (running) return;
                running = true;
                rafId = requestAnimationFrame(render);
            };

            const stop = () => {
                running = false;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            };

            if (reduceMotion) {
                regl.clear({ color: [0, 0, 0, 1], depth: 1 });
                draw();
            } else {
                start();
            }

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    stop();
                    return;
                }
                if (!reduceMotion) {
                    start();
                }
            });
        } catch (e) {
            enableFallback();
        }
    };

    fetch('/static/shaders/bg.frag', { cache: 'no-store' })
        .then((response) => (response.ok ? response.text() : Promise.reject(new Error('Shader fetch failed'))))
        .then((source) => setupRenderer(source))
        .catch(() => setupRenderer(fallbackFrag));
}

// Load layout from URL if present
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('layout');
    if (encoded) {
        try {
            const data = atob(encoded);
            if (isMobile) return;
            localStorage.setItem(STORAGE_KEY_DESKTOP, data);
            location.reload();
        } catch (e) {
            console.error('Failed to load layout from URL:', e);
        }
    }
});

function scheduleCenterWindowsGroup() {
    allowSave = false;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            centerWindowsGroup();
            allowSave = true;
        });
    });
}

function centerWindowsGroup() {
    if (isMobile) return;
    const desktop = document.querySelector('.desktop');
    if (!desktop) return;
    const windows = Array.from(document.querySelectorAll('.window'));
    if (windows.length === 0) return;

    const padding = 16;
    const desktopWidth = desktop.clientWidth;
    const desktopHeight = Math.max(desktop.clientHeight, window.innerHeight - desktop.getBoundingClientRect().top);

    const getWindowSize = (win) => {
        const rect = win.getBoundingClientRect();
        const width = rect.width || parseFloat(win.style.width) || 280;
        const height = rect.height || parseFloat(win.style.height) || 200;
        return { width, height };
    };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    windows.forEach((win) => {
        const { width, height } = getWindowSize(win);
        const left = parseFloat(win.style.left) || 0;
        const top = parseFloat(win.style.top) || 0;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + width);
        maxY = Math.max(maxY, top + height);
    });

    const groupWidth = maxX - minX;
    const groupHeight = maxY - minY;
    const offsetX = Math.round((desktopWidth - groupWidth) / 2 - minX);
    const offsetY = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    windows.forEach((win) => {
        const { width, height } = getWindowSize(win);
        const currentLeft = parseFloat(win.style.left) || 0;
        const currentTop = parseFloat(win.style.top) || 0;
        const maxLeft = Math.max(padding, desktopWidth - width - padding);
        const nextLeft = clamp(currentLeft + offsetX, padding, maxLeft);
        const nextTop = currentTop + offsetY;

        win.style.left = `${nextLeft}px`;
        win.style.top = `${nextTop}px`;
        win.setAttribute('data-x', nextLeft);
        win.setAttribute('data-y', nextTop);
    });
}

function setupBreakpointReload() {
    const handler = () => {
        window.location.reload();
    };
    if (layoutQuery.addEventListener) {
        layoutQuery.addEventListener('change', handler);
    } else if (layoutQuery.addListener) {
        layoutQuery.addListener(handler);
    }
}
