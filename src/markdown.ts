import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: true
})

md.use(anchor, {
  level: [1, 2, 3, 4, 5, 6],
  slugify: (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/['".,!?()[\]{}]/g, '')
      .replace(/\s+/g, '-')
})

export function renderMarkdown(markdown: string): string {
  const html = md.render(markdown)
  if (typeof DOMParser === 'undefined') {
    return html
  }

  const doc = new DOMParser().parseFromString(`<div id="liro-md-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('liro-md-root')
  if (!root) return html

  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href')?.trim() ?? ''
    if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return
    }

    anchor.setAttribute('data-liro-href', href)
    anchor.setAttribute('href', '#')
  })

  return root.innerHTML
}
