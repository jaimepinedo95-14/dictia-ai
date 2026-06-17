type Props = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

const HEIGHTS: Record<string, number> = { sm: 24, md: 72, lg: 64 }

// Icon mark — the bars + ECG waveform inside the rounded square
function IconMark({ size, light = false }: { size: number; light?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <rect x="0" y="0" width="200" height="200" rx="44"
        fill={light ? 'rgba(255,255,255,0.15)' : '#16213A'} />
      <rect x="30" y="92" width="10" height="16" rx="5" fill="#E8744A"/>
      <rect x="48" y="84" width="10" height="32" rx="5" fill="#E8744A"/>
      <rect x="66" y="76" width="10" height="48" rx="5" fill="#E8744A"/>
      <rect x="84" y="84" width="10" height="32" rx="5" fill="#E8744A"/>
      <rect x="102" y="92" width="10" height="16" rx="5" fill="#E8744A"/>
      <path
        d="M112,100 L120,100 L128,92 L136,100 L144,138 L152,42 L160,116 L168,100 L176,90 L184,100"
        stroke="#E8744A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  )
}

export default function Logo({ variant = 'dark', size = 'md' }: Props) {
  const h = HEIGHTS[size]
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl'

  if (variant === 'light') {
    return (
      <div className="flex items-center gap-2">
        <IconMark size={h} light />
        <span className={`font-bold ${textSize} text-white`}>
          Dictia <span style={{ color: '#E8744A' }}>AI</span>
        </span>
      </div>
    )
  }

  // Dark variant: full horizontal inline SVG
  return (
    <svg
      height={h}
      viewBox="0 0 700 180"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 'auto', display: 'block' }}
      aria-label="Dictia AI"
      role="img"
    >
      {/* Icon box */}
      <rect x="20" y="20" width="140" height="140" rx="30" fill="#16213A"/>
      <rect x="39.95" y="101.3" width="6.5" height="10.4" rx="3.25" fill="#E8744A"/>
      <rect x="51.65" y="96.1" width="6.5" height="20.8" rx="3.25" fill="#E8744A"/>
      <rect x="63.35" y="90.9" width="6.5" height="31.2" rx="3.25" fill="#E8744A"/>
      <rect x="75.05" y="96.1" width="6.5" height="20.8" rx="3.25" fill="#E8744A"/>
      <rect x="86.75" y="101.3" width="6.5" height="10.4" rx="3.25" fill="#E8744A"/>
      <path
        d="M93.25,106.5 L98.45,106.5 L103.65,101.3 L108.85,106.5 L114.05,131.2 L119.25,68.8 L124.45,116.9 L129.65,106.5 L134.85,100 L140.05,106.5"
        stroke="#E8744A" strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* Wordmark */}
      <text x="178" y="128" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
        fontSize="88" fontWeight="800" letterSpacing="-3" fill="#16213A">
        Dictia
      </text>
      {/* AI mini bars + text */}
      <rect x="526" y="68" width="9" height="18" rx="4.5" fill="#E8744A"/>
      <rect x="540" y="62" width="9" height="30" rx="4.5" fill="#E8744A"/>
      <rect x="554" y="68" width="9" height="18" rx="4.5" fill="#E8744A"/>
      <text x="572" y="96" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
        fontSize="56" fontWeight="800" letterSpacing="-1" fill="#E8744A">
        AI
      </text>
    </svg>
  )
}
