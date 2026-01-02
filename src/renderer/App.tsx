import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider, useTheme } from "@/components/providers/ThemeProvider"
import { PageContainer } from "@/components/layout/PageContainer"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { AllTranscriptions } from "@/renderer/pages/AllTranscriptions"
import { FileTranscriptions } from "@/renderer/pages/FileTranscriptions"
import { LiveTranscriptions } from "@/renderer/pages/LiveTranscriptions"
import { FolderView } from "@/renderer/pages/FolderView"
import { TranscriptionDetailPage } from "@/renderer/pages/TranscriptionDetailPage"
import { SettingsPage } from "@/renderer/pages/Settings"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { SearchResults } from "@/components/search/SearchResults"
import { useDevice } from "@/renderer/hooks/useDevice"
import { useFolders } from "@/renderer/hooks/useFolders"
import { useTags } from "@/renderer/hooks/useTags"
import { useSupabase } from "@/renderer/hooks/useSupabase"
import { useSettings } from "@/renderer/hooks/useSettings"
import { useSearch } from "@/renderer/hooks/useSearch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

// Inner component that uses theme context
function AppContent() {
  const { theme, setTheme } = useTheme()
  const { deviceId: electronDeviceId } = useDevice()
  const { getDevices, createDevice } = useSupabase()
  const { settings } = useSettings()
  const [deviceId, setDeviceId] = useState<string>("")
  
  // Theme toggle handler
  const handleThemeToggle = () => {
    if (theme === "dark") {
      setTheme("light")
    } else if (theme === "light") {
      setTheme("system")
    } else {
      setTheme("dark")
    }
  }

  // Fallback: Get or create a device for web context
  useEffect(() => {
    const initDevice = async () => {
      if (!electronDeviceId || electronDeviceId === 'Unknown') {
        // Try to get an existing device
        const devices = await getDevices()
        if (devices && devices.length > 0) {
          setDeviceId(devices[0].id)
        } else {
          // Create a default web device
          const newDevice = await createDevice({
            device_identifier: 'web-default-device',
            device_name: 'Web Browser',
            device_type: 'web',
            os_version: 'Unknown',
            app_version: '1.0.0'
          })
          setDeviceId(newDevice.id)
        }
      } else {
        // electronDeviceId is valid, but we need to check if it exists in database
        const devices = await getDevices()
        const existingDevice = devices?.find(d => d.device_identifier === electronDeviceId || d.id === electronDeviceId)
        if (existingDevice) {
          setDeviceId(existingDevice.id)
        } else {
          // Device doesn't exist in database, create it
          console.log('[Device Init] Creating device with ID:', electronDeviceId)
          try {
            const newDevice = await createDevice({
              id: electronDeviceId, // Use the existing device ID
              device_identifier: electronDeviceId,
              device_name: 'Web Device',
              device_type: 'web',
              os_version: 'Unknown',
              app_version: '1.0.0'
            })
            setDeviceId(newDevice.id)
          } catch (error) {
            console.error('[Device Init] Failed to create device:', error)
            // Fallback to first device in database
            if (devices && devices.length > 0) {
              setDeviceId(devices[0].id)
            }
          }
        }
      }
    }
    initDevice()
  }, [electronDeviceId, getDevices, createDevice])

  const { folders, createFolder, updateFolder, deleteFolder, moveTranscriptionToFolder, error: foldersError, isLoading: foldersLoading } = useFolders(deviceId)
  const { tags, createTag, updateTag, deleteTag, mergeTags } = useTags(deviceId || '')
  const { query, setQuery, search, clearResults, results, isLoading: searchLoading } = useSearch(deviceId)
  
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])

  const handleFolderClick = (folderId: string | null) => {
    setActiveFolderId(folderId)
    // Reset tags when clicking a folder
    setActiveTagIds([])
  }

  const handleTagClick = (tagId: string) => {
    setActiveTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId)
      } else {
        return [...prev, tagId]
      }
    })
    // Reset folder when clicking a tag
    setActiveFolderId(null)
  }

  const handleCreateFolder = async (name: string, color: string) => {
    try {
      await createFolder({ name, color })
      toast.success(`Folder "${name}" created successfully`)
    } catch (error) {
      toast.error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUpdateFolder = async (id: string, name: string, color: string) => {
    try {
      await updateFolder(id, { name, color })
      toast.success(`Folder "${name}" updated successfully`)
    } catch (error) {
      toast.error(`Failed to update folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id)
      toast.success("Folder deleted successfully")
      if (activeFolderId === id) {
        setActiveFolderId(null)
      }
    } catch (error) {
      toast.error(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleMoveTranscription = async (transcriptionId: string, folderId: string | null) => {
    await moveTranscriptionToFolder(transcriptionId, folderId)
  }

  const [showTagDialog, setShowTagDialog] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#6366f1")

  const handleCreateTag = async () => {
    setShowTagDialog(true)
  }

  const handleSaveTag = async () => {
    if (!newTagName.trim()) {
      alert("Please enter a tag name")
      return
    }
    // Validate deviceId is a valid UUID before creating tag
    if (!deviceId || deviceId === "" || deviceId === "Unknown") {
      alert("Device not initialized. Please wait a moment and try again.")
      console.error("[Tag Creation] Device ID is invalid:", deviceId)
      return
    }
    try {
      console.log("[Tag Creation] Creating tag with deviceId:", deviceId)
      await createTag({ name: newTagName.trim(), color: newTagColor })
      setShowTagDialog(false)
      setNewTagName("")
      setNewTagColor("#6366f1")
    } catch (error) {
      console.error("[Tag Creation] Error:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Failed to create tag: ${errorMessage}`)
    }
  }

  const handleCancelTag = () => {
    setShowTagDialog(false)
    setNewTagName("")
    setNewTagColor("#6366f1")
  }

  const tagColors = [
    "#6366f1", // violet
    "#3b82f6", // blue
    "#10b981", // green
    "#f97316", // orange
    "#ec4899", // pink
    "#ef4444", // red
  ]

  const handleRenameTag = async (id: string) => {
    // Tag rename dialog would be implemented here
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
    setActiveTagIds(prev => prev.filter(tagId => tagId !== id))
  }

  const handleMergeTags = async (sourceId: string, targetId: string) => {
    await mergeTags(sourceId, targetId)
    setActiveTagIds(prev => prev.filter(tagId => tagId !== sourceId))
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background">
        <Sidebar
          folders={folders.map(f => ({
            id: f.id,
            name: f.name,
            color: f.color,
            transcriptionCount: f.transcriptionCount
          }))}
          tags={tags.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color
          }))}
          activeFolderId={activeFolderId}
          activeTagIds={activeTagIds}
          onFolderClick={handleFolderClick}
          onTagClick={handleTagClick}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveTranscription={handleMoveTranscription}
          onCreateTag={handleCreateTag}
          onRenameTag={handleRenameTag}
          onDeleteTag={handleDeleteTag}
          onMergeTags={handleMergeTags}
          foldersError={foldersError}
          foldersLoading={foldersLoading}
        />

        {/* Tag Creation Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="tagName">Tag Name</Label>
                <Input
                  id="tagName"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {tagColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        newTagColor === color
                          ? "ring-2 ring-offset-2 ring-primary"
                          : "hover:border-primary/50"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelTag}>
                Cancel
              </Button>
              <Button onClick={handleSaveTag}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onSearch={(searchQuery) => {
              setQuery(searchQuery)
              if (searchQuery.trim().length >= 2) {
                search({ query: searchQuery })
              } else {
                clearResults()
              }
            }}
          />
          <PageContainer>
            {/* Show search results when there's an active search query */}
            {query.trim().length >= 2 ? (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
                  <p className="text-muted-foreground">
                    Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                  </p>
                </div>
                <SearchResults
                  results={results}
                  query={query}
                  filters={{}}
                  onFilterChange={() => {}}
                  onResultClick={(id) => {
                    window.location.href = `/transcriptions/${id}`
                  }}
                  highlightTerms={(text, query) => {
                    if (!query || !text) return text
                    const terms = query.split(' ').filter(t => t.length > 2)
                    if (terms.length === 0) return text
                    const regex = new RegExp('(' + terms.join('|') + ')', 'gi')
                    return text.replace(regex, '<mark>$1</mark>')
                  }}
                  availableFolders={folders.map(f => ({ id: f.id, name: f.name }))}
                  availableTags={tags.map(t => ({ id: t.id, name: t.name, color: t.color }))}
                />
                {results.length === 0 && !searchLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    No results found. Try a different search term.
                  </div>
                )}
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Navigate to="/transcriptions" replace />} />
                <Route path="/transcriptions" element={<AllTranscriptions />} />
                <Route path="/transcriptions/file" element={<FileTranscriptions />} />
                <Route path="/transcriptions/live" element={<LiveTranscriptions />} />
                <Route path="/transcriptions/:id" element={<TranscriptionDetailPage />} />
                <Route path="/folders/:folderId" element={<FolderView />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            )}
          </PageContainer>
        </div>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" defaultAccentColor="violet" storageKey="easyscribe-ui-theme" initialAccentColor={undefined}>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
