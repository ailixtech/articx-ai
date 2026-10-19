import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "@fontsource-variable/inter";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/500.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/open-sans/700.css";
import "./index.css";
import Waitlist from "./pages/Waitlist";
import { NotFound, Privacy, Terms } from "./pages/Legal";
import { Boot } from "./chat/Boot";
import { LangProvider } from "./i18n";
import { applyTextSize } from "./lib/prefs";

applyTextSize();

// The chat (and Firebase with it) loads only when someone opens /chat.
const ChatPage = lazy(() => import("./chat/ChatPage"));
const SharePage = lazy(() => import("./chat/SharePage"));

// Phase 1 (Oct 2026): articx.com is the company site + waitlist only. Chat opens on articxai.com in November,
// so on articx.com (and the prod Firebase address) the chat and share links go to the waitlist.
const CHAT_CLOSED = /(^|\.)articx\.com$|^articx-ai\.(web\.app|firebaseapp\.com)$/i.test(window.location.hostname);
const waitlist = <Navigate to="/waitlist" replace />;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LangProvider>
    <BrowserRouter>
      <Routes>
        {/* Until launch, the home page is the waitlist (firebase.json redirects "/" too). */}
        <Route path="/" element={<Navigate to="/waitlist" replace />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/chat/:chatId?" element={CHAT_CLOSED ? waitlist : <Suspense fallback={<Boot />}><ChatPage /></Suspense>} />
        <Route path="/share/:shareId" element={CHAT_CLOSED ? waitlist : <Suspense fallback={<Boot />}><SharePage /></Suspense>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </LangProvider>
  </StrictMode>
);
