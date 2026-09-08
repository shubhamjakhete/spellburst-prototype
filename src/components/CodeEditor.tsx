import { useEffect, useRef, useState } from 'react'
import Editor, { type BeforeMount } from '@monaco-editor/react'

const DEBOUNCE_MS = 700

type Props = {
  value: string
  disabled?: boolean
  onCommit: (code: string) => void
}

export default function CodeEditor({ value, disabled = false, onCommit }: Props) {
  const [draft, setDraft] = useState(value)
  const [seen, setSeen] = useState(value)
  const onCommitRef = useRef(onCommit)

  if (value !== seen) {
    setSeen(value)
    setDraft(value)
  }

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    if (draft === value) return
    const timer = window.setTimeout(() => {
      onCommitRef.current(draft)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, value])

  const beforeMount: BeforeMount = (monaco) => {
      monaco.editor.defineTheme('planfirst', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#191c18',
          'editor.lineHighlightBackground': '#f4f5f1',
          'editorCursor.foreground': '#ed225d',
          'editorLineNumber.foreground': '#9aa096',
          'editorLineNumber.activeForeground': '#5c6159',
          'editor.selectionBackground': '#ed225d26',
          'editor.inactiveSelectionBackground': '#c8ccc266',
          'editorIndentGuide.background1': '#e9ebe5',
        },
      })
  }

  return (
    <div className="editor">
      <Editor
        height="340px"
        defaultLanguage="javascript"
        theme="planfirst"
        value={draft}
        beforeMount={beforeMount}
        loading={<p className="aside">loading the editor…</p>}
        onChange={(next) => {
          if (typeof next === 'string') setDraft(next)
        }}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontLigatures: false,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          padding: { top: 12, bottom: 12 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  )
}
