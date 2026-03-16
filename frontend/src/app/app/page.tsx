"use client";

import Sidebar from "@/components/Sidebar";
import PromptInput from "@/components/PromptInput";
import ResearchProgress from "@/components/ResearchProgress";
import ReportView from "@/components/ReportView";
import AuthPage from "@/components/AuthPage";
import MyFilesSection from "@/components/MyFilesSection";
import MyNotesSection from "@/components/MyNotesSection";
import TeamMembersSection from "@/components/TeamMembersSection";
import GuideSection from "@/components/GuideSection";
import { useResearch } from "@/hooks/useResearch";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";
import { MARKETING_COMMANDS, type MarketingCommand } from "@/lib/marketingSkills";

const SUGGESTIONS = [
  "Current trends in e-commerce payment solutions",
  "Key pain points for Shopify users",
  "AI startup landscape in healthcare",
  "Competitor analysis for project management tools",
];

const MARKETING_SUGGESTIONS = MARKETING_COMMANDS.slice(0, 6);

type DashboardView = "research" | "files" | "notes" | "team" | "guide";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const {
    sessions,
    activeSession,
    activeId,
    startResearch,
    startMarketingCommand,
    newResearch,
    selectSession,
  } = useResearch(user);

  const handleMarketingCommand = (cmd: MarketingCommand, arg: string) => {
    startMarketingCommand(cmd, arg);
  };

  const {
    folders,
    files,
    notes,
    teamMembers,
    loadingFolders,
    loadingFiles,
    loadingNotes,
    loadingTeamMembers,
    createFolder,
    uploadFile,
    deleteFile,
    createNote,
    createTeamMember,
  } = useWorkspaceData(user);

  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>("research");

  const navItems: { id: DashboardView; label: string }[] = [
    { id: "research", label: "Research" },
    { id: "files", label: "My Files" },
    { id: "notes", label: "My Notes" },
    { id: "team", label: "Team Members" },
    { id: "guide", label: "Guide & FAQ" },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }
  const isIdle = !activeSession;
  const isWorking =
    activeSession &&
    activeSession.phase !== "idle" &&
    activeSession.phase !== "finished";
  const isDone = activeSession?.phase === "finished" && activeSession.report;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => {
            setActiveView("research");
            selectSession(id);
          }}
          onNewResearch={() => {
            setActiveView("research");
            newResearch();
          }}
          onSignOut={signOut}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-surface text-muted cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            {activeView === "research" && activeSession && (
              <p className="ml-3 text-sm text-muted truncate">
                {activeSession.query}
              </p>
            )}
            {activeView !== "research" && (
              <p className="ml-3 text-sm text-muted truncate">
                {navItems.find((item) => item.id === activeView)?.label}
              </p>
            )}
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-surface text-muted cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>
        </header>

        <div className="border-b border-border px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  activeView === item.id
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activeView === "files" && (
            <MyFilesSection
              folders={folders}
              files={files}
              loadingFolders={loadingFolders}
              loadingFiles={loadingFiles}
              onCreateFolder={createFolder}
              onUploadFile={uploadFile}
              onDeleteFile={deleteFile}
            />
          )}

          {activeView === "notes" && (
            <MyNotesSection
              notes={notes}
              loadingNotes={loadingNotes}
              onCreateNote={createNote}
            />
          )}

          {activeView === "team" && (
            <TeamMembersSection
              members={teamMembers}
              loadingMembers={loadingTeamMembers}
              onCreateMember={createTeamMember}
            />
          )}

          {activeView === "guide" && <GuideSection />}

          {/* IDLE STATE — centered prompt */}
          {activeView === "research" && isIdle && (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="mb-10 text-center">
                <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
                  What do you want to research?
                </h1>
                <p className="text-muted text-base">
                  Enter a topic and Brief will scan the market for you.
                </p>
              </div>

              <PromptInput onSubmit={startResearch} onMarketingCommand={handleMarketingCommand} />

              {/* Research suggestion chips */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => startResearch(s)}
                    className="px-4 py-2 rounded-full text-sm text-muted border border-border hover:border-accent/40 hover:text-foreground hover:bg-accent-light/30 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Marketing command chips */}
              <div className="mt-4">
                <p className="text-xs text-muted text-center mb-2">or run a marketing command</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {MARKETING_SUGGESTIONS.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleMarketingCommand(cmd, cmd.placeholder)}
                      className="px-3 py-1.5 rounded-full text-xs text-muted border border-border hover:border-accent/40 hover:text-foreground hover:bg-accent-light/30 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{cmd.icon}</span>
                      {cmd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WORKING STATE — research progress */}
          {activeView === "research" && isWorking && activeSession && (
            <div className="max-w-2xl mx-auto px-6 py-10">
              {/* User query bubble */}
              <div className="mb-6">
                {activeSession.marketing ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{activeSession.marketing.icon}</span>
                      <span className="text-xs font-medium text-accent">{activeSession.marketing.commandLabel}</span>
                    </div>
                    <p className="text-base font-medium text-foreground">
                      {activeSession.marketing.arg}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted mb-1">Your research query</p>
                    <p className="text-base font-medium text-foreground">
                      {activeSession.query}
                    </p>
                  </>
                )}
              </div>

              <ResearchProgress
                steps={activeSession.steps}
                sources={activeSession.sources}
                currentPhase={activeSession.phase}
                currentStepIndex={activeSession.currentStepIndex}
                analysisLog={activeSession.analysisLog}
              />
            </div>
          )}

          {/* DONE STATE — report */}
          {activeView === "research" && isDone && activeSession?.report && (
            <div className="max-w-2xl mx-auto px-6 py-10">
              <ReportView report={activeSession.report} marketing={activeSession.marketing} />

              {/* New research prompt at bottom */}
              <div className="mt-12 mb-8">
                <p className="text-sm text-muted mb-3 text-center">
                  Have another question?
                </p>
                <PromptInput onSubmit={startResearch} onMarketingCommand={handleMarketingCommand} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
