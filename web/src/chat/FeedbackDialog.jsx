import { useEffect, useRef, useState } from "react";
import Dialog from "../components/Dialog";
import { CheckIcon } from "../components/Icons";
import { btn } from "../components/ui";
import { useLang } from "../i18n";

const field = "w-full rounded-[10px] border border-line bg-surface px-3 py-[.6rem] text-[.93rem] text-ink outline-none focus:border-lake";

// Asked after a thumbs down. onSubmit({ reason, details }) resolves, or throws to show an error.
// Once sent, the dialog thanks the person with a message that fits the reason they picked.
export default function FeedbackDialog({ onSubmit, onClose }) {
  const { s } = useLang();
  const t = s.chat.feedback;
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null); // the reason that was sent
  const doneRef = useRef(null);
  useEffect(() => { if (sent != null) doneRef.current?.focus(); }, [sent]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await onSubmit({ reason, details: details.trim().slice(0, 2000) }); setSent(reason); }
    catch { setError(t.failed); }
    finally { setBusy(false); }
  };

  if (sent != null) {
    const [title, body] = t.thanks[sent] || t.thanks[""];
    return (
      <Dialog title={title} onClose={onClose} width={460}>
        <div aria-hidden="true" className="mb-4 grid size-11 place-items-center rounded-full bg-lake/12 text-lake-deep">
          <CheckIcon className="i size-[22px]" />
        </div>
        <p role="status" className="m-0 text-[.95rem] leading-relaxed">{body}</p>
        <p className="mt-3 mb-0 text-[.9rem] leading-relaxed text-muted">{t.closing}</p>
        <div className="mt-6 flex justify-end">
          <button ref={doneRef} type="button" className={btn("primary", "sm")} onClick={onClose}>{t.done}</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={t.title} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="mb-1 block font-head text-[.9rem] font-semibold" htmlFor="fb-reason">{t.type}</label>
        <select id="fb-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${field} mb-4 h-11`}>
          <option value="">{t.select}</option>
          {Object.entries(t.reasons).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <label className="mb-1 block font-head text-[.9rem] font-semibold" htmlFor="fb-details">{t.details}</label>
        <textarea id="fb-details" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)}
          placeholder={t.placeholder} className={`${field} resize-y`} />
        <p className="mt-3 mb-0 text-[.82rem] text-muted italic">{t.note}</p>
        {error && <p role="alert" className="mt-3 mb-0 text-[.85rem] text-red">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={btn("ghost", "sm")} onClick={onClose}>{t.cancel}</button>
          <button type="submit" className={btn("primary", "sm")} disabled={busy}>{busy ? t.sending : t.submit}</button>
        </div>
      </form>
    </Dialog>
  );
}
