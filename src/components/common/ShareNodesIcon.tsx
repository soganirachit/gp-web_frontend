type Props = {
  className?: string;
  size?: number;
};

/** Matches Font Awesome thin `fa-share-nodes` (three connected nodes). */
export function ShareNodesIcon({ className, size = 20 }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="18" cy="5" r="2.75" />
      <circle cx="6" cy="12" r="2.75" />
      <circle cx="18" cy="19" r="2.75" />
      <path d="M8.59 13.51 15.42 17.49" />
      <path d="M15.41 6.51 8.59 10.49" />
    </svg>
  );
}
