export type TreeNode = {
  name: string
  path: string
  relPath: string
  kind: 'file' | 'directory'
  children?: TreeNode[]
}

export type HistoryEntry = {
  kind: 'file' | 'project'
  path: string
  name: string
  lastOpenedAt: string
  lastViewedPath?: string
}

export type AppHistory = {
  recent: HistoryEntry[]
}

