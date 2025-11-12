# tweetproof-web

A browser-based signer and verifier for **[tweetproof](https://github.com/static-metro/tweetproof)** — a minimal cryptographic proof-of-authorship system for tweets.

This web app lets you generate keys, sign tweets, and verify authenticity — all **locally** in your browser. No servers handle your private key. Ever.

---

## 🌐 Concept

Each tweet is signed locally using an **Ed25519 private key**, producing a short Base64 signature that fits inside the tweet itself:

```md
hello world
//sig:KZcOq9pHk0q8wq1w...etc...
```

Your **public key** (shared in your Twitter bio) can be used by anyone to verify the tweet.

Example bio line:

```md
ed25519: UohHSwvYySRbaqUkirG6jHgNOJnM+x5AgA4XD0E6nqY=
```

---

## ⚙️ Features

- **Generate keys** directly in the browser (Ed25519)
- **Save keys** to cookies + localStorage for persistent local use
- **Sign tweets** exactly like the CLI version (`tweetproof`)
- **Copy** your signed tweet and public key with one click
- **Optional verification endpoint** (Flask) for public verification

---

## 🧩 Architecture

This repo contains two parts:

1. **Frontend** – a client-side app (HTML + JS or React) that performs all cryptographic operations locally using [TweetNaCl.js](https://github.com/dchest/tweetnacl-js).
2. **Backend** – a minimal Flask server for serving static assets and optional public verification.

```md
tweetproof-web/
├─ app.py
├─ templates/
│  └─ index.html
├─ static/
│  └─ tweetnacl.min.js
├─ verifiers/
│  └─ verify.py
└─ requirements.txt
```

---

## 🧪 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/static-metro/tweetproof-web.git
cd tweetproof-web
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Flask app

```bash
python app.py
```

Then open your browser at **<http://127.0.0.1:5000>**

---

## 🔐 Security Model

- All key generation and signing happen in the **browser**.  
- Private keys are never sent to the server.  
- Keys are stored in cookies + localStorage under your own domain.  
- If you deploy this app, **host it yourself** — don’t trust third-party domains.

---

## 🧰 API (optional verification endpoint)

### POST /api/verify

Verify a tweet signature given message, signature, and public key.

```bash
curl -X POST https://app.tweetproof.dev/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "hello world",
    "signature": "KZcOq9pHk0q8wq1w...",
    "public_key_b64": "UohHSwvYySRbaqUkirG6jHgNOJnM+x5AgA4XD0E6nqY="
  }'
```

Response:

```json
{ "valid": true }
```

---

## 🌱 Related Projects

- **CLI / Spec:** [static-metro/tweetproof](https://github.com/static-metro/tweetproof)
- **Web App (this):** [static-metro/tweetproof-web](https://github.com/static-metro/tweetproof-web)

Both follow the same signature format and are interoperable.

---

## 📄 License

MIT License © 2025 [static-metro](https://github.com/static-metro)
