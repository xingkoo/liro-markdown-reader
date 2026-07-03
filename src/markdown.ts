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
  return md.render(markdown)
}
