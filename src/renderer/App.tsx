import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider, useTheme } from "@/components/providers/ThemeProvider"
import { PageContainer } from "@/components/layout/PageContainer"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { AllTranscriptions } from "@/pages/AllTranscriptions"
import { FileTranscriptions } from "@/pages/FileTranscriptions"
import { LiveTranscriptions } from "@/pages/LiveTranscriptions"
import { FolderView } from "@/pages/FolderView"
import { TranscriptionDetailPage } from "@/pages/TranscriptionDetailPage"
import { SettingsPage } from "@/pages/Settings"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { useDevice } from "@/renderer/hooks/useDevice"
import { useFolders } from "@/renderer/hooks/useFolders"
import { useTags } from "@/renderer/hooks/useTags"
import { useSupabase } from "@/renderer/hooks/useSupabase"
import { useSettings } from "@/renderer/hooks/useSettings"

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
        setDeviceId(electronDeviceId)
      }
    }
    initDevice()
  }, [electronDeviceId, getDevices, createDevice])
  
  const { folders, createFolder, updateFolder, deleteFolder, moveTranscriptionToFolder } = useFolders(deviceId)
  const { tags, createTag, updateTag, deleteTag, mergeTags } = useTags(deviceId)
  
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
    await createFolder({ name, color })
  }

  const handleUpdateFolder = async (id: string, name: string, color: string) => {
    await updateFolder(id, { name, color })
  }

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id)
    if (activeFolderId === id) {
      setActiveFolderId(null)
    }
  }

  const handleMoveTranscription = async (transcriptionId: string, folderId: string | null) => {
    await moveTranscriptionToFolder(transcriptionId, folderId)
  }

  const handleCreateTag = async () => {
    // Tag creation dialog would be implemented here
    // For now, just create a default tag
    await createTag({ name: "New Tag", color: "#6366f1" })
  }

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
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            theme={theme}
            onThemeToggle={handleThemeToggle}
          />
          <PageContainer>
            <Routes>
              <Route path="/" element={<Navigate to="/transcriptions" replace />} />
              <Route path="/transcriptions" element={<AllTranscriptions />} />
              <Route path="/transcriptions/file" element={<FileTranscriptions />} />
              <Route path="/transcriptions/live" element={<LiveTranscriptions />} />
              <Route path="/transcriptions/:id" element={<TranscriptionDetailPage />} />
              <Route path="/folders/:folderId" element={<FolderView />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
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
