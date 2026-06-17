type Props = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

const HEIGHTS: Record<string, string> = { sm: 'h-6', md: 'h-8', lg: 'h-10' }

export default function Logo({ variant = 'dark', size = 'md' }: Props) {
  const h = HEIGHTS[size]

  if (variant === 'light') {
    return (
      <div className="flex items-center gap-2.5">
        <img
          src="/dictia-icon-light.svg"
          alt=""
          aria-hidden="true"
          className={`${h} w-auto`}
        />
        <span className={`text-white font-bold ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl'}`}>
          Dictia <span className="text-primary-400">AI</span>
        </span>
      </div>
    )
  }

  return (
    <img
      src="/dictia-logo-horizontal.svg"
      alt="Dictia AI"
      className={`${h} w-auto`}
    />
  )
}
