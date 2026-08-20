import { Sparkles, Github, Mail } from './icons'

const GITHUB_URL = 'https://github.com/vedantjaiswal001'
const EMAIL = 'jaiswalvedant2004@gmail.com'

function SocialLink({ href, label, children }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
      aria-label={label}
      title={label}
      className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-fg border border-transparent hover:border-line hover:bg-elevated transition-colors"
    >
      {children}
    </a>
  )
}

export default function Footer() {
  return (
    <footer className="border-t border-line/70 mt-4">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles width={13} height={13} style={{ color: 'var(--brand)' }} />
            <span className="mono">ER Sense</span>
          </span>
          <span className="text-faint">- error triage for developers</span>
        </span>

        <div className="flex items-center gap-3">
          <span className="text-muted">
            Made by{' '}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-fg font-medium hover:text-brand transition-colors"
            >
              Vedant Jaiswal
            </a>
          </span>
          <span className="text-faint">·</span>
          <div className="flex items-center gap-1">
            <SocialLink href={GITHUB_URL} label="GitHub">
              <Github width={15} height={15} />
            </SocialLink>
            <SocialLink href={`mailto:${EMAIL}`} label="Email">
              <Mail width={15} height={15} />
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
