// Free-floating Windows system with interact.js
const STORAGE_KEY = 'cyberpodolia_windows_v1';
let topZIndex = 100;

document.addEventListener('DOMContentLoaded', () => {
    initWindows();
    loadWindowPositions();
    setupButtons();
    setupContactForm();
});

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ windows, topZIndex }));
}

function loadWindowPositions() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
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
    } catch (e) {
        console.error('Failed to load window positions:', e);
    }
}

function setupButtons() {
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Reset all windows to default positions?')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });

    document.getElementById('share-btn').addEventListener('click', () => {
        const data = localStorage.getItem(STORAGE_KEY);
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

function setStatus(type, message) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `chat-widget__status chat-widget__status--${type}`;
}

// Load layout from URL if present
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('layout');
    if (encoded) {
        try {
            const data = atob(encoded);
            localStorage.setItem(STORAGE_KEY, data);
            location.reload();
        } catch (e) {
            console.error('Failed to load layout from URL:', e);
        }
    }
});
