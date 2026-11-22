"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { createReviewAction } from "@/modules/reviews/presentation/actions";
import { cancelBookingAction, completeBookingAction, updateMeetingAction } from "./actions";
import type { BookingView } from "./view";

export type Tab = { key: string; label: string; ids: string[]; empty: string };

type Props = {
  viewer: "STUDENT" | "TUTOR";
  bookings: BookingView[];
  tabs: Tab[];
  emptyAction: { href: string; label: string };
};

/** "Mis tutorías" table: tabs, date sorting and an expandable detail per row with its actions. */
export function BookingList({ viewer, bookings, tabs, emptyAction }: Props) {
  const [tab, setTab] = useState(tabs[0].key);
  const [asc, setAsc] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const current = tabs.find((t) => t.key === tab)!;
  const rows = bookings
    .filter((b) => current.ids.includes(b.id))
    .sort((a, b) => (asc ? 1 : -1) * a.startIso.localeCompare(b.startIso));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar tutorías" className="flex flex-wrap gap-1.5 bg-field p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => { setTab(t.key); setOpen(null); }}
              className={`min-h-11 cursor-pointer px-4.5 text-[17px] ${tab === t.key ? "bg-accent text-white" : "text-ink"}`}>
              {t.label} ({t.ids.length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-lg">
          ORDENAR
          <button type="button" aria-pressed={asc} aria-label="Fecha más próxima primero" onClick={() => setAsc(true)} className={`flex h-9 w-9 cursor-pointer items-center justify-center text-white ${asc ? "bg-accent" : "bg-ink"}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 14l-6-6h4V2h4v6h4z" /></svg>
          </button>
          <button type="button" aria-pressed={!asc} aria-label="Fecha más lejana primero" onClick={() => setAsc(false)} className={`flex h-9 w-9 cursor-pointer items-center justify-center text-white ${!asc ? "bg-accent" : "bg-ink"}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2l6 6h-4v6H6V8H2z" /></svg>
          </button>
        </div>
      </div>

      <div className="min-h-[480px] overflow-x-auto border-4 border-ink p-3">
        <div className="flex min-w-[680px] flex-col">
          <div aria-hidden="true" className="grid min-h-20 grid-cols-[130px_140px_120px_minmax(0,1fr)_72px] items-center bg-ink px-2.5 text-[26px] text-white">
            <span className="text-center">MATERIA</span><span className="text-center">FECHA</span><span className="text-center">HORA</span>
            <span className="pl-6">{viewer === "STUDENT" ? "TUTOR" : "ESTUDIANTE"}</span><span />
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <p className="m-0 text-[22px]">{current.empty}</p>
              <Link href={emptyAction.href} className="btn-accent">{emptyAction.label}</Link>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {rows.map((b) => (
                <Row key={b.id} b={b} viewer={viewer} open={open === b.id} onToggle={() => setOpen(open === b.id ? null : b.id)} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ b, viewer, open, onToggle }: { b: BookingView; viewer: "STUDENT" | "TUTOR"; open: boolean; onToggle: () => void }) {
  const modality = b.modality === "VIRTUAL" ? "Virtual" : "Presencial";
  return (
    <li className="border-b-2 border-accent">
      <div className="grid min-h-24 grid-cols-[130px_140px_120px_minmax(0,1fr)_72px] items-center pl-2.5 text-accent">
        <span className="flex flex-col items-center text-xs text-accent-text"><SubjectIcon slug={b.subject.slug} size={52} />{b.subject.name}</span>
        <span className="text-center text-2xl">{b.date}</span>
        <span className="text-center text-2xl">{b.time}</span>
        <span className="flex min-w-0 items-center gap-3.5 pl-4">
          <Avatar userId={b.counterpart.id} avatarFile={b.counterpart.avatarFile} size={64} />
          <span className="flex min-w-0 flex-col">
            <span className="text-[22px] leading-tight uppercase">{b.counterpart.lastName}</span>
            <span className="text-base text-accent-text uppercase">{b.counterpart.firstName}</span>
            <span className="mt-1 self-start"><StatusChip status={b.status} extra={modality} /></span>
          </span>
        </span>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Ocultar" : "Ver"} detalles de ${b.subject.name} del ${b.date}`}
          className="flex h-21 w-18 cursor-pointer items-center justify-center bg-accent text-white">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true" className={open ? "rotate-90" : ""}><path d="M4 15h18V5l15 15-15 15V25H4z" /></svg>
        </button>
      </div>
      {open && <Detail b={b} viewer={viewer} />}
    </li>
  );
}

function Detail({ b, viewer }: { b: BookingView; viewer: "STUDENT" | "TUTOR" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [meeting, setMeeting] = useState(b.modality === "VIRTUAL" ? (b.meetingUrl ?? "") : (b.meetingPlace ?? ""));
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) { setError(null); setOk(success ?? null); setConfirming(false); } else { setError(r.error ?? "No se pudo completar la acción."); setOk(null); }
    });

  const upcomingAccepted = b.status === "ACCEPTED" && !b.isPast;
  const canCancel = (b.status === "PENDING" || b.status === "ACCEPTED") && !b.isPast;
  const canComplete = viewer === "TUTOR" && b.status === "ACCEPTED" && b.isPast;
  const canReview = viewer === "STUDENT" && b.status === "COMPLETED" && !b.review;
  const other = viewer === "STUDENT" ? "el profesor" : "el estudiante";

  return (
    <div className="flex flex-col gap-3 bg-accent-tint px-5 py-4 text-ink">
      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4.5 gap-y-1.5">
        <dt className="text-muted">Modalidad</dt><dd className="m-0">{b.modality === "VIRTUAL" ? "Virtual (videollamada externa)" : "Presencial"}</dd>
        <dt className="text-muted">{viewer === "STUDENT" ? "Tu mensaje" : "Mensaje del estudiante"}</dt><dd className="m-0">{b.note || "—"}</dd>
        {b.modality === "IN_PERSON" && b.meetingPlace && (<><dt className="text-muted">Punto de encuentro</dt><dd className="m-0">{b.meetingPlace}</dd></>)}
        {b.review && (<><dt className="text-muted">{viewer === "STUDENT" ? "Tu reseña" : "Reseña recibida"}</dt><dd className="m-0"><span className="text-accent">{"★".repeat(b.review.rating)}{"☆".repeat(5 - b.review.rating)}</span> {b.review.comment ? `“${b.review.comment}”` : ""}</dd></>)}
      </dl>

      {viewer === "STUDENT" && b.modality === "VIRTUAL" && b.status === "ACCEPTED" && b.meetingUrl && (
        <div className="flex flex-wrap items-center gap-2.5 border-2 border-accent bg-white px-3 py-2.5">
          <span className="text-[15px] text-muted">Enlace de la reunión (externo):</span>
          <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className="break-all text-accent-text underline">{b.meetingUrl}</a>
          <button type="button" className="min-h-9 cursor-pointer border border-accent bg-white px-3 text-sm text-accent-text"
            onClick={() => navigator.clipboard?.writeText(b.meetingUrl!).then(() => setCopied(true), () => setError("No se pudo copiar el enlace."))}>
            {copied ? "Copiado ✓" : "Copiar enlace"}
          </button>
        </div>
      )}
      {viewer === "STUDENT" && b.modality === "VIRTUAL" && b.status === "PENDING" && (
        <p className="m-0 text-[15px] text-ink-soft">El enlace de la reunión aparecerá aquí cuando el profesor acepte la solicitud.</p>
      )}

      {viewer === "TUTOR" && upcomingAccepted && (
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-[1_1_320px] flex-col gap-1.5 text-[15px] text-ink-soft">
            {b.modality === "VIRTUAL" ? "Enlace de la reunión (Meet, Zoom, Teams…)" : "Punto de encuentro"}
            <input type={b.modality === "VIRTUAL" ? "url" : "text"} value={meeting} onChange={(e) => { setMeeting(e.target.value); setOk(null); }}
              className="min-h-11 border-0 bg-white px-2.5 text-base text-ink" />
          </label>
          <button type="button" disabled={pending} className="btn-accent"
            onClick={() => run(() => updateMeetingAction(b.id, b.modality === "VIRTUAL" ? { meetingUrl: meeting } : { meetingPlace: meeting }), "Datos actualizados. El estudiante fue notificado.")}>
            Guardar
          </button>
          {b.modality === "VIRTUAL" && b.meetingUrl && (
            <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-accent-text underline">Abrir reunión ↗</a>
          )}
        </div>
      )}

      {canReview && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-2 border-accent bg-white px-3.5 py-3">
          <legend className="px-1.5">Califica esta tutoría</legend>
          <div role="group" aria-label="Puntuación" className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => setRating(n)}
                className={`h-11 w-11 cursor-pointer text-3xl leading-none ${n <= rating ? "text-accent" : "text-[#C4C8CE]"}`}>★</button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[15px] text-muted">
            Comentario (opcional)
            <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="border-0 bg-field p-2 text-base text-ink" />
          </label>
          <button type="button" disabled={pending} className="btn-accent self-start"
            onClick={() => rating ? run(() => createReviewAction(b.id, { rating, comment: comment.trim() || undefined }), "¡Gracias! Tu reseña fue publicada.") : setError("Elige de 1 a 5 estrellas.")}>
            Enviar reseña
          </button>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canComplete && (
          <button type="button" disabled={pending} className="btn-accent" onClick={() => run(() => completeBookingAction(b.id))}>Marcar como completada</button>
        )}
        {canCancel && !confirming && (
          <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>Cancelar tutoría</button>
        )}
        {canCancel && confirming && (
          <div role="alertdialog" aria-label="Confirmar cancelación" className="flex flex-wrap items-center gap-2.5">
            <span>¿Cancelar esta tutoría? Se notificará a {other}.</span>
            <button type="button" disabled={pending} className="btn bg-danger text-white" onClick={() => run(() => cancelBookingAction(b.id))}>Sí, cancelar</button>
            <button type="button" className="btn-outline" onClick={() => setConfirming(false)}>No, mantener</button>
          </div>
        )}
      </div>
      {error && <p role="alert" className="field-error text-[15px]">{error}</p>}
      {ok && <p role="status" className="m-0 text-[15px] text-success">✓ {ok}</p>}
    </div>
  );
}
