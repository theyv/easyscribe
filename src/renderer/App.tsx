import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { PageContainer } from "@/components/layout/PageContainer"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { AllTranscriptions } from "@/pages/AllTranscriptions"
import { FileTranscriptions } from "@/pages/FileTranscriptions"
import { LiveTranscriptions } from "@/pages/LiveTranscriptions"
import { FolderView } from "@/pages/FolderView"
import { TranscriptionDetailPage } from "@/pages/TranscriptionDetailPage"
import { Settings } from "@/pages/Settings"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="easyscribe-ui-theme">
        <BrowserRouter>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <PageContainer>
                <Routes>
                  <Route path="/" element={<Navigate to="/transcriptions" replace />} />
                  <Route path="/transcriptions" element={<AllTranscriptions />} />
                  <Route path="/transcriptions/file" element={<FileTranscriptions />} />
                  <Route path="/transcriptions/live" element={<LiveTranscriptions />} />
                  <Route path="/transcriptions/:id" element={<TranscriptionDetailPage />} />
                  <Route path="/folders/:folderId" element={<FolderView />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </PageContainer>
            </div>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
