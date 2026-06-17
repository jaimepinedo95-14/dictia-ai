type Props = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

const HEIGHT: Record<string, number> = { sm: 24, md: 30, lg: 38 }

export default function Logo({ variant = 'dark', size = 'md' }: Props) {
  const h = HEIGHT[size]

  // Footer / dark-background contexts: icon (white version) + text in white
  if (variant === 'light') {
    return (
      <div className="flex items-center gap-2.5">
        <img
          src="/dictia-icon-light.svg"
          alt=""
          aria-hidden="true"
          style={{ height: h, width: 'auto' }}
        />
        <span className="text-white font-bold" style={{ fontSize: h * 0.62 }}>
          Dictia <span className="text-primary-400">AI</span>
        </span>
      </div>
    )
  }

  // Default: full horizontal logo on light backgrounds
  return (
    <img
      src="/dictia-logo-horizontal.svg"
      alt="Dictia AI"
      style={{ height: h, width: 'auto' }}
    />
  )
}
