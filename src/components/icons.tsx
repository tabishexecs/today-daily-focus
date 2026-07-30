export function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17.334V6.667c0-.88 0-1.32.185-1.562a1 1 0 0 1 .68-.375c.308-.012.68.242 1.423.753l7.766 5.333c.63.433.945.649 1.055.92a1 1 0 0 1 0 .738c-.11.271-.425.487-1.055.92l-7.766 5.333c-.743.51-1.115.765-1.423.753a1 1 0 0 1-.68-.375C5 18.653 5 18.213 5 17.334Z" />
    </svg>
  );
}

export function PauseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="5" width="3.5" height="14" rx="1" />
      <rect x="14.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

export function PlayFilledIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginLeft: 2 }}
    >
      <path d="M5 17.334V6.667c0-.88 0-1.32.185-1.562a1 1 0 0 1 .68-.375c.308-.012.68.242 1.423.753l7.766 5.333c.63.433.945.649 1.055.92a1 1 0 0 1 0 .738c-.11.271-.425.487-1.055.92l-7.766 5.333c-.743.51-1.115.765-1.423.753a1 1 0 0 1-.68-.375C5 18.653 5 18.213 5 17.334Z" />
    </svg>
  );
}

export function CollapseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" y1="4" x2="21" y2="20" />
      <line x1="3" y1="12" x2="20" y2="12" />
      <polyline points="13 6 20 12 13 18" />
    </svg>
  );
}
