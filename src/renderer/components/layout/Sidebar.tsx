import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  FileText,
  Mic,
  Folder,
  Tag,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FolderList } from "@/renderer/components/folders/FolderList"
import { TagList } from "@/renderer/components/tags/TagList"

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    id: "all-transcriptions",
    label: "All Transcriptions",
    icon: <FileText className="h-5 w-5" />,
    path: "/transcriptions",
  },
  {
    id: "file-transcriptions",
    label: "File Transcriptions",
    icon: <FileText className="h-5 w-5" />,
    path: "/transcriptions/file",
  },
  {
    id: "live-transcriptions",
    label: "Live Transcriptions",
    icon: <Mic className="h-5 w-5" />,
    path: "/transcriptions/live",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
    path: "/settings",
  },
]

interface SidebarProps {
  className?: string
  folders?: Array<{
    id: string
    name: string
    color: string
    transcriptionCount: number
  }>
  unfiledCount?: number
  activeFolderId?: string | null
  onFolderClick?: (folderId: string | null) => void
  onCreateFolder?: (name: string, color: string) => void
  onUpdateFolder?: (id: string, name: string, color: string) => void
  onDeleteFolder?: (id: string) => void
  onMoveTranscription?: (transcriptionId: string, folderId: string | null) => void
  tags?: Array<{
    id: string
    name: string
    color: string
  }>
  activeTagIds?: string[]
  onTagClick?: (tagId: string) => void
  onCreateTag?: () => void
  onRenameTag?: (id: string) => void
  onDeleteTag?: (id: string) => void
  onMergeTags?: (sourceId: string, targetId: string) => void
  foldersError?: string | null
  foldersLoading?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  className,
  folders = [],
  unfiledCount = 0,
  activeFolderId,
  onFolderClick,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveTranscription,
  tags = [],
  activeTagIds = [],
  onTagClick,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onMergeTags,
  foldersError,
  foldersLoading,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["folders", "tags"])
  )

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    // Use exact path matching for navigation items to ensure only one is active at a time
    const isActive = location.pathname === item.path
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedFolders.has(item.id)

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleFolder(item.id)
            } else {
              navigate(item.path)
            }
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            level > 0 && "ml-4"
          )}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          ) : null}
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-card",
        className
      )}
    >
      <div className="p-4">
        <h2 className="text-lg font-semibold">EasyScribe</h2>
      </div>
      <nav className="flex-1 space-y-4 px-2 overflow-y-auto">
        {navItems.map((item) => renderNavItem(item))}

        {/* Folders Section */}
        {onFolderClick && (
          <FolderList
            folders={folders}
            unfiledCount={unfiledCount}
            activeFolderId={activeFolderId}
            onFolderClick={onFolderClick}
            onCreateFolder={onCreateFolder}
            onUpdateFolder={onUpdateFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveTranscription={onMoveTranscription}
            error={foldersError}
            isLoading={foldersLoading}
          />
        )}

        {/* Tags Section */}
        {onTagClick && (
          <TagList
            tags={tags}
            activeTagIds={activeTagIds}
            onTagClick={onTagClick}
            onCreateTag={onCreateTag}
            onRenameTag={onRenameTag}
            onDeleteTag={onDeleteTag}
            onMergeTags={onMergeTags}
          />
        )}
      </nav>
    </aside>
  )
}
