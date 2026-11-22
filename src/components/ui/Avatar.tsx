type Props = { userId: string; avatarFile: string | null; size?: number; ringed?: boolean; className?: string };

/** User photo served by the avatar endpoint, or the neutral silhouette from the style guide. */
export function Avatar({ userId, avatarFile, size = 64, ringed = false, className = "" }: Props) {
  if (avatarFile) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private, auth-free endpoint; next/image adds nothing here
      <img
        src={`/api/v1/users/${userId}/avatar?v=${encodeURIComponent(avatarFile)}`}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${ringed ? "border-2 border-white" : ""} ${className}`}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="20" cy="20" r={ringed ? 19 : 20} fill="#D8DCE6" stroke={ringed ? "#fff" : "none"} strokeWidth="2" />
      <circle cx="20" cy="16" r="7" fill={ringed ? "#3A414B" : "#A3A8B4"} />
      <path d="M6.5 34c2.5-6 7.5-9 13.5-9s11 3 13.5 9" fill={ringed ? "#3A414B" : "#A3A8B4"} />
    </svg>
  );
}
