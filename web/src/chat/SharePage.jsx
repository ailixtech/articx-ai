// A chat someone shared (/share/:shareId): read-only, open to anyone with the link.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import { loadFirebase } from "../lib/firebase";
import { Brand, btn } from "../components/ui";
import ThemeSwitch from "../components/ThemeSwitch";
import { useTheme } from "../lib/useTheme";
import { useLang } from "../i18n";
import { AssistantMessage, UserBubble } from "./Messages";

export default function SharePage() {
  const { shareId } = useParams();
  const { s } = useLang();
  const t = s.chat.shared;
  const { pref, setPref } = useTheme();
  const [state, setState] = useState({ status: "loading" });

  // Shared chats stay out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    loadFirebase()
      .then((fb) => getDoc(doc(fb.db, "shares", shareId)))
      .then((snap) => {
        if (!live) return;
        const messages = (snap.exists() && snap.get("messages")) || [];
        setState(messages.length ? { status: "ready", title: snap.get("title") || t.label, messages } : { status: "missing" });
      })
      .catch((e) => { console.error(e); if (live) setState({ status: "missing" }); });
    return () => { live = false; };
  }, [shareId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = state.title ? `${state.title} — Maple` : `${t.label} — Maple`; }, [state.title, t.label]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex min-h-[60px] items-center gap-2 border-b border-line bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <Brand icon={false} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch pref={pref} onChange={setPref} />
          <Link to="/chat" className={btn("primary", "sm")}>{t.cta}</Link>
        </div>
      </header>
      <main className="flex-1 px-[.85rem] pt-6 pb-10 lg:px-4">
        {state.status === "loading" && <p role="status" className="text-center text-muted">{t.loading}</p>}
        {state.status === "missing" && <p className="mx-auto max-w-[760px] text-center text-muted">{t.missing}</p>}
        {state.status === "ready" && (
          <>
            <div className="mx-auto mb-8 max-w-[760px] border-b border-line pb-4">
              <p className="m-0 mb-1 font-head text-[.78rem] font-semibold tracking-[.1em] text-lake-deep uppercase">{t.label}</p>
              <h1 className="m-0 text-[clamp(1.4rem,3vw,1.9rem)] font-bold tracking-[-.02em]">{state.title}</h1>
            </div>
            {state.messages.map((m, i) => (m.role === "user"
              ? <UserBubble key={i} content={m.content} />
              : <AssistantMessage key={i} content={m.content} />))}
            <p className="mx-auto mt-8 mb-0 max-w-[760px] border-t border-line pt-4 text-center text-[.82rem] text-muted">{t.note}</p>
          </>
        )}
      </main>
    </div>
  );
}
