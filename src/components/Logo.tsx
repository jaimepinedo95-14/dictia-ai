import { clsx } from 'clsx'

type Props = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ variant = 'dark', size = 'md' }: Props) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }
  const iconSizes = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' }

  return (
    <div className={clsx('flex items-center gap-2 font-bold', sizes[size])}>
      <div className={clsx('rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0', iconSizes[size])}>
        <svg viewBox="0 0 24 24" fill="none" className="w-4/6 h-4/6">
          <path d="M12 4C7.582 4 4 7.582 4 12s3.582 8 8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="2" fill="white"/>
          <path d="M12 8v1M12 15v1M8 12h1M15 12h1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <span className={clsx(variant === 'light' ? 'text-white' : 'text-slate-900')}>
        Dictia <span className="text-primary-600">AI</span>
      </span>
    </div>
  )
}
