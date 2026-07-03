export function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, '/')
}

export function dirname(path: string): string {
  const normalized = normalizeSlashes(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '' : normalized.slice(0, index)
}

export function joinPath(...parts: string[]): string {
  return normalizeSlashes(
    parts
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
  )
}

export function resolveMarkdownLink(currentFilePath: string, href: string): string | null {
  const cleaned = href.trim()
  if (!cleaned || cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('mailto:')) {
    return null
  }

  const [pathPart] = cleaned.split('#')
  if (!pathPart) {
    return null
  }

  if (pathPart.startsWith('/')) {
    return normalizeSlashes(pathPart)
  }

  return joinPath(dirname(currentFilePath), pathPart)
}

export function fileName(path: string): string {
  const normalized = normalizeSlashes(path)
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}

export function titleFromPath(path: string): string {
  return fileName(path).replace(/\.[^.]+$/, '')
}
