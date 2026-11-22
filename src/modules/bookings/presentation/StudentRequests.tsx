"use client";

import Link from "next/link";
import { useState } from "react";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { StatusChip } from "@/components/ui/StatusChip";
import type { BookingView } from "./view";

type Filter = "ALL" | "PENDING" | "REJECTED";
const LABEL: Record<Filter, string> = { ALL: "todas las solicitudes", PENDING: "pendientes", REJECTED: "declinadas" };

/** Request counters that double as filters for the requests table. */
export function StudentRequests({ requests }: { requests: BookingView[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const rows = requests.filter((r) => filter === "ALL" || r.status === filter);
  const tile = (key: Exclude<Filter, "ALL">, label: string) => {
    const count = requests.filter((r) => r.status === key).length;
    const on = filter === key;
    return (
      <button type="button" aria-pressed={on} onClick={() => setFilter(on ? "ALL" : key)}
        className={`flex min-h-30 cursor-pointer flex-col items-center justify-center border-4 bg-accent text-white ${on ? "border-ink" : "border-accent"}`}>
        <span className="pt-2.5 font-display text-[84px] leading-[0.8] font-semibold">{count}</span>
        <span>{label}</span>
      </button>
    );
  };
  return (
    <section aria-labelledby="req-h" className="flex flex-col gap-2.5">
      <h2 id="req-h" className="section-title">Solicitudes</h2>
      <div className="grid grid-cols-2 gap-4">
        {tile("PENDING", "PENDIENTES")}
        {tile("REJECTED", "DECLINADAS")}
      </div>
      <div className="flex min-h-[360px] flex-col gap-2 border-4 border-accent p-2.5">
        <div className="flex min-h-9 items-center justify-between gap-2">
          <span role="status" className="text-[15px] text-ink-soft">Mostrando: {LABEL[filter]}</span>
          {filter !== "ALL" && (
            <button type="button" onClick={() => setFilter("ALL")} className="min-h-9 cursor-pointer border border-accent px-3 text-sm text-accent-text">
              Ver todas
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="m-0 py-10 text-center text-ink-soft">
            No tienes solicitudes {filter === "ALL" ? "pendientes ni declinadas" : LABEL[filter]}. <Link href="/student/search" className="text-accent-text underline">Busca un tutor</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-[17px]">
              <thead>
                <tr className="bg-ink text-white">
                  <th scope="col" className="px-3 py-2.5 text-left font-normal">PROFESOR</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">MATERIA</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">FECHA</th>
                  <th scope="col" className="px-2 py-2.5 font-normal">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b-2 border-accent">
                    <td className="px-3 py-2.5">
                      <Link href={`/student/tutors/${r.counterpart.id}`} className="text-[19px] text-ink underline">
                        {r.counterpart.firstName} {r.counterpart.lastName}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="inline-flex flex-col items-center text-xs text-accent-text">
                        <SubjectIcon slug={r.subject.slug} size={28} />
                        {r.subject.name}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">{r.date}</td>
                    <td className="px-2 py-1.5 text-center"><StatusChip status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
