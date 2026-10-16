// Maple chat. Guests get a few free messages (anonymous Firebase session, kept in
// this tab only); after sign-up their conversation moves into their account.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { signInAnonymously, signOut } from "firebase/auth";
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDocs, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { CONFIG, IS_LOCAL } from "../config";
import { store } from "../lib/storage";
import { plainText, splitPasted } from "../lib/pasted";
import { useTheme } from "../lib/useTheme";
import { ModelError, friendlyError, streamCompletion } from "../lib/model";
import { authText, endSession } from "./account";
import { useAccount } from "./useAccount";
import { useSession } from "./useSession";
import { Boot } from "./Boot";
import AuthScreen from "./AuthScreen";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import Settings from "./Settings";
import UsageBar from "./UsageBar";
import Composer from "./Composer";
import FeedbackDialog from "./FeedbackDialog";
import ShareDialog from "./ShareDialog";
import HistoryDialog from "./HistoryDialog";
import Avatar from "../components/Avatar";
import { AccountChooser, LogoutDialog, forgetAccount, rememberAccount, rememberedAccount } from "./AccountDialogs";
import { GateCard, LimitNotice, MessageList } from "./Messages";
import { MenuIcon, PenIcon, SearchIcon, ShareIcon, SidebarIcon } from "../components/Icons";
import ThemeSwitch from "../components/ThemeSwitch";
import { Brand, btn, iconBtn } from "../components/ui";
import { LogoMark } from "../components/Logo";
import { useLang } from "../i18n";

// Web search sources from the chat function: at most 6, http(s) links only.
function cleanSources(list) {
  if (!Array.isArray(list)) return null;
  const out = list
    .filter((x) => x && typeof x.url === "string" && /^https?:\/\//i.test(x.url))
    .slice(0, 6)
    .map((x) => ({ title: String(x.title || x.url).slice(0, 200), url: x.url.slice(0, 2000) }));
  return out.length ? out : null;
}

const MAX_SAVED_CHARS = 100000; // must match firestore.rules
const PENDING_KEY = "articx-pending";
const GUEST_CHAT_KEY = "articx-guest-chat";
const GUEST_USED_KEY = "articx-guest-used";
const mobile = () => matchMedia("(max-width: 899px)").matches;
const touch = () => matchMedia("(pointer: coarse)").matches;
const guestUsedNow = () => Number(store("local", GUEST_USED_KEY)) || 0;
const MODEL_KEY = "articx-model";
const RATED_KEY = (id) => `articx-rated-${id}`; // this device's thumbs up/down for one chat
function loadRatings(id) {
  try { return (id && JSON.parse(store("local", RATED_KEY(id)) || "{}")) || {}; } catch { return {}; }
}
// Guests always use the default model; accounts keep their last choice.
function savedModel(signedIn) {
  const m = CONFIG.models.find((x) => x.id === store("local", MODEL_KEY));
  return m && (signedIn || !m.accountsOnly) ? m.id : CONFIG.defaultModel;
}

// The usage periods the chat function counts in (UTC): day, week starting Monday, month.
function periodKeys(now) {
  const day = now.toISOString().slice(0, 10);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return { day, week: monday.toISOString().slice(0, 10), month: day.slice(0, 7) };
}

function makeTitle(t) {
  t = t.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 57).trimEnd() + "…" : t;
}
function loadGuestChat() {
  try {
    const list = JSON.parse(store("session", GUEST_CHAT_KEY) || "[]");
    return Array.isArray(list)
      ? list.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map(({ role, content, sources, searched, at }) => { const src = cleanSources(sources); return { role, content, ...(src ? { sources: src } : {}), ...(searched === true ? { searched: true } : {}), ...(Number.isFinite(at) ? { at } : {}) }; })
      : [];
  } catch { return []; }
}
function saveGuestChat(list) {
  const clean = list.filter((m) => !m.streaming).map(({ role, content, sources, searched, at }) => ({ role, content, sources, searched, at }));
  store("session", GUEST_CHAT_KEY, clean.length ? JSON.stringify(clean) : null);
}
// Pasted blocks count as text for search; the tags themselves don't.
const plainSearchText = (content) => content.replace(/<\/?pasted_text>/g, " ");
const replaceLast = (list, m) => [...list.slice(0, -1), m];

export default function ChatPage() {
  const account = useAccount();
  const { fb, phase, user } = account;
  const uid = user?.uid ?? null;
  const sid = useSession(fb, uid);
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId: routeId } = useParams();
  const { pref: themePref, setPref: setThemePref } = useTheme();
  const { s: L } = useLang();
  const T = L.chat;
  const tRef = useRef(T); // latest strings for async work
  tRef.current = T;

  const [authView, setAuthView] = useState({ step: null });
  const [sidebarOpen, setSidebarOpen] = useState(() => !mobile()); // open by default on desktop; only the user closes it
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [photo, setPhoto] = useState(null); // profile picture (users/{uid}/meta/avatar)
  const [chooser, setChooser] = useState(null); // remembered account shown in "Welcome back", or {} for none
  const [usage, setUsage] = useState(null); // { used, limit } for today
  const [chats, setChats] = useState([]);
  const [chatId, setChatIdState] = useState(null);
  const [messages, setMessagesState] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [notice, setNotice] = useState(null);
  const [ratings, setRatingsState] = useState({}); // reply index -> "up" | "down"
  const [feedbackFor, setFeedbackFor] = useState(null); // reply index awaiting the feedback form
  const [shareFor, setShareFor] = useState(null); // chat id with the share dialog open
  const [toast, setToast] = useState(null);
  const [input, setInput] = useState("");
  const [pastes, setPastes] = useState([]); // long pastes shown as cards in the composer
  const [streaming, setStreaming] = useState(false);
  const [pending, setPendingState] = useState(null); // guest message held until sign-up
  const [guestUsed, setGuestUsed] = useState(guestUsedNow);
  const [modelChoice, setModelChoice] = useState(CONFIG.defaultModel);
  const [backend, setBackendState] = useState(() => {
    const saved = store("local", "articx-backend");
    return IS_LOCAL ? (saved === "cloud" || CONFIG.local[saved] ? saved : "ollama") : "cloud";
  });

  // Refs hold the latest values for async work (streaming, imports) that outlives a render.
  const msgsRef = useRef([]);
  const chatIdRef = useRef(null);
  const pendingRef = useRef(null);
  const userRef = useRef(null);
  const routeRef = useRef(undefined);
  const controllerRef = useRef(null);
  const sessionRef = useRef(0); // bumps whenever the visible chat changes
  const expectRoute = useRef(undefined); // route we navigated to ourselves
  const prevUid = useRef(undefined);
  const textCache = useRef(new Map()); // chat id -> message text, for History search
  const loggedOut = useRef(false); // set by logOut so the chooser opens once the session ends
  const stickRef = useRef(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const searchRef = useRef(null);
  const avatarRef = useRef(null);
  userRef.current = user;
  routeRef.current = routeId;

  const setMessages = (next) => {
    const v = typeof next === "function" ? next(msgsRef.current) : next;
    msgsRef.current = v;
    setMessagesState(v);
  };
  const setChatId = (id) => { chatIdRef.current = id; setChatIdState(id); setRatingsState(loadRatings(id)); };
  const setRatings = (next) => {
    setRatingsState(next);
    if (chatIdRef.current) store("local", RATED_KEY(chatIdRef.current), Object.keys(next).length ? JSON.stringify(next) : null);
  };
  const toastTimer = useRef(null);
  const showToast = (text) => { clearTimeout(toastTimer.current); setToast(text); toastTimer.current = setTimeout(() => setToast(null), 2600); };
  const setPending = (p) => { pendingRef.current = p; setPendingState(p); store("session", PENDING_KEY, p); };
  const setBackend = (b) => { setBackendState(b); store("local", "articx-backend", b); };
  const model = uid ? modelChoice : CONFIG.defaultModel;
  const chooseModel = (id) => { setModelChoice(id); store("local", MODEL_KEY, id); };
  const chatsCol = (u) => collection(fb.db, "users", u, "chats");
  const messagesCol = (u, id) => collection(fb.db, "users", u, "chats", id, "messages");
  const cloudUrl = fb && (CONFIG.cloudChatUrl || `https://${CONFIG.functionRegion}-${fb.projectId}.cloudfunctions.net/chat`);

  // ---------- Navigation helpers ----------
  function go(id, { push = false } = {}) {
    const target = id || undefined;
    if (routeRef.current === target) return;
    expectRoute.current = target ?? null;
    navigate(id ? `/chat/${id}` : "/chat", { replace: !push });
  }
  function stopStreaming() { controllerRef.current?.abort(); }
  function newChat() {
    stopStreaming();
    sessionRef.current++;
    setChatId(null); setMessages([]); setNotice(null); setLoadingChat(false);
  }
  async function openChat(id) {
    stopStreaming();
    const my = ++sessionRef.current;
    setChatId(id); setMessages([]); setNotice(null); setLoadingChat(true);
    try {
      const snap = await getDocs(query(messagesCol(userRef.current.uid, id), orderBy("createdAt")));
      if (sessionRef.current !== my) return;
      stickRef.current = true;
      setMessages(snap.docs.map((d) => { const src = cleanSources(d.get("sources")); const at = d.get("createdAt")?.toMillis?.(); return { role: d.get("role"), content: d.get("content"), ...(src ? { sources: src } : {}), ...(d.get("searched") === true ? { searched: true } : {}), ...(at ? { at } : {}) }; }));
    } catch (e) {
      console.error(e);
      if (sessionRef.current === my) setNotice(tRef.current.loadFailed);
    } finally {
      if (sessionRef.current === my) setLoadingChat(false);
    }
  }
  function startNewChat() {
    go(null, { push: true });
    newChat();
    if (mobile()) setSidebarOpen(false);
    inputRef.current?.focus();
  }
  async function deleteChat(id, title) {
    if (!confirm(tRef.current.confirmDelete(title))) return;
    try {
      const u = userRef.current.uid;
      const snap = await getDocs(messagesCol(u, id));
      const refs = snap.docs.map((d) => d.ref);
      for (let i = 0; i < refs.length; i += 450) {
        const batch = writeBatch(fb.db);
        refs.slice(i, i + 450).forEach((r) => batch.delete(r));
        await batch.commit();
      }
      const shareId = chats.find((c) => c.id === id)?.shareId;
      if (shareId) await deleteDoc(doc(fb.db, "shares", shareId)).catch((e) => console.error("Share delete failed:", e));
      await deleteDoc(doc(chatsCol(u), id));
      store("local", RATED_KEY(id), null);
      if (id === chatIdRef.current) { go(null); newChat(); }
    } catch (e) {
      console.error(e);
      alert(tRef.current.deleteFailed);
    }
  }
  // Pinning and renaming leave updatedAt alone, so the chat keeps its place in the list.
  async function pinChat(c) {
    try { await updateDoc(doc(chatsCol(userRef.current.uid), c.id), { pinned: c.pinned ? deleteField() : serverTimestamp() }); }
    catch (e) { console.error(e); showToast(tRef.current.sidebar.pinFailed); }
  }
  async function renameChat(id, title) {
    try { await updateDoc(doc(chatsCol(userRef.current.uid), id), { title }); }
    catch (e) { console.error(e); showToast(tRef.current.sidebar.renameFailed); }
  }

  // ---------- Feedback ----------
  // A thumbs up stores only the rating. A thumbs down (from the form) also stores the question,
  // the reply and the note, as the form says. Taking a rating back only changes this device.
  async function rate(i, rating, extra) {
    const before = ratings;
    const next = { ...ratings };
    if (rating) next[i] = rating; else delete next[i];
    setRatings(next);
    if (!rating) return;
    const who = fb.auth.currentUser;
    try {
      if (!who) throw new Error("Not signed in");
      const data = { uid: who.uid, chatId: chatIdRef.current || "", rating, createdAt: serverTimestamp() };
      if (rating === "down") {
        const list = msgsRef.current;
        const prompt = [...list.slice(0, i)].reverse().find((m) => m.role === "user")?.content || "";
        Object.assign(data, { reason: extra?.reason || "", details: extra?.details || "", prompt: prompt.slice(0, MAX_SAVED_CHARS), reply: (list[i]?.content || "").slice(0, MAX_SAVED_CHARS) });
      }
      await addDoc(collection(fb.db, "feedback"), data);
      if (rating === "up") showToast(tRef.current.actions.thanks); // a thumbs down gets the form's thank-you screen
    } catch (e) {
      console.error("Feedback failed:", e);
      setRatings(before);
      if (rating === "down") throw e; // the form shows the error
    }
  }

  function saveError(e) {
    console.error("Save failed:", e);
    setNotice(tRef.current.saveFailed);
  }

  // ---------- Signing in / out ----------
  // "Sign in" goes through the account chooser when this device remembers an account.
  function openSignIn() {
    const last = rememberedAccount();
    if (last) setChooser(last);
    else setAuthView({ step: "signin" });
  }
  function logOut() {
    const u = userRef.current;
    setConfirmLogout(false);
    rememberAccount(u, photo);
    stopStreaming();
    loggedOut.current = true;
    endSession(fb).finally(() => signOut(fb.auth));
  }

  // Runs when the account switches between guest and signed in (not on every auth event).
  useEffect(() => {
    if (phase === "loading") return;
    const first = prevUid.current === undefined;
    if (!first && prevUid.current === uid) return;
    prevUid.current = uid;
    stopStreaming();
    sessionRef.current++;
    setMenuOpen(false);
    setSettingsOpen(false);
    setConfirmLogout(false);
    setHistoryOpen(false);
    textCache.current.clear();
    setChooser(!uid && loggedOut.current ? rememberedAccount() || {} : null);
    loggedOut.current = false;
    setFeedbackFor(null);
    setShareFor(null);
    setModelChoice(savedModel(!!uid));
    if (!uid) {
      // On page load, pick up this tab's guest conversation; after sign-out, start fresh.
      setChats([]); setChatId(null); setNotice(null); setSidebarOpen(false); setLoadingChat(false);
      setMessages(first ? loadGuestChat() : []);
      const p = first ? store("session", PENDING_KEY) : null;
      pendingRef.current = p; setPendingState(p);
      return;
    }
    setAuthView({ step: null });
    if (!mobile()) setSidebarOpen(true);
    afterSignIn();
  }, [phase, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // The guest conversation moves into the new account, and a message held at
  // the free limit is answered now.
  function afterSignIn() {
    const p = pendingRef.current || store("session", PENDING_KEY);
    const carried = loadGuestChat();
    setPending(null);
    store("session", GUEST_CHAT_KEY, null);
    if (carried.length) importGuestChat(carried).then(() => { if (p) send(p); });
    else if (p) { go(null); newChat(); send(p); }
  }
  async function importGuestChat(list) {
    newChat();
    const u = userRef.current.uid;
    const ref = doc(chatsCol(u));
    const title = makeTitle(plainText(list.find((m) => m.role === "user")?.content || "") || tRef.current.fallbackTitle);
    setChatId(ref.id);
    stickRef.current = true;
    setMessages(list);
    go(ref.id);
    try {
      await setDoc(ref, { title, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      // One at a time so each message gets a later server timestamp and keeps its order.
      for (const m of list) {
        await addDoc(messagesCol(u, ref.id), { role: m.role, content: m.content.slice(0, MAX_SAVED_CHARS), ...(m.sources ? { sources: m.sources } : {}), ...(m.searched ? { searched: true } : {}), createdAt: serverTimestamp() });
      }
    } catch (e) { saveError(e); }
  }

  // /chat#signin and /chat#signup (links from the homepage) open the account screens.
  useEffect(() => {
    if (phase !== "guest") return;
    const h = location.hash;
    if (h === "#signin" || h === "#signup") {
      if (h === "#signin") openSignIn(); else setAuthView({ step: "signup" });
      navigate(location.pathname, { replace: true });
    }
  }, [location.hash, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Chat list and routing ----------
  useEffect(() => {
    setPhoto(null);
    if (!uid || !fb) return undefined;
    return onSnapshot(doc(fb.db, "users", uid, "meta", "avatar"),
      (snap) => setPhoto(snap.get("photo") || null),
      (err) => console.error("Avatar error:", err));
  }, [uid, fb]);

  useEffect(() => {
    if (!uid || !fb) return undefined;
    return onSnapshot(
      query(chatsCol(uid), orderBy("updatedAt", "desc"), limit(200)),
      (snap) => setChats(snap.docs.map((d) => ({
        id: d.id,
        title: d.get("title") || tRef.current.untitled,
        updated: d.get("updatedAt")?.toDate?.() || new Date(),
        pinned: d.get("pinned")?.toDate?.() || null,
        shareId: d.get("shareId") || null,
      }))),
      (err) => console.error("Chat list error:", err),
    );
  }, [uid, fb]); // eslint-disable-line react-hooks/exhaustive-deps

  // This account's day, week and month counts (the chat function counts in UTC; see functions/index.js).
  // usage = { used, limit } for today, plus { week, month } in the same shape.
  const usageKeys = periodKeys(new Date());
  useEffect(() => {
    setUsage(null);
    if (!uid || !fb || phase !== "ready") return undefined;
    const found = {};
    const publish = () => { if (found.day && found.week && found.month) setUsage({ ...found.day, week: found.week, month: found.month }); };
    const watch = (period, id) => onSnapshot(
      doc(fb.db, "usage", `${uid}_${id}`),
      (snap) => { found[period] = { used: snap.get("count") || 0, limit: snap.get("limit") || CONFIG.limits[period] }; publish(); },
      () => { found[period] = { used: 0, limit: CONFIG.limits[period] }; publish(); },
    );
    const stops = [watch("day", usageKeys.day), watch("week", `w${usageKeys.week}`), watch("month", `m${usageKeys.month}`)];
    return () => stops.forEach((stop) => stop());
  }, [uid, fb, phase, usageKeys.day]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "loading") return;
    if (expectRoute.current !== undefined) {
      if ((routeId ?? null) === expectRoute.current) expectRoute.current = undefined;
      return;
    }
    if (!uid) { if (routeId) navigate("/chat", { replace: true }); return; }
    if (routeId && routeId !== chatIdRef.current) openChat(routeId);
    else if (!routeId && chatIdRef.current) newChat();
  }, [routeId, uid, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentChat = chats.find((c) => c.id === chatId);
  useEffect(() => { document.title = currentChat ? `${currentChat.title} — Maple` : T.pageTitle; }, [currentChat, T]);

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape" && mobile()) setSidebarOpen(false);
      if (!userRef.current) return;
      if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); setSidebarOpen((o) => !o); }
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); startNewChat(); }
      if (mod && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); setHistoryOpen((o) => !o); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  useEffect(() => { if (sidebarOpen && mobile()) searchRef.current?.focus({ preventScroll: true }); }, [sidebarOpen]);

  // ---------- Scrolling ----------
  const nearBottom = () => { const b = listRef.current; return !b || b.scrollHeight - b.scrollTop - b.clientHeight < 120; };
  useLayoutEffect(() => {
    if (stickRef.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    stickRef.current = false;
  }, [messages, notice, pending, streaming]);

  // ---------- Sending ----------
  function submit(raw) {
    const text = raw.trim();
    if (!text) return;
    if (!userRef.current && guestUsedNow() >= CONFIG.guestMessageLimit) return guestSubmit(text);
    send(text);
  }
  // Editing a sent message drops it and everything after it (here and in Firestore), then asks again.
  async function editMessage(i, content) {
    if (controllerRef.current || msgsRef.current[i]?.role !== "user") return;
    const my = sessionRef.current;
    const u = userRef.current, id = chatIdRef.current;
    setMessages(msgsRef.current.slice(0, i));
    setRatings(Object.fromEntries(Object.entries(ratings).filter(([k]) => Number(k) < i)));
    if (u && id) {
      textCache.current.delete(id);
      try {
        const snap = await getDocs(query(messagesCol(u.uid, id), orderBy("createdAt")));
        const refs = snap.docs.slice(i).map((d) => d.ref);
        for (let k = 0; k < refs.length; k += 450) {
          const batch = writeBatch(fb.db);
          refs.slice(k, k + 450).forEach((ref) => batch.delete(ref));
          await batch.commit();
        }
      } catch (e) { saveError(e); }
    } else if (!u) saveGuestChat(msgsRef.current);
    if (sessionRef.current !== my) return;
    stickRef.current = true;
    submit(content);
  }

  // All message text of one chat, for searching inside chats in the History window (cached per chat).
  async function chatText(id) {
    if (textCache.current.has(id)) return textCache.current.get(id);
    const snap = await getDocs(query(messagesCol(userRef.current.uid, id), orderBy("createdAt")));
    const text = snap.docs.map((d) => plainSearchText(String(d.get("content") || ""))).join("\n");
    textCache.current.set(id, text);
    return text;
  }

  function guestSubmit(text) {
    stickRef.current = msgsRef.current.length > 0;
    setPending(text.slice(0, CONFIG.maxMessageChars));
    setInput("");
    setPastes([]);
  }
  function editPending() {
    const { pastes: held, text } = splitPasted(pendingRef.current || "");
    setInput(text);
    setPastes(held);
    setPending(null);
    inputRef.current?.focus();
  }

  async function tokenFor(u) {
    if (u) return u.getIdToken();
    let who = fb.auth.currentUser;
    if (!who) {
      try { who = (await signInAnonymously(fb.auth)).user; }
      catch (e) { throw new ModelError("auth", 0, authText(e?.code, L) || tRef.current.errors.guestUnavailable); }
    }
    return who.getIdToken();
  }

  async function send(raw) {
    const text = raw.trim().slice(0, CONFIG.maxMessageChars);
    if (!text || controllerRef.current) return;
    setInput("");
    setPastes([]);
    setNotice(null);
    const u = userRef.current;
    const asGuest = !u;
    const my = sessionRef.current;

    let id = chatIdRef.current;
    if (!asGuest && !id) {
      const ref = doc(chatsCol(u.uid));
      id = ref.id;
      setChatId(id);
      go(id);
      setDoc(ref, { title: makeTitle(plainText(text) || tRef.current.fallbackTitle), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(saveError);
    }

    const history = [...msgsRef.current.filter((m) => !m.streaming), { role: "user", content: text }]
      .slice(-CONFIG.maxHistoryMessages).map(({ role, content }) => ({ role, content }));
    stickRef.current = true;
    setMessages((m) => [...m, { role: "user", content: text, at: Date.now() }, { role: "assistant", content: "", streaming: true }]);
    if (id) textCache.current.delete(id);
    if (asGuest) {
      const used = guestUsedNow() + 1;
      store("local", GUEST_USED_KEY, String(used));
      setGuestUsed(used);
      saveGuestChat(msgsRef.current);
    } else {
      addDoc(messagesCol(u.uid, id), { role: "user", content: text.slice(0, MAX_SAVED_CHARS), createdAt: serverTimestamp() }).catch(saveError);
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setStreaming(true);
    let reply = "", sources = null, searched = false, langNote = null, aborted = false, queued = false, done = false, errorText = null, guestLimit = false;
    const paint = () => {
      queued = false;
      if (done || sessionRef.current !== my) return;
      stickRef.current = nearBottom();
      setMessages((m) => replaceLast(m, { role: "assistant", content: reply, streaming: true, ...(langNote ? { langNote } : {}) }));
    };
    try {
      await streamCompletion({
        history, model, backend, cloudUrl, signal: controller.signal,
        getToken: () => tokenFor(u),
        onToken: (tok) => { reply += tok; if (!queued) { queued = true; requestAnimationFrame(paint); } },
        onSources: (list, s) => { sources = cleanSources(list); searched = s; },
        // "Still learning <language>" note: once per chat per browser session (closing the app and
        // coming back later shows it once again). Stored in sessionStorage, so nothing leaves the device.
        onNotice: (n) => {
          if (typeof n.en !== "string") return;
          const key = `maple.langNote.${id || "guest"}.${String(n.code || "").slice(0, 8)}`;
          if (store("session", key)) return;
          store("session", key, "1");
          langNote = { text: String(n.text || "").slice(0, 600), en: n.en.slice(0, 400) };
        },
      });
    } catch (e) {
      if (asGuest && e.status === 403) guestLimit = true;
      else if (e.name === "AbortError") aborted = true;
      else { errorText = friendlyError(e, backend, L); console.error(e); }
    } finally {
      done = true;
      if (controllerRef.current === controller) controllerRef.current = null;
      setStreaming(false);
    }

    const stillHere = sessionRef.current === my;
    // The server says the free messages are used up: hold this message until they sign up.
    if (guestLimit && !userRef.current) {
      if (stillHere) setMessages((m) => m.slice(0, -2));
      store("local", GUEST_USED_KEY, String(CONFIG.guestMessageLimit));
      setGuestUsed(CONFIG.guestMessageLimit);
      saveGuestChat(msgsRef.current);
      return guestSubmit(text);
    }
    if (stillHere) {
      stickRef.current = nearBottom() || !!errorText;
      setMessages((m) => (reply.trim() ? replaceLast(m, { role: "assistant", content: reply, ...(sources ? { sources } : {}), ...(searched ? { searched } : {}), ...(langNote ? { langNote } : {}) }) : m.slice(0, -1)));
      if (errorText) setNotice(errorText);
      else if (!reply.trim() && !aborted && !guestLimit) setNotice(L.chat.errors.empty);
    }
    if (reply.trim() && !asGuest) {
      addDoc(messagesCol(u.uid, id), { role: "assistant", content: reply.slice(0, MAX_SAVED_CHARS), ...(sources ? { sources } : {}), ...(searched ? { searched: true } : {}), createdAt: serverTimestamp() }).catch(saveError);
      updateDoc(doc(chatsCol(u.uid), id), { updatedAt: serverTimestamp() }).catch(saveError);
      textCache.current.delete(id);
    }
    if (asGuest && !userRef.current && stillHere) saveGuestChat(msgsRef.current);
    if (!touch()) inputRef.current?.focus();
  }

  // ---------- Render ----------
  if (account.loadError) return <Boot message={T.loadError} />;
  if (phase === "loading") return <Boot />;

  const gated = !uid && pending != null;
  const empty = !gated && messages.length === 0 && !loadingChat;
  const firstName = (user?.displayName || "").trim().split(/\s+/)[0];
  const guestLeft = !uid && messages.length ? Math.max(0, CONFIG.guestMessageLimit - guestUsed) : null;
  const limitReached = !gated && guestLeft === 0 && !streaming;

  return (
    <div className="flex h-dvh overflow-hidden">
      {uid && !sidebarOpen && (
        <nav aria-label={T.sidebar.quick} className="hidden w-[60px] flex-none flex-col items-center gap-[.35rem] border-r border-line pt-[calc(.75rem+env(safe-area-inset-top))] pb-3 lg:flex">
          <button type="button" className={iconBtn} aria-label={T.sidebar.open} aria-controls="sidebar" aria-expanded="false" title={T.sidebar.open} onClick={() => setSidebarOpen(true)}><SidebarIcon /></button>
          <button type="button" className={iconBtn} aria-label={T.sidebar.newChat} title={T.sidebar.newChat} onClick={startNewChat}><PenIcon /></button>
          <button type="button" className={iconBtn} aria-label={T.sidebar.search} title={T.sidebar.search} onClick={() => setHistoryOpen(true)}><SearchIcon /></button>
        </nav>
      )}
      {uid && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNew={startNewChat} chats={chats} currentId={chatId}
          onDelete={deleteChat} onPin={pinChat} onRename={renameChat} onShare={(c) => setShareFor(c.id)} onPick={() => { if (mobile()) setSidebarOpen(false); }} searchRef={searchRef} />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[60px] items-center gap-2 pt-[env(safe-area-inset-top)] pr-[.6rem] pl-2 lg:px-[.9rem]">
          <div className="flex min-w-0 flex-1 items-center gap-[.35rem]">
            {uid && (
              <button type="button" className={`${iconBtn} lg:hidden`} aria-label={T.sidebar.open} aria-controls="sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
                <MenuIcon />
              </button>
            )}
            {uid ? (
              <>
                <Link to="/" aria-label="ArticxAI" className="inline-grid size-10 flex-none place-items-center rounded-[10px] text-ink hover:bg-bg-2">
                  <LogoMark className="h-6 w-auto" />
                </Link>
                {usage && <div className="hidden sm:block"><UsageBar used={usage.used} limit={usage.limit} /></div>}
              </>
            ) : <Brand icon={false} />}
          </div>
          {uid && <p className="m-0 hidden max-w-[42%] flex-[0_1_auto] truncate font-head text-[.93rem] font-semibold text-ink lg:block">{currentChat?.title || ""}</p>}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-[.35rem]">
            <ThemeSwitch pref={themePref} onChange={setThemePref} />
            {!uid && <>
              <button type="button" className={btn("quiet", "sm")} onClick={openSignIn}>{T.menu.signIn}</button>
              <button type="button" className={btn("primary", "sm")} onClick={() => setAuthView({ step: "signup" })}>{T.menu.signUp}</button>
            </>}
            {uid && <>
              {currentChat && messages.length > 0 && (
                <button type="button" className={`${btn("quiet", "sm")} px-3!`} aria-label={T.sidebar.share} title={T.sidebar.share} onClick={() => setShareFor(currentChat.id)}>
                  <ShareIcon className="i size-[17px]" /><span className="max-sm:hidden">{T.sidebar.share}</span>
                </button>
              )}
              <button type="button" className={`${iconBtn} lg:hidden`} aria-label={T.sidebar.newChat} onClick={startNewChat}><PenIcon /></button>
              <button ref={avatarRef} type="button" aria-label={T.menu.button} aria-haspopup="menu" aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className="ml-1 flex-none cursor-pointer rounded-full border-0 bg-transparent p-0">
                <Avatar photo={photo || user.photoURL} name={user.displayName} email={user.email} />
              </button>
            </>}
          </div>
        </header>

        <div className={`flex min-h-0 flex-1 flex-col ${empty ? "justify-center pb-[6vh] lg:pb-[11vh]" : ""}`}>
          {empty ? (
            <div className="px-4 text-center">
              <h1 className="m-0 mb-[1.6rem] text-[clamp(1.75rem,4vw,2.5rem)] font-[750] leading-[1.1] tracking-[-.035em]">
                {firstName ? T.welcomeName(firstName) : T.welcome}
              </h1>
            </div>
          ) : (
            <MessageList messages={messages} notice={notice} listRef={listRef}
              ratings={ratings} onRate={(i, r) => rate(i, r)} onDislike={setFeedbackFor} onToast={showToast}
              onShare={uid && currentChat ? () => setShareFor(currentChat.id) : null}
              onEdit={gated ? null : editMessage} busy={streaming}
              gate={gated ? (
                <GateCard pending={pending} hadChat={messages.length > 0} onEdit={editPending}
                  onAuth={(step) => (step === "signin" ? openSignIn() : setAuthView({ step }))} />
              ) : limitReached && <LimitNotice onSignUp={() => setAuthView({ step: "signup" })} />} />
          )}
          {!gated && (
            <Composer value={input} onChange={setInput} pastes={pastes} onPastes={setPastes} onSubmit={submit} onStop={stopStreaming} streaming={streaming}
              empty={empty} isGuest={!uid} guestLeft={guestLeft} inputRef={inputRef}
              model={model} onModel={chooseModel} onSignUp={() => setAuthView({ step: "signup" })} />
          )}
        </div>
        <p className="mx-auto mt-2 mb-0 w-[min(680px,100%-2rem)] pb-[calc(.75rem+env(safe-area-inset-bottom))] text-center text-[.74rem] leading-[1.5] text-muted">
          {T.disclaimer.text}{" "}
          {T.disclaimer.agree}{" "}
          <Link to="/terms" target="_blank" rel="noopener" className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink">{T.disclaimer.terms}</Link>
          {" "}{T.disclaimer.and}{" "}
          <Link to="/privacy" target="_blank" rel="noopener" className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink">{T.disclaimer.privacy}</Link>.
        </p>
      </main>

      {menuOpen && uid && (
        <UserMenu user={user} photo={photo || user.photoURL} usage={usage} anchorRef={avatarRef} onClose={() => setMenuOpen(false)}
          onHistory={() => { setMenuOpen(false); setHistoryOpen(true); }}
          onSettings={() => { setMenuOpen(false); setSettingsOpen(true); }}
          onSignOut={() => { setMenuOpen(false); setConfirmLogout(true); }} />
      )}
      {settingsOpen && uid && (
        <Settings user={user} sid={sid} photo={photo} usage={usage} themePref={themePref} onTheme={setThemePref} model={model} onModel={chooseModel}
          backend={backend} onBackend={setBackend} onClose={() => setSettingsOpen(false)} fb={fb}
          onSignOut={() => { setSettingsOpen(false); setConfirmLogout(true); }} />
      )}
      {confirmLogout && uid && <LogoutDialog user={user} photo={photo} onConfirm={logOut} onClose={() => setConfirmLogout(false)} />}
      {chooser && !uid && !authView.step && (
        <AccountChooser account={chooser.email ? chooser : null} onClose={() => setChooser(null)}
          onForget={() => { forgetAccount(); setChooser({}); }}
          onPick={(a) => { setChooser(null); setAuthView({ step: "signin", email: a.email }); }}
          onAnother={() => { setChooser(null); setAuthView({ step: "signin" }); }}
          onCreate={() => { setChooser(null); setAuthView({ step: "signup" }); }} />
      )}
      {historyOpen && uid && (
        <HistoryDialog chats={chats} currentId={chatId} chatText={chatText} onClose={() => setHistoryOpen(false)}
          onNew={() => { setHistoryOpen(false); startNewChat(); }}
          onPick={(id) => { setHistoryOpen(false); if (mobile()) setSidebarOpen(false); navigate(`/chat/${id}`); }} />
      )}
      {feedbackFor != null && (
        <FeedbackDialog onClose={() => setFeedbackFor(null)} onSubmit={(extra) => rate(feedbackFor, "down", extra)} />
      )}
      {shareFor && uid && chats.find((c) => c.id === shareFor) && (
        <ShareDialog fb={fb} chat={chats.find((c) => c.id === shareFor)} onClose={() => setShareFor(null)} />
      )}
      {toast && (
        <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-60 -translate-x-1/2 rounded-full bg-ink px-4 py-[.55rem] font-head text-[.86rem] text-bg shadow-card motion-safe:animate-rise">
          {toast}
        </div>
      )}
      <AuthScreen fb={fb} account={account} view={authView} setView={setAuthView} pending={!!pending} />
    </div>
  );
}
