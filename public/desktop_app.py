import sys
import os
import threading
import webview

# ---- 1. IMPORT YOUR WEB APPLICATION ----
# Replace 'your_main_script' with the actual filename of your web app (without .py)
# Replace 'app' with your variable name (e.g., Flask app, FastAPI app, etc.)
try:
    from your_main_script import app 
except ImportError:
    print("Error: Could not import your web app. Check the filename in desktop_app.py!")
    sys.exit(1)

def start_server():
    """Starts your Python backend server on a dedicated local port."""
    # For FLASK:
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
    
    # For FASTAPI / ASGI (Uncomment below if using FastAPI instead of Flask):
    # import uvicorn
    # uvicorn.run(app, host="127.0.0.1", port=5000, log_level="error")

if __name__ == '__main__':
    # 2. Start the local python server in a background thread
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()

    # 3. Create a clean native window pointing directly to your localhost portal
    # Google Login works perfectly here because it runs on standard 127.0.0.1 loops
    window = webview.create_window(
        title='My Antigravity Desktop App', 
        url='http://127.0.0.1:5000',
        width=1200,
        height=800,
        resizable=True
    )
    
    # 4. Start the native desktop GUI engine
    webview.start()
