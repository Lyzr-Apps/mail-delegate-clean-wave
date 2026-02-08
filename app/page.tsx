'use client'

import { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Mail, Send, CheckCircle2, AlertCircle, Clock, Users,
  Briefcase, Settings, Search, ChevronDown, ChevronUp,
  ChevronRight, RefreshCw, Loader2, X, User, Inbox,
  Bell, ListTodo, Zap, Play, Hash, MessageSquare
} from 'lucide-react'

// --- Types ---

interface TaskItem {
  title?: string
  description?: string
  priority?: string
  assignee?: string
  slack_status?: string
  email_subject?: string
  email_from?: string
  timestamp?: string
}

interface DelegationData {
  tasks_processed?: number
  teammates_notified?: number
}

interface AgentResult {
  summary?: string
  data?: DelegationData
  items?: TaskItem[]
}

interface DelegationRecord {
  id: string
  tasks: TaskItem[]
  summary: string
  tasksProcessed: number
  teammatesNotified: number
  timestamp: string
}

// --- Constants ---

const AGENT_ID = '698901b47b0e3eacc4301937'

const SAMPLE_DATA: AgentResult = {
  summary: 'Processed 2 task emails, notified 3 teammates via Slack',
  data: {
    tasks_processed: 2,
    teammates_notified: 3,
  },
  items: [
    {
      title: 'Prepare Q2 Financial Report',
      description: 'Compile and finalize the Q2 report using the latest numbers from the finance team.',
      priority: 'urgent',
      assignee: 'John Smith',
      slack_status: 'sent',
      email_subject: 'URGENT: Q2 Financial Report for Team',
      email_from: 'cfo@example.com',
      timestamp: '2024-06-09T14:55:17Z',
    },
    {
      title: 'Update Marketing Materials',
      description: 'Revise marketing brochures to include the new product images.',
      priority: 'high',
      assignee: 'Emily Zhang',
      slack_status: 'sent',
      email_subject: 'Team: Marketing Material Update Needed',
      email_from: 'marketinglead@example.com',
      timestamp: '2024-06-09T13:32:11Z',
    },
    {
      title: 'Schedule Sprint Planning',
      description: 'Organize the next sprint planning meeting and invite all stakeholders.',
      priority: 'medium',
      assignee: 'Alex Patel',
      slack_status: 'sent',
      email_subject: 'Action: Sprint Planning Setup',
      email_from: 'pm@example.com',
      timestamp: '2024-06-09T12:10:05Z',
    },
  ],
}

const SAMPLE_HISTORY: DelegationRecord[] = [
  {
    id: 'sample-1',
    tasks: SAMPLE_DATA.items || [],
    summary: SAMPLE_DATA.summary || '',
    tasksProcessed: SAMPLE_DATA.data?.tasks_processed || 0,
    teammatesNotified: SAMPLE_DATA.data?.teammates_notified || 0,
    timestamp: '2024-06-09T15:20:59Z',
  },
  {
    id: 'sample-2',
    tasks: [
      {
        title: 'Review Contract Draft',
        description: 'Review the contract draft from legal team before Friday.',
        priority: 'high',
        assignee: 'Sarah Chen',
        slack_status: 'sent',
        email_subject: 'Contract Review Needed',
        email_from: 'legal@example.com',
        timestamp: '2024-06-08T10:15:30Z',
      },
    ],
    summary: 'Processed 1 task email, notified 1 teammate via Slack',
    tasksProcessed: 1,
    teammatesNotified: 1,
    timestamp: '2024-06-08T10:30:00Z',
  },
]

// --- Helpers ---

function extractAgentData(result: any): AgentResult {
  const response = result?.response?.result || result?.response || {}
  const summary = response?.summary || response?.result?.summary || response?.text || response?.message || ''
  const data = response?.data || response?.result?.data || {}
  const items = Array.isArray(response?.items)
    ? response.items
    : Array.isArray(response?.result?.items)
      ? response.result.items
      : Array.isArray(response?.tasks)
        ? response.tasks
        : []
  return { summary, data, items }
}

function formatTimestamp(ts?: string): string {
  if (!ts) return 'N/A'
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function priorityColor(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function slackStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'sent':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'failed':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// --- Inline Components ---

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-[16px] bg-white/75 border border-white/[0.18] shadow-md rounded-[0.875rem] ${className || ''}`}>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <GlassCard className="p-5 flex items-center gap-4 flex-1 min-w-[180px]">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
      </div>
    </GlassCard>
  )
}

function TaskCard({ task, defaultExpanded }: { task: TaskItem; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false)

  return (
    <GlassCard className="p-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-slate-800 text-sm">{task.title || 'Untitled Task'}</span>
            <Badge variant="outline" className={`text-xs ${priorityColor(task.priority)}`}>
              {task.priority || 'normal'}
            </Badge>
            <Badge variant="outline" className={`text-xs ${slackStatusColor(task.slack_status)}`}>
              <Send className="w-3 h-3 mr-1" />
              {task.slack_status || 'unknown'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.assignee || 'Unassigned'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(task.timestamp)}
            </span>
          </div>
        </div>
        <div className="mt-1 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="mt-3 space-y-2">
            <p className="text-sm text-slate-600">{task.description || 'No description available.'}</p>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-600">Subject:</span>
                <span className="truncate">{task.email_subject || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-600">From:</span>
                <span className="truncate">{task.email_from || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

function HistoryEntry({ record, onClick, isActive }: { record: DelegationRecord; onClick: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-700">{formatTimestamp(record.timestamp)}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{record.summary || 'No summary'}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <ListTodo className="w-3 h-3" />
          {record.tasksProcessed} tasks
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {record.teammatesNotified} notified
        </span>
      </div>
    </button>
  )
}

// --- Main Page ---

export default function Home() {
  // Core state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [currentResult, setCurrentResult] = useState<AgentResult | null>(null)

  // History
  const [history, setHistory] = useState<DelegationRecord[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // Agent status
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Stats computation
  const activeResult = showSample ? SAMPLE_DATA : currentResult
  const activeHistory = showSample ? SAMPLE_HISTORY : history

  const tasksProcessed = activeResult?.data?.tasks_processed ?? 0
  const teammatesNotified = activeResult?.data?.teammates_notified ?? 0
  const activeItems = Array.isArray(activeResult?.items) ? activeResult.items : []
  const pendingItems = activeItems.filter((t) => t?.slack_status?.toLowerCase() !== 'sent').length

  // Filtered history
  const filteredHistory = Array.isArray(activeHistory)
    ? activeHistory.filter((rec) => {
        if (!historySearch.trim()) return true
        const q = historySearch.toLowerCase()
        if (rec.summary?.toLowerCase().includes(q)) return true
        if (Array.isArray(rec.tasks)) {
          return rec.tasks.some(
            (t) =>
              t?.title?.toLowerCase().includes(q) ||
              t?.assignee?.toLowerCase().includes(q)
          )
        }
        return false
      })
    : []

  // Selected history display
  const selectedRecord = selectedHistoryId
    ? (Array.isArray(activeHistory) ? activeHistory : []).find((r) => r.id === selectedHistoryId)
    : null
  const displayItems = selectedRecord
    ? Array.isArray(selectedRecord.tasks) ? selectedRecord.tasks : []
    : activeItems

  const processTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStatusMessage('Processing emails for tasks...')
    setActiveAgentId(AGENT_ID)
    setSelectedHistoryId(null)

    try {
      const result = await callAIAgent(
        'Process my recent emails for task delegation. Look for emails with keywords: urgent, team, delegate. Extract task details including title, description, priority, assignee mentions, and send Slack notifications to the #slack-test channel. Return the results as structured JSON.',
        AGENT_ID
      )

      if (result?.success && result?.response?.status === 'success') {
        const agentData = extractAgentData(result)
        setCurrentResult(agentData)

        const newRecord: DelegationRecord = {
          id: `rec-${Date.now()}`,
          tasks: Array.isArray(agentData.items) ? agentData.items : [],
          summary: agentData.summary || 'Tasks processed',
          tasksProcessed: agentData.data?.tasks_processed ?? 0,
          teammatesNotified: agentData.data?.teammates_notified ?? 0,
          timestamp: new Date().toISOString(),
        }
        setHistory((prev) => [newRecord, ...prev])
        setStatusMessage('Tasks processed successfully!')
      } else {
        const errMsg = result?.response?.message || result?.error || 'Unknown error occurred'
        setError(errMsg)
        setStatusMessage(null)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to process tasks')
      setStatusMessage(null)
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [])

  const handleHistorySelect = (record: DelegationRecord) => {
    setSelectedHistoryId(record.id)
    setCurrentResult({
      summary: record.summary,
      data: {
        tasks_processed: record.tasksProcessed,
        teammates_notified: record.teammatesNotified,
      },
      items: Array.isArray(record.tasks) ? record.tasks : [],
    })
  }

  const clearSelection = () => {
    setSelectedHistoryId(null)
  }

  const keywords = ['urgent', 'team', 'delegate']

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(230,50%,95%)] via-[hsl(260,45%,94%)] to-[hsl(200,45%,94%)]">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-[16px] bg-white/60 border-b border-white/[0.18] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 leading-tight">Task Delegation</h1>
              <p className="text-xs text-slate-500">Automated Email-to-Slack Task Distribution</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-slate-500 cursor-pointer">Sample Data</Label>
              <Switch
                id="sample-toggle"
                checked={showSample}
                onCheckedChange={(checked) => {
                  setShowSample(checked)
                  if (checked) {
                    setSelectedHistoryId(null)
                    setError(null)
                    setStatusMessage(null)
                  }
                }}
              />
            </div>
            {activeResult?.data && (
              <span className="text-xs text-slate-400 hidden sm:block">
                <Clock className="w-3 h-3 inline mr-1" />
                Last sync: {formatTimestamp(new Date().toISOString())}
              </span>
            )}
            <button className="p-2 rounded-lg hover:bg-white/50 text-slate-400 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<ListTodo className="w-5 h-5 text-blue-600" />}
                label="Tasks Processed"
                value={tasksProcessed}
                accent="bg-blue-100"
              />
              <StatCard
                icon={<Users className="w-5 h-5 text-emerald-600" />}
                label="Teammates Notified"
                value={teammatesNotified}
                accent="bg-emerald-100"
              />
              <StatCard
                icon={<Bell className="w-5 h-5 text-amber-600" />}
                label="Pending Items"
                value={pendingItems}
                accent="bg-amber-100"
              />
            </div>

            {/* Process Tasks Card */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    Process Tasks
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Scan your inbox for delegatable tasks and notify teammates on Slack.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-slate-500 mr-1">Filters:</span>
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border border-blue-200">
                    {kw}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-500">Slack Channel:</span>
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Hash className="w-3 h-3 mr-1" />
                  slack-test
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={processTasks}
                  disabled={loading || showSample}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Process Tasks
                    </>
                  )}
                </Button>
                {!loading && !showSample && !currentResult && !error && (
                  <span className="text-xs text-slate-400">Click to scan your inbox and delegate tasks</span>
                )}
              </div>

              {/* Status Messages */}
              {loading && statusMessage && (
                <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMessage}
                </div>
              )}
              {!loading && statusMessage && !error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {statusMessage}
                </div>
              )}
              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="flex-1">{error}</span>
                  <Button variant="ghost" size="sm" onClick={processTasks} className="text-red-600 hover:text-red-700 h-auto py-1 px-2">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
            </GlassCard>

            {/* Summary */}
            {activeResult?.summary && (
              <GlassCard className="p-4">
                <p className="text-sm text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium">{activeResult.summary}</span>
                </p>
              </GlassCard>
            )}

            {/* Selected History Indicator */}
            {selectedRecord && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                <Clock className="w-3 h-3" />
                <span>Viewing history from {formatTimestamp(selectedRecord.timestamp)}</span>
                <button onClick={clearSelection} className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            )}

            {/* Results Panel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Delegated Tasks
                  {displayItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600">{displayItems.length}</Badge>
                  )}
                </h2>
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className="lg:hidden flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Clock className="w-3.5 h-3.5" />
                  History
                </button>
              </div>

              {displayItems.length === 0 ? (
                <GlassCard className="p-10 text-center">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500 mb-1">No tasks delegated yet</p>
                  <p className="text-xs text-slate-400">Click "Process Tasks" to scan your inbox and automatically delegate tasks to teammates.</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {displayItems.map((task, idx) => (
                    <TaskCard key={`${task.title}-${task.assignee}-${idx}`} task={task} defaultExpanded={idx === 0} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar - Desktop always visible, Mobile toggleable */}
          <div className={`w-full lg:w-72 xl:w-80 flex-shrink-0 ${historyOpen ? 'block' : 'hidden lg:block'}`}>
            <GlassCard className="p-0 sticky top-20">
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    History
                  </h3>
                  <button
                    onClick={() => setHistoryOpen(false)}
                    className="lg:hidden text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search tasks or assignees..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white/60 border-slate-200"
                  />
                </div>
              </div>
              <Separator />
              <ScrollArea className="h-[calc(100vh-280px)] max-h-[500px]">
                <div className="p-2 space-y-1">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">
                        {historySearch ? 'No matching records' : 'No delegation history yet'}
                      </p>
                    </div>
                  ) : (
                    filteredHistory.map((rec) => (
                      <HistoryEntry
                        key={rec.id}
                        record={rec}
                        onClick={() => handleHistorySelect(rec)}
                        isActive={selectedHistoryId === rec.id}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>
        </div>

        {/* Agent Info Section */}
        <div className="mt-8 mb-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Task Delegation Agent</p>
                  <p className="text-xs text-slate-400">Scans emails, extracts tasks, and sends Slack notifications to #slack-test</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeAgentId === AGENT_ID ? (
                  <Badge className="text-xs bg-blue-100 text-blue-700 border border-blue-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
                <span className="text-xs text-slate-400 font-mono hidden sm:block">{AGENT_ID.slice(0, 8)}...</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
