/* ===== Utils ===== */
const $  = s => document.querySelector(s);
const enc = new TextEncoder();

function bytesToHex(u8){ return Array.from(u8).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function hexToBytes(hex){
  const s = (hex||"").trim().replace(/^0x/,'');
  if (!s) return new Uint8Array();
  if (s.length % 2) throw new Error("even-length hex only");
  const out = new Uint8Array(s.length/2);
  for (let i=0;i<s.length;i+=2) out[i/2] = parseInt(s.slice(i,i+2),16);
  return out;
}
function b64(bytes){ let bin=""; bytes.forEach(b=> bin+=String.fromCharCode(b)); return btoa(bin); }
function fromB64(str){
  const clean = (str||"").trim().replace(/^ed25519:\s*/i,'').replace(/^\/\/sig:/,'');
  const bin = atob(clean); const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ===== Storage ===== */
const COOKIE = 'tweetproof_seed_hex';
function setCookie(name,val,days=365){ const d=new Date(); d.setTime(d.getTime()+days*864e5); document.cookie = `${name}=${encodeURIComponent(val)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`; }
function getCookie(name){ const n=name+'='; return document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(n))?.slice(n.length)||null; }
function delCookie(name){ document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`; }

/* ===== Toasts ===== */
function toast(text){
  const box = $('#toaster');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(()=>el.remove(), 220); }, 1600);
}

/* ===== Smooth scroll from hero buttons ===== */
document.querySelectorAll('.js-scroll').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' });
    }
  });
});

/* ===== Elements ===== */
const seedEl   = $('#seed');
const pubhexEl = $('#pubhex');
const bioEl    = $('#bioline');
const tweetEl  = $('#tweet');
const outEl    = $('#output');
const charEl   = $('#charcount');
const vMsg     = $('#v-msg');
const vSig     = $('#v-sig');
const vPub     = $('#v-pub');
const vStatus  = $('#verify-status');

/* ===== Derive public key ===== */
function deriveAndShow(){
  try {
    const seed = hexToBytes(seedEl.value);
    if (seed.length !== 32) { pubhexEl.value=''; bioEl.value=''; return; }
    const kp = nacl.sign.keyPair.fromSeed(seed);
    pubhexEl.value = bytesToHex(kp.publicKey);
    bioEl.value = `ed25519: ${b64(kp.publicKey)}`;
  } catch {
    pubhexEl.value=''; bioEl.value='';
  }
}

/* ===== Sign ===== */
function doSign(){
  if (!seedEl.value) { outEl.value = 'No private key loaded.'; return; }
  const msg = (tweetEl.value || '').trim();
  if (!msg) { outEl.value = 'Empty tweet.'; return; }
  try {
    const seed = hexToBytes(seedEl.value);
    const kp = nacl.sign.keyPair.fromSeed(seed);
    const sig = nacl.sign.detached(enc.encode(msg), kp.secretKey);
    outEl.value = `${msg}\n//sig:${b64(sig)}`;
  } catch {
    outEl.value = 'Failed to sign. Check key format.';
  }
}

/* ===== Verify (client) ===== */
function verifyClient(){
  vStatus.textContent = '';
  const msg = (vMsg.value||'').trim();
  try{
    const sig = fromB64(vSig.value);
    const pub = fromB64(vPub.value);
    const ok = nacl.sign.detached.verify(enc.encode(msg), sig, pub);
    vStatus.textContent = ok ? '✓ Valid (client)' : '✗ Invalid (client)';
    vStatus.className = 'muted';
  }catch{
    vStatus.textContent = '✗ Invalid input';
    vStatus.className = 'muted';
  }
}

/* ===== Verify (server) ===== */
async function verifyServer(){
  vStatus.textContent = '…';
  const body = JSON.stringify({
    message: (vMsg.value||'').trim(),
    signature: (vSig.value||'').trim().replace(/^\/\/sig:/,''),
    public_key_b64: (vPub.value||'').trim().replace(/^ed25519:\s*/i,'')
  });
  try{
    const res = await fetch('/api/verify', {method:'POST', headers:{'Content-Type':'application/json'}, body});
    const j = await res.json();
    vStatus.textContent = j.valid ? '✓ Valid (server)' : '✗ Invalid (server)';
    vStatus.className = 'muted';
  }catch{
    vStatus.textContent = 'Server verification unavailable';
    vStatus.className = 'muted';
  }
}

/* ===== Counters ===== */
function updateChars(){ charEl.textContent = `${tweetEl.value.length} chars`; }

/* ===== Bindings ===== */
$('#btn-generate').onclick = () => {
  const kp = nacl.sign.keyPair();
  seedEl.value = bytesToHex(kp.secretKey.slice(0,32));
  deriveAndShow(); toast('Keypair generated');
};
$('#btn-save').onclick = () => {
  if (!seedEl.value) return;
  setCookie(COOKIE, seedEl.value);
  try { localStorage.setItem(COOKIE, seedEl.value); } catch {}
  toast('Key saved locally');
};
$('#btn-clear').onclick = () => {
  seedEl.value = '';
  delCookie(COOKIE);
  try { localStorage.removeItem(COOKIE); } catch {}
  deriveAndShow(); toast('Key cleared');
};
$('#btn-copy-seed').onclick  = () => { if (seedEl.value) navigator.clipboard.writeText(seedEl.value).then(()=>toast('Copied')); };
$('#btn-paste-seed').onclick = async () => { const t = await navigator.clipboard.readText(); seedEl.value = t; deriveAndShow(); };
$('#btn-copy-bio').onclick   = () => { if (bioEl.value) navigator.clipboard.writeText(bioEl.value).then(()=>toast('Copied')); };
$('#btn-sign').onclick        = doSign;
$('#btn-copy-tweet').onclick  = () => { if (tweetEl.value) navigator.clipboard.writeText(tweetEl.value).then(()=>toast('Copied')); };
$('#btn-copy-output').onclick = () => { if (outEl.value) navigator.clipboard.writeText(outEl.value).then(()=>toast('Copied')); };
$('#btn-verify-client').onclick = verifyClient;
$('#btn-verify-server').onclick = verifyServer;

tweetEl.addEventListener('input', updateChars);
seedEl.addEventListener('input', deriveAndShow);

/* ===== Init ===== */
(function init(){
  const saved = getCookie(COOKIE) || localStorage.getItem(COOKIE);
  if (saved) seedEl.value = saved;
  deriveAndShow();
  updateChars();
})();

(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.btn').forEach(b => b.setAttribute('data-ripple',''));
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.btn[data-ripple]');
    if (!el || prefersReduced) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - r.left}px`);
    el.style.setProperty('--y', `${e.clientY - r.top}px`);
    el.classList.add('rippling');
    setTimeout(() => el.classList.remove('rippling'), 280);
  });

  const panels = document.querySelectorAll('.panel');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  panels.forEach(p => io.observe(p));

  const tweet = document.getElementById('tweet');
  const counter = document.getElementById('charcount');
  if (tweet && counter) {
    const upd = () => {
      counter.textContent = `${tweet.value.length} chars`;
      counter.style.transition = 'transform .12s cubic-bezier(.22,.61,.36,1)';
      counter.style.transform = 'scale(1.06)';
      requestAnimationFrame(() => setTimeout(() => { counter.style.transform = 'scale(1)'; }, 80));
    };
    tweet.addEventListener('input', upd);
    upd();
  }

  const toaster = document.getElementById('toaster');
  const oldToast = window.toast;
  window.toast = (msg) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toaster.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 180); }, 1400);
    if (oldToast && oldToast !== window.toast) try { oldToast(msg); } catch {}
  };
})();
