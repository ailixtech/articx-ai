// ARTICxAI chat page
// Firebase JS SDK from Google's CDN. To upgrade, change the version in all three URLs.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, updateDoc, getDocs, query, orderBy, limit,
  onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const C = window.ARTICX_CONFIG;
const $ = (id) => document.getElementById(id);
const IS_LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const MAX_SAVED_CHARS = 40000; // must match firestore.rules

// ---------- Boot ----------
let fbConfig;
try {
  fbConfig = C.firebase || await (await fetch("/__/firebase/init.json")).json();
} catch (e) {
  $("boot").textContent = "Couldn't load the Firebase configuration. Open this page through Firebase Hosting (or the Hosting emulator), or paste your web config into js/config.js.";
  throw e;
}
const app = initializeApp(fbConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const CLOUD_URL = C.cloudChatUrl || `https://${C.functionRegion}-${fbConfig.projectId}.cloudfunctions.net/chat`;

// ---------- State ----------
let user = null;
let chats = [];
let currentChatId = null;
let messages = [];
let controller = null;
let unsubChats = null;
let backend = IS_LOCAL ? (safeGet("articx-backend") || "ollama") : "cloud";
if (!IS_LOCAL || (backend !== "cloud" && !C.local[backend])) backend = IS_LOCAL ? "ollama" : "cloud";

const chatsCol = () => collection(db, "users", user.uid, "chats");
const messagesCol = (chatId) => collection(db, "users", user.uid, "chats", chatId, "messages");

// ---------- Theme ----------
function effectiveTheme() {
  return document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function syncThemeButton() { $("theme-btn").textContent = effectiveTheme() === "dark" ? "Light theme" : "Dark theme"; }
$("theme-btn").addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  safeSet("articx-theme", next);
  syncThemeButton();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeButton);
syncThemeButton();

// ---------- Auth ----------
let authMode = location.hash === "#signup" ? "signup" : "signin";
function setAuthMode(mode) {
  authMode = mode;
  const up = mode === "signup";
  $("auth-title").textContent = up ? "Create your ARTICxAI account" : "Sign in to start chatting";
  $("email-submit").textContent = up ? "Create account" : "Sign in";
  $("toggle-mode").textContent = up ? "Have an account? Sign in" : "New here? Create an account";
  $("password").autocomplete = up ? "new-password" : "current-password";
  $("forgot").hidden = up;
  showAuthMessage("");
}
setAuthMode(authMode);
$("toggle-mode").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : "signup"));

const AUTH_ERRORS = {
  "auth/invalid-credential": "That email and password don't match. Check them and try again.",
  "auth/wrong-password": "That email and password don't match. Check them and try again.",
  "auth/user-not-found": "There's no account with that email. Create one instead.",
  "auth/email-already-in-use": "An account with that email already exists. Sign in instead.",
  "auth/weak-password": "Use a password with at least 8 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/unauthorized-domain": "This domain isn't authorized for sign-in. Add it in Firebase Console under Authentication, Settings, Authorized domains."
};
function showAuthMessage(text, ok = false) {
  const el = $("auth-error");
  el.textContent = text;
  el.hidden = !text;
  el.classList.toggle("ok", ok);
}
function showAuthError(e) {
  if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;
  showAuthMessage(AUTH_ERRORS[e?.code] || `Sign-in failed (${e?.code || e?.message}).`);
}

$("google-btn").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
    } else showAuthError(e);
  }
});
getRedirectResult(auth).catch(showAuthError);

$("email-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  if (authMode === "signup" && password.length < 8) return showAuthMessage(AUTH_ERRORS["auth/weak-password"]);
  $("email-submit").disabled = true;
  try {
    if (authMode === "signup") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      sendEmailVerification(cred.user).catch(() => {});
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) { showAuthError(err); }
  finally { $("email-submit").disabled = false; }
});

$("forgot").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return showAuthMessage("Enter your email above, then select Forgot password.");
  try {
    await sendPasswordResetEmail(auth, email);
    showAuthMessage(`If an account exists for ${email}, a reset link is on its way.`, true);
  } catch (err) { showAuthError(err); }
});

$("signout-btn").addEventListener("click", () => { stopStreaming(); signOut(auth); });

onAuthStateChanged(auth, (u) => {
  user = u;
  $("boot").hidden = true;
  if (unsubChats) { unsubChats(); unsubChats = null; }
  if (!u) {
    $("app").hidden = true;
    $("auth-screen").hidden = false;
    chats = []; messages = []; currentChatId = null;
    return;
  }
  $("auth-screen").hidden = true;
  $("app").hidden = false;
  $("user-label").textContent = u.email || u.displayName || "Signed in";
  setupBackendSelect();
  unsubChats = onSnapshot(
    query(chatsCol(), orderBy("updatedAt", "desc"), limit(100)),
    (snap) => {
      chats = snap.docs.map((d) => ({ id: d.id, title: d.data().title || "Untitled chat" }));
      renderChatList();
      updateTitle();
    },
    (err) => console.error("Chat list error:", err)
  );
  routeFromHash();
  $("input").focus();
});

// ---------- Backend selector (localhost only) ----------
function setupBackendSelect() {
  if (!IS_LOCAL) return;
  const sel = $("backend-select");
  sel.innerHTML = "";
  for (const [key, b] of Object.entries(C.local)) sel.add(new Option(b.label, key));
  sel.add(new Option("Cloud Function (deployed)", "cloud"));
  sel.value = backend;
  $("backend-wrap").hidden = false;
  sel.onchange = () => { backend = sel.value; safeSet("articx-backend", backend); };
}

// ---------- Sidebar ----------
function renderChatList() {
  const list = $("chat-list");
  list.innerHTML = "";
  if (!chats.length) {
    list.innerHTML = '<p class="list-empty">Your chats will appear here.</p>';
    return;
  }
  for (const c of chats) {
    const row = document.createElement("div");
    row.className = "chat-item" + (c.id === currentChatId ? " active" : "");
    const a = document.createElement("a");
    a.href = `#c/${c.id}`;
    a.textContent = c.title;
    if (c.id === currentChatId) a.setAttribute("aria-current", "page");
    const del = document.createElement("button");
    del.className = "icon-btn del";
    del.type = "button";
    del.setAttribute("aria-label", `Delete chat: ${c.title}`);
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
    del.addEventListener("click", () => deleteChat(c.id, c.title));
    row.append(a, del);
    list.append(row);
  }
}

function openSidebar() { $("sidebar").classList.add("open"); $("scrim").hidden = false; }
function closeSidebar() { $("sidebar").classList.remove("open"); $("scrim").hidden = true; }
$("open-sidebar").addEventListener("click", openSidebar);
$("close-sidebar").addEventListener("click", closeSidebar);
$("scrim").addEventListener("click", closeSidebar);
$("new-chat").addEventListener("click", () => { location.hash = ""; newChat(); closeSidebar(); $("input").focus(); });

window.addEventListener("hashchange", () => { if (user) routeFromHash(); });
function routeFromHash() {
  const m = location.hash.match(/^#c\/([\w-]+)$/);
  if (m) { if (m[1] !== currentChatId) openChat(m[1]); closeSidebar(); }
  else if (currentChatId) newChat();
  else renderMessages();
}

function newChat() {
  stopStreaming();
  currentChatId = null;
  messages = [];
  renderMessages();
  renderChatList();
  updateTitle();
}

async function openChat(id) {
  stopStreaming();
  currentChatId = id;
  messages = [];
  renderMessages();
  renderChatList();
  updateTitle();
  try {
    const snap = await getDocs(query(messagesCol(id), orderBy("createdAt")));
    if (currentChatId !== id) return;
    messages = snap.docs.map((d) => ({ role: d.data().role, content: d.data().content }));
    renderMessages();
    scrollToBottom(true);
  } catch (e) {
    showError("Couldn't load this chat. Check your connection and refresh the page.");
    console.error(e);
  }
}

async function deleteChat(id, title) {
  if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
  try {
    const snap = await getDocs(messagesCol(id));
    const docs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((r) => batch.delete(r));
      await batch.commit();
    }
    const batch = writeBatch(db);
    batch.delete(doc(chatsCol(), id));
    await batch.commit();
    if (id === currentChatId) { location.hash = ""; newChat(); }
  } catch (e) {
    alert("Couldn't delete the chat. Check your connection and try again.");
    console.error(e);
  }
}

function updateTitle() {
  const c = chats.find((x) => x.id === currentChatId);
  const t = c ? c.title : "New chat";
  $("chat-title").textContent = t;
  document.title = `${t} — ARTICxAI`;
}

// ---------- Rendering ----------
const LIVE_TOPIC = /\b(today|tonight|yesterday|this (week|weekend|month|morning|year)|right now|latest|breaking|news|headlines?|recent(ly)?|just (happened|announced|released)|elections?|polls?|stock|share price|price of|exchange rate|interest rate|scores?|standings|weather|forecast|who won|who is the (current|new)|20(2[5-9]|3\d))\b/i;
const LIVE_NOTE = "ARTICxAI can't search the web yet, so this answer may be outdated or wrong. For recent events, check a trusted news outlet or an official source.";

function renderMessages() {
  const box = $("messages");
  box.innerHTML = "";
  if (!messages.length) { box.append(emptyState()); return; }
  messages.forEach((m, i) => {
    box.append(messageEl(m));
    if (m.role === "assistant" && needsLiveNote(i)) box.append(liveNoteEl());
  });
}
function needsLiveNote(i) {
  const prev = messages[i - 1];
  return prev && prev.role === "user" && LIVE_TOPIC.test(prev.content);
}
function emptyState() {
  const tpl = document.createElement("div");
  tpl.className = "empty";
  tpl.innerHTML = `<h2>How can I help?</h2><div class="suggestions"></div>`;
  for (const s of ["Explain how the TFSA and RRSP differ", "Write a cover letter for a bilingual customer service job",
                   "Plan a 3-day winter trip to Québec City", "Help me debug a JavaScript error"]) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "suggestion"; b.textContent = s;
    b.addEventListener("click", () => send(s));
    tpl.querySelector(".suggestions").append(b);
  }
  return tpl;
}
function messageEl(m, typing = false) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${m.role}`;
  const content = document.createElement("div");
  content.className = "content" + (typing ? " typing" : "");
  if (m.role === "user") content.textContent = m.content;
  else content.innerHTML = renderMarkdown(m.content);
  wrap.append(content);
  return wrap;
}
function liveNoteEl() {
  const n = document.createElement("p");
  n.className = "live-note";
  n.textContent = LIVE_NOTE;
  return n;
}
function showError(text) {
  const n = document.createElement("p");
  n.className = "error-note";
  n.setAttribute("role", "alert");
  n.textContent = text;
  $("messages").append(n);
  scrollToBottom(true);
}

// Copy buttons on code blocks
$("messages").addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.parentElement.querySelector("code").textContent);
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  } catch { btn.textContent = "Copy failed"; }
});

function nearBottom() {
  const b = $("messages");
  return b.scrollHeight - b.scrollTop - b.clientHeight < 120;
}
function scrollToBottom(force = false) {
  const b = $("messages");
  if (force || nearBottom()) b.scrollTop = b.scrollHeight;
}

// ---------- Safe Markdown ----------
// Escapes all HTML. Links the model writes are shown as plain, non-clickable
// text marked "unverified", because the base model invents URLs.
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function renderMarkdown(src) {
  return src.split("```").map((part, i) => {
    if (i % 2 === 0) return renderBlocks(part);
    const nl = part.indexOf("\n");
    const code = nl === -1 ? "" : part.slice(nl + 1).replace(/\n$/, "");
    return `<pre><code>${escapeHtml(code)}</code><button class="copy-btn" type="button">Copy</button></pre>`;
  }).join("");
}
function renderBlocks(text) {
  let out = "", para = [], list = null;
  const flushPara = () => { if (para.length) { out += `<p>${para.map(inline).join("<br>")}</p>`; para = []; } };
  const flushList = () => {
    if (!list) return;
    const start = list.type === "ol" && list.start !== 1 ? ` start="${list.start}"` : "";
    out += `<${list.type}${start}>${list.items.map((x) => `<li>${inline(x)}</li>`).join("")}</${list.type}>`;
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); if (list && list.type === "ul") flushList(); continue; }
    if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) { flushPara(); flushList(); out += `<h3>${inline(m[1])}</h3>`; continue; }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      flushPara();
      if (!list || list.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flushPara();
      if (!list || list.type !== "ol") { flushList(); list = { type: "ol", start: +m[1], items: [] }; }
      list.items.push(m[2]); continue;
    }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return out;
}
function inline(s) {
  const codes = [], links = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<>()]*[^\s<>().,;:!?'"])/g,
    (_, text, url, bare) => { links.push({ text, url: url || bare }); return `\u0001${links.length - 1}\u0001`; });
  s = escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => {
    const { text, url } = links[i];
    const span = `<span class="unverified-link" title="Written by the AI and not checked. This page may not exist.">${escapeHtml(url)}</span>`;
    return text ? `${escapeHtml(text)} (${span})` : span;
  });
  return s;
}

// ---------- Composer ----------
const input = $("input");
function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 200) + "px"; }
function updateSendBtn() { $("send-btn").disabled = !input.value.trim() || !!controller; }
input.addEventListener("input", () => { autosize(); updateSendBtn(); });
input.addEventListener("keydown", (e) => {
  const touch = matchMedia("(pointer: coarse)").matches;
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !touch) { e.preventDefault(); send(input.value); }
});
$("composer").addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
$("stop-btn").addEventListener("click", stopStreaming);

function setStreaming(on) {
  $("send-btn").hidden = on;
  $("stop-btn").hidden = !on;
  if (!on) controller = null;
  updateSendBtn();
}
function stopStreaming() { if (controller) controller.abort(); }

function makeTitle(text) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
}
function saveError(e) {
  console.error("Save failed:", e);
  showError("This message couldn't be saved to your history. Check your connection.");
}

async function send(raw) {
  const text = raw.trim();
  if (!text || controller || !user) return;
  input.value = ""; autosize();

  if (!currentChatId) {
    const ref = doc(chatsCol());
    currentChatId = ref.id;
    history.replaceState(null, "", `#c/${ref.id}`);
    chats.unshift({ id: ref.id, title: makeTitle(text) });
    renderChatList(); updateTitle();
    setDoc(ref, { title: makeTitle(text), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(saveError);
  }
  const chatId = currentChatId;

  if (!messages.length) $("messages").innerHTML = "";
  messages.push({ role: "user", content: text });
  $("messages").append(messageEl(messages.at(-1)));
  addDoc(messagesCol(chatId), { role: "user", content: text.slice(0, MAX_SAVED_CHARS), createdAt: serverTimestamp() }).catch(saveError);

  const historyToSend = messages.slice(-C.maxHistoryMessages).map(({ role, content }) => ({ role, content }));
  const reply = { role: "assistant", content: "" };
  messages.push(reply);
  const el = messageEl(reply, true);
  $("messages").append(el);
  scrollToBottom(true);

  controller = new AbortController();
  setStreaming(true);
  let pending = false, errorText = null;
  const paint = () => {
    pending = false;
    const stick = nearBottom();
    el.firstChild.innerHTML = renderMarkdown(reply.content);
    if (stick) scrollToBottom(true);
  };
  try {
    await streamCompletion(historyToSend, (tok) => {
      reply.content += tok;
      if (!pending) { pending = true; requestAnimationFrame(paint); }
    }, controller.signal);
  } catch (e) {
    if (e.name !== "AbortError") { errorText = friendlyModelError(e); console.error(e); }
  } finally {
    setStreaming(false);
  }
  paint();
  el.firstChild.classList.remove("typing");

  if (reply.content.trim()) {
    addDoc(messagesCol(chatId), { role: "assistant", content: reply.content.slice(0, MAX_SAVED_CHARS), createdAt: serverTimestamp() }).catch(saveError);
    updateDoc(doc(chatsCol(), chatId), { updatedAt: serverTimestamp() }).catch(saveError);
    if (LIVE_TOPIC.test(text) && currentChatId === chatId) el.after(liveNoteEl());
  } else {
    if (currentChatId === chatId) { messages.pop(); el.remove(); }
  }
  if (errorText && currentChatId === chatId) showError(errorText);
  if (!matchMedia("(pointer: coarse)").matches) input.focus();
}

// ---------- Model streaming (OpenAI-compatible SSE) ----------
class ModelError extends Error {
  constructor(kind, status = 0, detail = "") { super(detail || kind); this.kind = kind; this.status = status; this.detail = detail; }
}

async function streamCompletion(history, onToken, signal) {
  let url, body;
  const headers = { "Content-Type": "application/json" };
  if (backend === "cloud") {
    url = CLOUD_URL;
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
    body = { messages: history };
  } else {
    const b = C.local[backend];
    url = b.url;
    body = { model: b.model, stream: true, temperature: 0.7,
             messages: [{ role: "system", content: C.systemPrompt }, ...history] };
  }

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ModelError("network");
  }
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j?.error?.message || j?.error || ""; } catch {}
    throw new ModelError("http", res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let json;
      try { json = JSON.parse(data); } catch { continue; }
      if (json.error) throw new ModelError("stream", 0, json.error.message || String(json.error));
      const tok = json.choices?.[0]?.delta?.content;
      if (tok) onToken(tok);
    }
  }
}

function friendlyModelError(e) {
  if (!(e instanceof ModelError)) return "Something went wrong while generating a reply. Try again.";
  if (e.kind === "network") {
    if (backend === "ollama") return "Couldn't reach Ollama at localhost:11434. Make sure the Ollama app is running. If it is, the browser may be blocked by CORS: set OLLAMA_ORIGINS as described in the setup steps.";
    if (backend === "mlx") return "Couldn't reach the MLX server at localhost:8080. Start it with: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080";
    return "Couldn't reach the ARTICxAI server. Check your connection and try again.";
  }
  if (e.status === 401) return "Your session expired. Sign out, sign back in, and try again.";
  if (e.status === 429) return e.detail || "You've reached today's message limit. Try again tomorrow.";
  if (e.status === 413 || e.status === 400) return e.detail || "That message is too long. Shorten it or start a new chat.";
  if (e.status === 502 || e.status === 503 || e.status === 504) return "The model server isn't responding right now. Try again in a minute.";
  return `Something went wrong (${e.status || e.kind}). ${e.detail}`.trim();
}

// ---------- Utils ----------
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
