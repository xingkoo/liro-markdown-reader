export function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, '/')
}

export function normalizePath(input: string): string {
  const normalized = normalizeSlashes(input)
  const isAbsolute = normalized.startsWith('/')
  const hasTrailingSlash = normalized.length > 1 && normalized.endsWith('/')
  const segments = normalized.split('/')
  const stack: string[] = []

  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      const last = stack[stack.length - 1]
      if (last && last !== '..') {
        stack.pop()
      } else if (!isAbsolute) {
        stack.push(segment)
      }
      continue
    }
    stack.push(segment)
  }

  const joined = `${isAbsolute ? '/' : ''}${stack.join('/')}`
  if (!joined) return isAbsolute ? '/' : '.'
  if (hasTrailingSlash && joined !== '/') return `${joined}/`
  return joined
}

export function dirname(path: string): string {
  const normalized = normalizeSlashes(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '' : normalized.slice(0, index)
}

export function joinPath(...parts: string[]): string {
  const raw = normalizeSlashes(
    parts
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
  )
  return normalizePath(raw)
}

export function resolveMarkdownLink(currentFilePath: string, href: string, rootPath?: string | null): string | null {
  let cleaned = href.trim()
  if (!cleaned || cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('mailto:')) {
    return null
  }

  if (cleaned.startsWith('tauri://localhost/')) {
    cleaned = cleaned.replace(/^tauri:\/\/localhost/, '')
  } else if (cleaned.startsWith('file://')) {
    try {
      const url = new URL(cleaned)
      cleaned = `${url.pathname}${url.hash}`
    } catch {
      return null
    }
  }

  const [pathPart] = cleaned.split('#')
  if (!pathPart) {
    return null
  }

  let normalizedPart = pathPart
  try {
    normalizedPart = decodeURIComponent(pathPart)
  } catch {
    // Ignore malformed escape sequences and use the raw path.
  }

  if (normalizedPart.startsWith('/')) {
    const baseRoot = rootPath?.trim()
    if (baseRoot) {
      return joinPath(baseRoot, normalizedPart.slice(1))
    }
    return normalizePath(normalizedPart)
  }

  return joinPath(dirname(currentFilePath), normalizedPart)
}

export function fileName(path: string): string {
  const normalized = normalizeSlashes(path)
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

export function relativePath(basePath: string, targetPath: string): string {
  const base = normalizePath(basePath).replace(/\/+$/, '')
  const target = normalizePath(targetPath)
  if (!base) return target
  if (target === base) return fileName(target)
  if (target.startsWith(`${base}/`)) {
    return target.slice(base.length + 1)
  }
  return target
}

export function titleFromPath(path: string): string {
  return fileName(path).replace(/\.[^.]+$/, '')
}
