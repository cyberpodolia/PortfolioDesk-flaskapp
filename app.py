from flask import Flask, render_template, request, jsonify
import os
import sys
import requests
from datetime import datetime

app = Flask(__name__)

# Load Telegram secrets
# flask_app/ -> public_html/ -> cyberpodolia.pl/telegram_secret.php
APP_DIR = os.path.dirname(os.path.abspath(__file__))  # flask_app/
PUBLIC_HTML_DIR = os.path.dirname(APP_DIR)  # public_html/
CYBERPODOLIA_DIR = os.path.dirname(PUBLIC_HTML_DIR)  # cyberpodolia.pl/
SECRETS_PATH = os.path.join(CYBERPODOLIA_DIR, 'telegram_secret.php')

def load_telegram_config():
    """Parse PHP config file to get Telegram credentials"""
    print(f"Looking for secrets at: {SECRETS_PATH}")
    print(f"File exists: {os.path.exists(SECRETS_PATH)}")
    if not os.path.exists(SECRETS_PATH):
        print(f"Warning: {SECRETS_PATH} not found")
        return None, None

    try:
        with open(SECRETS_PATH, 'r') as f:
            content = f.read()
            # Simple PHP array parsing
            bot_token = None
            chat_id = None
            for line in content.split('\n'):
                if 'BOT_TOKEN' in line and '=>' in line:
                    # Extract token between quotes
                    parts = line.split("'")
                    if len(parts) >= 4:
                        bot_token = parts[3]
                if 'CHAT_ID' in line and '=>' in line:
                    # Extract chat_id (can be with or without quotes)
                    parts = line.split('=>')[1].strip().rstrip(',')
                    chat_id = parts.strip("'\" ")
            return bot_token, chat_id
    except Exception as e:
        print(f"Error loading secrets: {e}")
        return None, None

BOT_TOKEN, CHAT_ID = load_telegram_config()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/contact', methods=['POST'])
def contact():
    if request.method != 'POST':
        return jsonify({'ok': False, 'error': 'Method Not Allowed'}), 405

    data = request.get_json()

    # Honeypot check
    if data.get('website'):
        return jsonify({'ok': False, 'error': 'Bad request'}), 400

    name = data.get('name', 'Anonymous').strip()
    email = data.get('email', '').strip()
    company = data.get('company', '').strip()
    message = data.get('message', '').strip()
    client_meta = data.get('clientMeta', {})

    # Validate message
    if not message or len(message) < 2 or len(message) > 4000:
        return jsonify({'ok': False, 'error': 'Message must be between 2 and 4000 characters.'}), 400

    if not BOT_TOKEN or not CHAT_ID:
        return jsonify({'ok': False, 'error': 'Server configuration error.'}), 500

    # Prepare Telegram message
    tg_message = "New Contact Form Submission:\n\n"
    tg_message += f"Name: {name}\n"
    if email:
        tg_message += f"Email: {email}\n"
    if company:
        tg_message += f"Company: {company}\n"
    tg_message += f"\nMessage:\n{message}\n\n"
    tg_message += "--- Client Info ---\n"
    tg_message += f"IP: {request.remote_addr}\n"
    tg_message += f"Timestamp: {client_meta.get('timestamp', 'N/A')}\n"
    tg_message += f"Page: {client_meta.get('pageUrl', 'N/A')}\n"
    tg_message += f"User Agent: {client_meta.get('userAgent', 'N/A')}\n"
    tg_message += f"Language: {client_meta.get('language', 'N/A')}\n"
    tg_message += f"Timezone: {client_meta.get('timeZone', 'N/A')}\n"

    if 'screen' in client_meta:
        screen = client_meta['screen']
        tg_message += f"Screen: {screen.get('w')}x{screen.get('h')} @{screen.get('dpr')}x\n"

    # Send to Telegram
    try:
        url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
        payload = {
            'chat_id': CHAT_ID,
            'text': tg_message,
            'parse_mode': 'HTML'
        }
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()

        if not result.get('ok'):
            print(f"Telegram API error: {result}")
            return jsonify({'ok': False, 'error': 'Failed to send message.'}), 500

        return jsonify({'ok': True}), 202
    except Exception as e:
        print(f"Error sending to Telegram: {e}")
        return jsonify({'ok': False, 'error': 'Failed to send message.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
