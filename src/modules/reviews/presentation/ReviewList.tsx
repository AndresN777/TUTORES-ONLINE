"use client";

import { useState } from "react";

export type ReviewItem = { id: string; stars: string; rating: number; author: string; date: string; text: string | null };

const INITIAL = 3;

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? reviews : reviews.slice(0, INITIAL);
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 border-b-2 border-accent pb-2.5">
            <span>
              <span role="img" aria-label={`${r.rating} de 5 estrellas`} className="text-accent">{r.stars}</span> · {r.author} · {r.date}
            </span>
            {r.text && <span className="font-light">{r.text}</span>}
          </li>
        ))}
      </ul>
      {reviews.length > INITIAL && (
        <button type="button" onClick={() => setAll((v) => !v)} className="btn-outline self-start">
          {all ? "Ver menos reseñas" : `Ver las ${reviews.length} reseñas`}
        </button>
      )}
    </>
  );
}
