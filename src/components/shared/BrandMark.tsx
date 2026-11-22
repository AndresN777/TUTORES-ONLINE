/** "TUTORES ON-LINE" wordmark with the placeholder logo square (replace "TO" with the final logo). */
export function BrandMark({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  const text = inverted ? "text-white" : "text-ink";
  const box = inverted ? "border-white text-white" : "border-ink text-ink";
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className={`font-display text-5xl leading-none font-semibold sm:text-[56px] ${text}`}>TUTORES ON-LINE</span>
      <span aria-hidden="true" className={`flex h-11 w-11 items-center justify-center rounded-[9px] border-[3px] pt-1 font-display text-2xl font-bold ${box}`}>
        TO
      </span>
    </span>
  );
}
