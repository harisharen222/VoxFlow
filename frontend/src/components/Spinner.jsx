// Spinner.jsx
export default function Spinner({ size = 16 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className="spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
      <path d="M12 3 A9 9 0 0 1 21 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
