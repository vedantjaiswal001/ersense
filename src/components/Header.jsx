import Logo from './Logo'
import { Settings, Sun, Moon, Clock, Sparkles } from './icons'

function IconButton({ children, label, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid place-items-center h-9 w-9 rounded-[10px] text-muted hover:text-fg border border-transparent hover:border-line hover:bg-elevated transition-colors"
    >
      {children}
      {badge}
    </button>
  )
}

export default function Header({ theme, onToggleTheme, onOpenSettings, onOpenHistory, hasKey, historyCount }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 backdrop-blur-xl bg-bg/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />

        <div className="flex items-center gap-2">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 text-[11px] font-medium border"
            style={
              hasKey
                ? { color: 'var(--success)', borderColor: 'var(--success)44', background: 'var(--success)12' }
                : { color: 'var(--muted)', borderColor: 'var(--line-strong)', background: 'var(--elevated)' }
            }
            title={hasKey ? 'Gemini key detected - AI mode' : 'No key - offline mode'}
          >
            {hasKey ? (
              <Sparkles width={13} height={13} />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            )}
            {hasKey ? 'AI mode' : 'Offline mode'}
          </span>

          <IconButton
            label={`History${historyCount ? ` (${historyCount})` : ''}`}
            onClick={onOpenHistory}
            badge={
              historyCount ? (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 grid place-items-center rounded-full bg-brand text-[9px] font-semibold text-white">
                  {historyCount > 9 ? '9+' : historyCount}
                </span>
              ) : null
            }
          >
            <Clock width={17} height={17} />
          </IconButton>

          <IconButton label="Toggle theme" onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun width={17} height={17} /> : <Moon width={17} height={17} />}
          </IconButton>

          <IconButton label="Settings" onClick={onOpenSettings}>
            <Settings width={17} height={17} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
