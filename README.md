# CyberPodolia Portfolio - Flask Version

Simple Python/Flask implementation with vanilla JavaScript.

## Features

- ✅ Drag & resize widgets (Gridstack.js)
- ✅ Auto-save layout to localStorage
- ✅ Contact form with Telegram API
- ✅ Reset & Share buttons
- ✅ No React, no build process, no CSP issues

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the app:
```bash
python app.py
```

3. Open browser:
```
http://localhost:5000
```

## Project Structure

```
flask_app/
├── app.py                  # Flask application
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── style.css      # Styles
    └── js/
        └── app.js         # JavaScript (Gridstack + contact form)
```

## Deployment

For production deployment on your server, you can:

1. **Option 1: Simple Flask** (for testing)
   ```bash
   python app.py
   ```

2. **Option 2: Gunicorn** (recommended for production)
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

3. **Option 3: Static HTML** (if you don't need contact form)
   - Just upload `templates/index.html` and `static/` folder
   - Modify paths in index.html to point to static files
   - Contact form won't work without backend

## Configuration

The app reads Telegram credentials from `../telegram_secret.php` (same as PHP version).

If that file doesn't exist, contact form will return 500 error.
