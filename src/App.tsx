import { useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { open } from '@tauri-apps/api/dialog'
import { listen } from '@tauri-apps/api/event'
import { HistoryEntry, AppHistory, TreeNode } from './types'
import { renderMarkdown } from './markdown'
import { dirname, fileName, resolveMarkdownLink, titleFromPath } from './path'

type OpenedDocument = {
  filePath: string
  rootPath?: string
  title: string
  markdown: string
  html: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    })
    .map((node) =>
      node.children
        ? {
            ...node,
            children: sortTree(node.children)
          }
        : node
    )
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])])
}

function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown|mdown|mkdn)$/i.test(path)
}

function isLikelyText(path: string): boolean {
  return isMarkdownFile(path) || /\.(txt|text)$/i.test(path)
}

function getAnchorFromHash(hash: string): string | null {
  const clean = hash.replace(/^#/, '').trim()
  return clean ? clean : null
}

function App() {
  const [history, setHistory] = useState<AppHistory>({ recent: [] })
  const [projectRoot, setProjectRoot] = useState<string | null>(null)
  const [projectTree, setProjectTree] = useState<TreeNode[]>([])
  const [openedDocument, setOpenedDocument] = useState<OpenedDocument | null>(null)
  const [status, setStatus] = useState('准备就绪')
  const [sidebarMode, setSidebarMode] = useState<'tree' | 'recent'>('tree')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const historyRef = useRef<AppHistory>({ recent: [] })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const saved = (await invoke<AppHistory>('load_history')) ?? { recent: [] }
        if (mounted) {
          setHistory(saved)
          historyRef.current = saved
        }
      } catch {
        if (mounted) {
          setHistory({ recent: [] })
          historyRef.current = { recent: [] }
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const cleanupPromise = listen<{ filePath: string; rootPath?: string; hash?: string }>('liro:open', async (event) => {
      const payload = event.payload
      if (payload.rootPath) {
        await openProject(payload.rootPath, payload.filePath)
        if (payload.hash) {
          requestAnimationFrame(() => scrollToAnchor(payload.hash ?? ''))
        }
      } else {
        await openFile(payload.filePath)
        if (payload.hash) {
          requestAnimationFrame(() => scrollToAnchor(payload.hash ?? ''))
        }
      }
    })

    return () => {
      cleanupPromise.then((unlisten) => unlisten())
    }
  }, [])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const link = target?.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href || !openedDocument) return

      if (href.startsWith('#')) {
        event.preventDefault()
        scrollToAnchor(href)
        return
      }

      const resolved = resolveMarkdownLink(openedDocument.filePath, href)
      if (resolved) {
        event.preventDefault()
        void handleLinkedNavigation(href, resolved)
      }
    }

    const root = viewerRef.current
    root?.addEventListener('click', onClick)
    return () => root?.removeEventListener('click', onClick)
  }, [openedDocument])

  const recentProjects = useMemo(() => history.recent.filter((entry) => entry.kind === 'project'), [history])
  const recentFiles = useMemo(() => history.recent.filter((entry) => entry.kind === 'file'), [history])
  const activePath = openedDocument?.rootPath ?? openedDocument?.filePath ?? projectRoot ?? ''

  async function persistHistory(next: AppHistory) {
    historyRef.current = next
    setHistory(next)
    try {
      await invoke('save_history', { history: next })
    } catch {
      // Ignore local persistence errors for now.
    }
  }

  async function recordHistory(entry: HistoryEntry) {
    const filtered = historyRef.current.recent.filter((item) => item.path !== entry.path || item.kind !== entry.kind)
    const next = { recent: [entry, ...filtered].slice(0, 20) }
    await persistHistory(next)
  }

  async function loadProjectTree(root: string) {
    const tree = await invoke<TreeNode[]>('scan_project', { rootPath: root })
    const next = sortTree(tree)
    setProjectTree(next)
    if (next.length > 0) {
      setExpandedDirs((current) => new Set(current).add(root))
    }
    return next
  }

  async function openProject(rootPath: string, filePath?: string) {
    setStatus('正在打开项目...')
    setProjectRoot(rootPath)
    const tree = await loadProjectTree(rootPath)

    let target = filePath
    if (!target) {
      const firstMarkdown = flattenTree(tree).find((node) => node.kind === 'file' && isMarkdownFile(node.path))
      target = firstMarkdown?.path
    }

    if (target && isLikelyText(target)) {
      await openFile(target, rootPath)
    } else {
      setStatus(`已打开项目 ${fileName(rootPath)}`)
    }

    await recordHistory({
      kind: 'project',
      path: rootPath,
      name: fileName(rootPath) || rootPath,
      lastOpenedAt: new Date().toISOString(),
      lastViewedPath: target ?? undefined
    })
  }

  async function openFile(filePath: string, rootPath?: string) {
    const markdown = await invoke<string>('read_text_file', { filePath })
    const html = renderMarkdown(markdown)
    const title = titleFromPath(filePath)
    setOpenedDocument({
      filePath,
      rootPath,
      title,
      markdown,
      html
    })
    setStatus(`已打开 ${fileName(filePath)}`)
    await recordHistory({
      kind: 'file',
      path: filePath,
      name: fileName(filePath),
      lastOpenedAt: new Date().toISOString(),
      lastViewedPath: filePath
    })
  }

  async function handleLinkedNavigation(rawHref: string, resolvedPath: string) {
    const [pathPart, hashPart] = rawHref.split('#')
    const anchor = hashPart ? `#${hashPart}` : ''
    if (rawHref.startsWith('#')) {
      scrollToAnchor(rawHref)
      return
    }
    if (!isMarkdownFile(resolvedPath) && anchor) {
      scrollToAnchor(anchor)
      return
    }

    if (isMarkdownFile(resolvedPath)) {
      const nextRoot = projectRoot ?? dirname(resolvedPath)
      await openFile(resolvedPath, nextRoot)
      if (anchor) {
        requestAnimationFrame(() => scrollToAnchor(anchor))
      }
      return
    }

    if (pathPart) {
      setStatus(`无法识别链接: ${rawHref}`)
    }
  }

  async function openPicker(kind: 'file' | 'project') {
    const selection = await open({
      directory: kind === 'project',
      multiple: false,
      filters: kind === 'file' ? [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkdn', 'txt'] }] : undefined
    })

    if (typeof selection !== 'string' || !selection) return
    if (kind === 'project') {
      await openProject(selection)
      return
    }
    await openFile(selection)
    setProjectRoot(dirname(selection) || null)
  }

  function scrollToAnchor(hash: string) {
    const anchor = getAnchorFromHash(hash)
    if (!anchor || !viewerRef.current) return
    const target = viewerRef.current.querySelector<HTMLElement>(`#${window.CSS.escape(anchor)}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleExpanded(path: string) {
    setExpandedDirs((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function renderTree(nodes: TreeNode[], depth = 0) {
    return (
      <ul className="tree-list">
        {nodes.map((node) => {
          const isOpen = expandedDirs.has(node.path)
          const isActive = openedDocument?.filePath === node.path
          return (
            <li key={node.path} className={`tree-item depth-${depth}`}>
              <button
                className={`tree-row ${isActive ? 'active' : ''}`}
                onClick={async () => {
                  if (node.kind === 'directory') {
                    toggleExpanded(node.path)
                    return
                  }
                  await openFile(node.path, projectRoot ?? dirname(node.path))
                }}
              >
                <span className={`tree-icon ${node.kind}`} />
                <span className="tree-name">{node.name}</span>
              </button>
              {node.kind === 'directory' && node.children?.length ? isOpen || depth === 0 ? renderTree(node.children, depth + 1) : null : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>Liro</h1>
            <p>Markdown Reader</p>
          </div>
        </div>

        <div className="sidebar-actions">
          <button onClick={() => void openPicker('file')}>打开文档</button>
          <button onClick={() => void openPicker('project')}>打开项目</button>
        </div>

        <div className="sidebar-tabs">
          <button className={sidebarMode === 'tree' ? 'active' : ''} onClick={() => setSidebarMode('tree')}>
            目录
          </button>
          <button className={sidebarMode === 'recent' ? 'active' : ''} onClick={() => setSidebarMode('recent')}>
            历史
          </button>
        </div>

        {sidebarMode === 'tree' ? (
          <div className="sidebar-panel">
            {projectTree.length ? renderTree(projectTree) : <div className="empty-state">先打开一个 md 文档或目录项目</div>}
          </div>
        ) : (
          <div className="sidebar-panel">
            <h2>最近项目</h2>
            <ul className="recent-list">
              {recentProjects.map((entry) => (
                <li key={entry.path}>
                  <button onClick={() => void openProject(entry.path, entry.lastViewedPath)}>{entry.name}</button>
                </li>
              ))}
            </ul>
            <h2>最近文档</h2>
            <ul className="recent-list">
              {recentFiles.map((entry) => (
                <li key={entry.path}>
                  <button onClick={() => void openFile(entry.path)}>{entry.name}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{openedDocument?.title ?? 'Liro'}</strong>
            <span>{activePath || '未打开内容'}</span>
          </div>
          <div className="topbar-status">{status}</div>
        </header>

        <section className="viewer">
          {openedDocument ? (
            <article
              ref={viewerRef}
              className="markdown-body"
              dangerouslySetInnerHTML={{
                __html:
                  openedDocument.html +
                  `<div class="viewer-meta"><hr /><p><strong>路径</strong> ${escapeHtml(openedDocument.filePath)}</p></div>`
              }}
            />
          ) : (
            <div className="empty-hero">
              <h2>打开一个 Markdown 项目</h2>
              <p>支持单文件、项目目录、内部链接跳转和 GitHub 风格渲染。</p>
              <div className="hero-actions">
                <button onClick={() => void openPicker('file')}>打开文档</button>
                <button onClick={() => void openPicker('project')}>打开项目</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
