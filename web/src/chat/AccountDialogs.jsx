// "Are you sure you want to log out?" and the "Welcome back" account chooser shown after logging out.
// The chooser remembers the last account on this device (name and email only) so signing back in is one click.
import { useEffect, useRef } from "react";
import { CloseIcon } from "../components/Icons";
import { iconBtn } from "../components/ui";
import { store } from "../lib/storage";
import { useLang } from "../i18n";

const LAST_ACCOUNT_KEY = "articx-last-account";

export function rememberAccount(user) {
  if (!user?.email) return;
  store("local", LAST_ACCOUNT_KEY, JSON.stringify({ name: user.displayName || "", email: user.email, photo: user.photoURL || "" }));
}
export function rememberedAccount() {
  try {
    const a = JSON.parse(store("local", LAST_ACCOUNT_KEY) || "null");
    return a && typeof a.email === "string" && a.email ? a : null;
  } catch { return null; }
}
export const forgetAccount = () => store("local", LAST_ACCOUNT_KEY, null);

const pill = "inline-flex w-full min-h-[52px] items-center justify-center rounded-full border px-[1.4rem] py-[.75rem] font-head text-base font-semibold cursor-pointer transition-[filter,border-color,background]";
const solid = `${pill} border-transparent bg-ink text-surface hover:brightness-125`;
const outline = `${pill} border-line bg-transparent text-ink hover:border-muted hover:bg-bg-2`;

// Centred modal: Escape or a click outside closes it; focus moves in and goes back on close.
function Modal({ labelId, onClose, children }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.querySelector("[data-autofocus], button")?.focus();
    const onKey = (e) => { if (e.key === "Escape") close.current(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,20,27,.55)] p-4 backdrop-blur-[2px]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelId}
        className="relative max-h-[calc(100dvh-2rem)] w-[min(440px,100%)] overflow-y-auto rounded-[22px] border border-line bg-surface px-[clamp(1.25rem,5vw,2.25rem)] pt-8 pb-7 text-center shadow-card motion-safe:animate-rise">
        {children}
      </div>
    </div>
  );
}

function Avatar({ account }) {
  const letters = (account.name || account.email).trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
  return (
    <span className="grid size-11 flex-none place-items-center overflow-hidden rounded-full bg-lake font-head text-[.95rem] font-semibold text-lake-ink">
      {account.photo ? <img src={account.photo} alt="" referrerPolicy="no-referrer" className="block size-full object-cover" /> : letters}
    </span>
  );
}

function AccountText({ account }) {
  return (
    <span className="flex min-w-0 flex-col text-left">
      {account.name && <strong className="truncate font-head text-[1rem] font-semibold text-ink">{account.name}</strong>}
      <span className={`truncate ${account.name ? "text-[.88rem] text-muted" : "font-head text-[1rem] font-semibold text-ink"}`}>{account.email}</span>
    </span>
  );
}

export function LogoutDialog({ user, onConfirm, onClose }) {
  const { s } = useLang();
  const t = s.chat.logout;
  const account = { name: user.displayName || "", email: user.email || "", photo: user.photoURL || "" };
  return (
    <Modal labelId="logout-title" onClose={onClose}>
      <h2 id="logout-title" className="mx-auto mt-0 mb-6 max-w-[16ch] font-head text-[1.45rem] font-semibold leading-[1.25] tracking-[-.02em]">{t.title}</h2>
      {account.email && (
        <div className="mb-6 flex items-center gap-3 rounded-[16px] border border-line px-4 py-[.85rem]">
          <Avatar account={account} />
          <AccountText account={account} />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <button type="button" data-autofocus className={solid} onClick={onConfirm}>{t.confirm}</button>
        <button type="button" className={outline} onClick={onClose}>{t.cancel}</button>
      </div>
    </Modal>
  );
}

export function AccountChooser({ account, onPick, onForget, onAnother, onCreate, onClose }) {
  const { s } = useLang();
  const t = s.auth.accounts;
  return (
    <Modal labelId="chooser-title" onClose={onClose}>
      <button type="button" className={`${iconBtn} absolute top-3 right-3`} aria-label={s.auth.close} title={s.auth.close} onClick={onClose}><CloseIcon /></button>
      <h2 id="chooser-title" className="m-0 mb-2 font-head text-[1.6rem] font-semibold tracking-[-.02em]">{t.title}</h2>
      <p className="m-0 mb-6 text-[.98rem] text-muted">{t.sub}</p>
      {account && (
        <>
          <div className="flex items-center rounded-full border border-line transition-[border-color,background] hover:border-muted hover:bg-bg-2">
            <button type="button" data-autofocus aria-label={t.continueAs(account.email)} onClick={() => onPick(account)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-full border-0 bg-transparent py-[.7rem] pr-2 pl-[.8rem]">
              <Avatar account={account} />
              <AccountText account={account} />
            </button>
            <button type="button" className={`${iconBtn} mr-2 size-9!`} aria-label={t.forget(account.email)} title={t.forget(account.email)} onClick={onForget}>
              <CloseIcon className="i size-4" />
            </button>
          </div>
          <div className="my-5 flex items-center gap-4 text-[.84rem] font-medium text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">{t.or}</div>
        </>
      )}
      <div className="flex flex-col gap-3">
        <button type="button" className={outline} onClick={onAnother}>{t.another}</button>
        <button type="button" className={outline} onClick={onCreate}>{t.create}</button>
      </div>
    </Modal>
  );
}
