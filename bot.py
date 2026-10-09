import os
import requests
import time

# توکن از متغیر محیطی خوانده می‌شود (امنیت بالا)
BOT_TOKEN = os.environ.get("BOT_TOKEN")
BASE_URL = f"https://botapi.rubika.ir/v3/{BOT_TOKEN}"

last_update_id = 0

def get_updates(offset_id=0):
    url = f"{BASE_URL}/getUpdates"
    payload = {"limit": 10}
    if offset_id:
        payload["offset_id"] = offset_id
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print("Error getting updates: " + str(e))
        return None

def send_message(chat_id, text):
    url = f"{BASE_URL}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print("Error sending message: " + str(e))
        return None

def main():
    global last_update_id
    print("Bot is running...")
    while True:
        updates = get_updates(offset_id=last_update_id)
        if updates and updates.get("status") == "OK":
            for update in updates.get("result", []):
                last_update_id = update.get("update_id", 0)
                new_message = update.get("new_message")
                if not new_message:
                    continue
                chat_id = new_message.get("chat_id")
                text = new_message.get("text", "").strip()
                print("Message received: " + text)
                if text == "/start":
                    send_message(chat_id, "Hello! I am your bot.")
                else:
                    send_message(chat_id, "You said: " + text)
        time.sleep(2)

if __name__ == "__main__":
    main()
