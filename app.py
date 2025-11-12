from flask import Flask, render_template, request, jsonify
from base64 import b64decode
import os

# Server verification uses only the PUBLIC key. Signing stays in-browser.
try:
    from nacl.signing import VerifyKey
    from nacl.exceptions import BadSignatureError
    HAVE_NACL = True
except Exception:
    HAVE_NACL = False

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.after_request
def set_security_headers(resp):
    # Allow our CDN fonts + tailwind + jsdelivr; keep it tight otherwise.
    csp = (
        "default-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com 'self'; "
        "script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
        "connect-src 'self'; "
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )
    resp.headers["Content-Security-Policy"] = csp
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resp

@app.get("/")
def index():
    return render_template("index.html")

@app.post("/api/verify")
def api_verify():
    if not HAVE_NACL:
        return jsonify({"valid": False, "error": "Server verification unavailable"}), 200
    data = request.get_json(force=True, silent=True) or {}
    message = data.get("message", "").encode("utf-8")
    signature_b64 = data.get("signature", "")
    pubkey_b64 = data.get("public_key_b64", "")
    try:
        sig = b64decode(signature_b64)
        pub = b64decode(pubkey_b64)
        vk = VerifyKey(pub)
        vk.verify(message, sig)
        return jsonify({"valid": True})
    except (ValueError, BadSignatureError):
        return jsonify({"valid": False})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
