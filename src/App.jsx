import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ErrorInput from './components/ErrorInput'
import ResultPanel from './components/ResultPanel'
import { EmptyResult, LoadingResult } from './components/ResultStates'
import SettingsModal from './components/SettingsModal'
import HistoryPanel from './components/HistoryPanel'
import { parseError } from './lib/parseError'
import { analyzeError } from './lib/analyze'
import {
  getApiKey,
  setApiKey as persistApiKey,
  getTheme,
  setTheme as persistTheme,
  getHistory,
  addHistory,
  removeHistory,
  clearHistory,
} from './lib/storage'

export default function App() {
  const [raw, setRaw] = useState('')
  const [theme, setTheme] = useState(getTheme())
  const [apiKey, setApiKey] = useState(getApiKey())
  const [history, setHistory] = useState(() => getHistory())

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null) // { result, engine, note }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [jump, setJump] = useState(null) // { line, n } - scroll+highlight a line
  const jumpN = useRef(0)

  const abortRef = useRef(null)
  const resultRef = useRef(null)

  const detected = useMemo(() => parseError(raw), [raw])

  function jumpToLine(line) {
    if (!line) return
    jumpN.current += 1
    setJump({ line, n: jumpN.current })
  }

  // Apply theme to <html>.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    persistTheme(next)
  }

  function saveKey(key) {
    setApiKey(key)
    persistApiKey(key)
  }

  async function handleAnalyze() {
    if (!raw.trim() || analyzing) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAnalyzing(true)
    setAnalysis(null)

    // Scroll the result into view on small screens.
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 40)

    try {
      const out = await analyzeError(raw, {
        apiKey,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setAnalysis(out)

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        raw,
        preview: (out.parsed?.firstLine || raw.split('\n')[0] || '').slice(0, 90),
        title: out.result.title,
        severity: out.result.severity,
        language: out.result.language,
        engine: out.engine,
        result: out.result,
        note: out.note || null,
      }
      setHistory(addHistory(entry))
    } catch (e) {
      if (e?.name === 'AbortError') return
      setAnalysis({
        result: {
          source: 'offline',
          title: 'Something went wrong',
          severity: 'medium',
          summary:
            'ER Sense hit an unexpected problem while analyzing this error. Try again, or check your API key in Settings.',
          causes: [],
          fixes: [],
        },
        engine: 'offline',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  function handleClear() {
    abortRef.current?.abort()
    setRaw('')
    setAnalysis(null)
    setAnalyzing(false)
  }

  function selectHistory(item) {
    setRaw(item.raw)
    setAnalysis({ result: item.result, engine: item.engine, note: item.note })
    setHistoryOpen(false)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function removeHistoryItem(id) {
    setHistory(removeHistory(id))
  }

  function clearAllHistory() {
    setHistory(clearHistory())
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        hasKey={!!apiKey}
        historyCount={history.length}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero */}
        <div className="mb-7 sm:mb-9 max-w-2xl">
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-fg leading-[1.1]">
            Understand any error{' '}
            <span className="text-brand">in seconds.</span>
          </h1>
          <p className="text-[14.5px] sm:text-[15px] text-muted leading-relaxed mt-3">
            Paste a stack trace and ER Sense explains what it means, why it happened,
            and how to fix it - in plain English, with copy-ready code.
          </p>
        </div>

        {/* Workspace */}
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 items-start">
          <div className="lg:sticky lg:top-[88px]">
            <ErrorInput
              value={raw}
              onChange={setRaw}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              loading={analyzing}
              detected={detected}
              jump={jump}
            />
          </div>

          <div ref={resultRef} className="min-w-0">
            {analyzing ? (
              <LoadingResult />
            ) : analysis?.result ? (
              <ResultPanel
                result={analysis.result}
                engine={analysis.engine}
                note={analysis.note}
                onJumpToLine={jumpToLine}
              />
            ) : (
              <EmptyResult onOpenSettings={() => setSettingsOpen(true)} />
            )}
          </div>
        </div>
      </main>

      <Footer />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveKey={saveKey}
      />
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history}
        onSelect={selectHistory}
        onRemove={removeHistoryItem}
        onClear={clearAllHistory}
      />
    </div>
  )
}
