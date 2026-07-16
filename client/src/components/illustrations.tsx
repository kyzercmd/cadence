// Simple undraw-inspired illustrations as inline SVG components. Use these
// across empty states, login, and the sidebar Support card so the look
// matches the reference images without any external dependencies.

export function SupportIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="laptop-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* laptop */}
      <rect x="65" y="120" width="120" height="55" rx="6" fill="url(#laptop-grad)" />
      <rect x="58" y="170" width="135" height="8" rx="4" fill="#f59e0b" />
      {/* girl body */}
      <ellipse cx="90" cy="160" rx="35" ry="25" fill="#3b82f6" />
      {/* head */}
      <circle cx="80" cy="95" r="20" fill="#fde7d3" />
      {/* hair */}
      <path d="M60 95 Q60 65 80 65 Q105 65 100 95 Q97 80 90 80 Q85 90 78 88 Q70 85 65 95 Z" fill="#1e3a5f" />
      {/* arm to laptop */}
      <path d="M105 130 Q130 130 145 145" stroke="#3b82f6" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* leaves */}
      <circle cx="180" cy="55" r="6" fill="#86efac" />
      <circle cx="195" cy="70" r="4" fill="#86efac" />
      <circle cx="40" cy="50" r="5" fill="#fca5a5" />
    </svg>
  );
}

export function EmptyTasksIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="50" width="160" height="100" rx="10" fill="#eff6ff" />
      <rect x="55" y="70" width="60" height="10" rx="5" fill="#bfdbfe" />
      <rect x="55" y="90" width="120" height="6" rx="3" fill="#dbeafe" />
      <rect x="55" y="104" width="100" height="6" rx="3" fill="#dbeafe" />
      <rect x="55" y="118" width="80" height="6" rx="3" fill="#dbeafe" />
      <circle cx="180" cy="78" r="14" fill="#3b82f6" />
      <path d="M174 78 l4 4 l8 -8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LoginIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="150" r="120" fill="url(#bg-grad)" />
      {/* monitor */}
      <rect x="120" y="80" width="160" height="110" rx="8" fill="white" stroke="#3b82f6" strokeWidth="3" />
      <rect x="135" y="100" width="60" height="8" rx="4" fill="#3b82f6" />
      <rect x="135" y="118" width="130" height="6" rx="3" fill="#bfdbfe" />
      <rect x="135" y="132" width="100" height="6" rx="3" fill="#bfdbfe" />
      <rect x="135" y="155" width="50" height="20" rx="10" fill="#3b82f6" />
      <rect x="180" y="190" width="40" height="20" fill="#94a3b8" />
      <rect x="160" y="210" width="80" height="6" rx="3" fill="#64748b" />
      {/* person */}
      <circle cx="80" cy="180" r="18" fill="#fde7d3" />
      <path d="M60 180 Q60 155 80 155 Q100 155 100 180 Q95 168 87 168 Q80 175 72 170 Z" fill="#1e3a5f" />
      <path d="M65 200 Q60 240 75 250 L100 250 Q105 235 95 200 Z" fill="#3b82f6" />
      {/* lock */}
      <circle cx="320" cy="200" r="22" fill="#fbbf24" />
      <rect x="312" y="195" width="16" height="14" rx="2" fill="white" />
      <path d="M315 195 v-5 a5 5 0 0 1 10 0 v5" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function EmptyInboxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 160" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="50" width="140" height="80" rx="8" fill="#eff6ff" />
      <path d="M40 60 L110 105 L180 60" stroke="#3b82f6" strokeWidth="3" fill="none" />
      <circle cx="180" cy="50" r="14" fill="#fbbf24" />
      <text x="180" y="56" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">!</text>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#3b82f6" />
      <path
        d="M14 12 h6 a6 6 0 0 1 0 12 h-6 z M14 16 v8 M22 16 q6 4 0 8"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
