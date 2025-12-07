'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  BackgroundVariant,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Send, X, Code as CodeIcon, ChevronLeft, ChevronRight, Monitor, Smartphone, Download, RotateCcw, Palette } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import AiPaintbrush from '@/components/ui/AiPaintbrush';
import Link from 'next/link';
import PreviewNode, { StreamingIframe } from '@/components/PreviewNode';
import ProcessSteps, { Step } from '@/components/ProcessSteps';
import ThinkingBlock from '@/components/ThinkingBlock';
import ClarificationQuestions, { ClarificationQuestion, ClarificationAnswer } from '@/components/ClarificationQuestions';
import PlanReview from '@/components/PlanReview';
import DesignSystemSelector, { DesignSystemOptions, DesignSystemSelection } from '@/components/DesignSystemSelector';
import ReactMarkdown from 'react-markdown';
import HelpBubble from '@/components/HelpBubble';
import OverloadModal from '@/components/OverloadModal';
import SubscriptionModal from '@/components/SubscriptionModal';
import LoginModal from '@/components/LoginModal';
import StallWarningModal from '@/components/StallWarningModal';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProjectShowcase from '@/components/ProjectShowcase'; // Import ProjectShowcase
import ShowcaseToggleBlock from '@/components/ShowcaseToggleBlock';
import { ConversationTurn, ScreenFlow } from '@/ai/graph';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedEdge from '@/components/AnimatedEdge';
import { computeFlowLayout, getLayoutConfig } from '@/lib/layoutUtils';

interface PlannedScreen {
  id: string;
  name: string;
  description: string;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  // Thinking state
  thinkingContent?: string;
  thinkingStartTime?: number;
  thinkingDuration?: number;
  isThinkingComplete?: boolean;
  isThinkingPaused?: boolean;
  // Question state
  question?: ClarificationQuestion | null;
  questionIndex?: number;
  submittedAnswer?: ClarificationAnswer | null;
  // Design System state
  designSystemOptions?: DesignSystemOptions | null;
  isDesignSystemReady?: boolean;
  submittedDesignSystem?: DesignSystemSelection | null;
  // Plan state
  plannedScreens?: PlannedScreen[] | null;
  isPlanReady?: boolean;
  isArchitectureApproved?: boolean;
  // Design steps
  designSteps?: Step[];
  // Completion message
  completionMessage?: string;
};

export default function Home() {
  const nodeTypes = useMemo(() => ({
    previewNode: PreviewNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    animatedEdge: AnimatedEdge,
  }), []);

  const [expandedScreenId, setExpandedScreenId] = useState<string | null>(null);
  const [codeModalContent, setCodeModalContent] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [, setIsExportOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isOverloadModalOpen, setIsOverloadModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<Id<"projects"> | null>(null);
  const completedScreensCountRef = useRef<number>(0);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  // Check if user has an active subscription
  const hasActiveSubscription = useQuery(api.stripe.hasActiveSubscription) ?? false;

  // Check if user has already used their free trial (stored in Convex)
  const currentUser = useQuery(api.users.getCurrentUser);
  const incrementGenerationsUsed = useMutation(api.users.incrementGenerationsUsed);
  const createProject = useMutation(api.projects.createProject);
  const updateProjectTitle = useMutation(api.projects.updateProjectTitle);

  // Get first name from user
  const firstName = currentUser?.name?.split(' ')[0] || '';

  // Get remaining generations for the user
  const generationsData = useQuery(api.users.getGenerationsRemaining);

  // Load project from URL if present
  const loadedProject = useQuery(
    api.projects.getProject,
    loadedProjectId ? { projectId: loadedProjectId as Id<"projects"> } : "skip"
  );

  // Persistence states for the flow
  const currentPromptRef = useRef<string>('');
  const conversationHistoryRef = useRef<ConversationTurn[]>([]);
  const plannedScreensRef = useRef<PlannedScreen[]>([]);
  const plannedFlowsRef = useRef<ScreenFlow[]>([]);
  const generatedScreensRef = useRef<Array<{ id: string; name: string; html: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewModeRef = useRef<'desktop' | 'mobile'>('desktop');
  const thinkingStartTimeRef = useRef<number>(0);
  const designSystemMarkdownRef = useRef<string | null>(null);
  const designSystemGenerationStartedRef = useRef<boolean>(false);
  // Design System refs
  const designSystemOptionsRef = useRef<DesignSystemOptions | null>(null);
  const selectedDesignSystemRef = useRef<DesignSystemSelection | null>(null);
  // Messages ref for access in SSE callbacks (avoids stale closure)
  const messagesRef = useRef<Message[]>([]);

  // Stall detection: track last chunk timestamp per screen
  const lastChunkTimestampRef = useRef<Map<string, number>>(new Map());
  const stallCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stallWarning, setStallWarning] = useState<{ screenId: string; screenName: string; duration: number } | null>(null);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Stall detection effect - checks every 10s if any generating screen hasn't received chunks
  useEffect(() => {
    if (isLoading) {
      stallCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const STALL_THRESHOLD_MS = 45000; // 45 seconds without chunks = stall warning

        // Find screens that are currently generating
        const generatingScreenIds = nodes
          .filter(n => n.data?.isGenerating === true)
          .map(n => n.id);

        for (const screenId of generatingScreenIds) {
          const lastChunk = lastChunkTimestampRef.current.get(screenId);
          if (lastChunk && (now - lastChunk) > STALL_THRESHOLD_MS) {
            const screen = plannedScreensRef.current.find(s => s.id === screenId);
            const duration = Math.round((now - lastChunk) / 1000);
            console.warn(`[Stall Detection] Screen ${screenId} (${screen?.name}) has been stalled for ${duration}s`);
            setStallWarning({
              screenId,
              screenName: screen?.name || 'Unknown',
              duration
            });
            break; // Only show one warning at a time
          }
        }
      }, 10000); // Check every 10 seconds

      return () => {
        if (stallCheckIntervalRef.current) {
          clearInterval(stallCheckIntervalRef.current);
          stallCheckIntervalRef.current = null;
        }
      };
    } else {
      // Clear stall warning and interval when not loading
      setStallWarning(null);
      if (stallCheckIntervalRef.current) {
        clearInterval(stallCheckIntervalRef.current);
        stallCheckIntervalRef.current = null;
      }
      // Clear all timestamps
      lastChunkTimestampRef.current.clear();
    }
  }, [isLoading, nodes]);

  // Persist pending prompt to localStorage before OAuth redirect
  useEffect(() => {
    if (pendingPrompt) {
      localStorage.setItem('pendingPrompt', pendingPrompt);
    }
  }, [pendingPrompt]);

  // State to trigger generation after Stripe subscription success
  const [resumeAfterSubscription, setResumeAfterSubscription] = useState<string | null>(null);
  // State for complete resume state (includes screens already generated)
  const [resumeState, setResumeState] = useState<{
    prompt: string;
    plannedScreens: PlannedScreen[];
    plannedFlows: ScreenFlow[];
    generatedScreens: Array<{ id: string; name: string; html: string }>;
    selectedDesignSystem: DesignSystemSelection | null;
    conversationHistory: ConversationTurn[];
    currentScreenIndex: number;
  } | null>(null);
  // Ref to track if we already processed Stripe return (prevents double trigger from OAuth effect)
  const stripeReturnProcessedRef = useRef(false);

  // Handle Stripe checkout success/cancel URL params AND project loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const subscriptionStatus = urlParams.get('subscription');
      const projectId = urlParams.get('project');

      // Handle project loading from URL
      if (projectId) {
        console.log('[Project] Loading project from URL:', projectId);
        setLoadedProjectId(projectId);
        // Clean up URL to remove project param
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (subscriptionStatus === 'success') {
        // Remove the URL param without refreshing
        window.history.replaceState({}, '', window.location.pathname);
        console.log('[Stripe] Subscription successful!');

        // Load complete generation state from localStorage
        const savedStateJson = localStorage.getItem('pendingGenerationState');
        const savedPrompt = localStorage.getItem('pendingPrompt');

        // Clear localStorage immediately to prevent OAuth effect from also triggering
        localStorage.removeItem('pendingGenerationState');
        localStorage.removeItem('pendingPrompt');
        localStorage.removeItem('pendingPromptSource');

        if (savedStateJson) {
          try {
            const savedState = JSON.parse(savedStateJson);
            console.log('[Stripe] Loaded complete generation state:', {
              prompt: savedState.prompt?.substring(0, 50) + '...',
              plannedScreensCount: savedState.plannedScreens?.length,
              generatedScreensCount: savedState.generatedScreens?.length,
              currentScreenIndex: savedState.currentScreenIndex,
            });
            // Mark that we processed the Stripe return
            stripeReturnProcessedRef.current = true;
            // Set complete resume state
            setResumeState(savedState);
            setResumeAfterSubscription(savedState.prompt);
          } catch (e) {
            console.error('[Stripe] Failed to parse saved generation state:', e);
            // Fallback to just the prompt
            if (savedPrompt) {
              stripeReturnProcessedRef.current = true;
              setResumeAfterSubscription(savedPrompt);
            }
          }
        } else if (savedPrompt) {
          console.log('[Stripe] No saved state found, falling back to prompt:', savedPrompt);
          stripeReturnProcessedRef.current = true;
          setResumeAfterSubscription(savedPrompt);
        }
      } else if (subscriptionStatus === 'canceled') {
        // User canceled checkout - remove the param AND clear pending prompt
        // This prevents the OAuth effect from restarting generation
        window.history.replaceState({}, '', window.location.pathname);
        localStorage.removeItem('pendingGenerationState');
        localStorage.removeItem('pendingPrompt');
        localStorage.removeItem('pendingPromptSource');
        console.log('[Stripe] Checkout canceled, cleared all pending state');
      }
    }
  }, []);

  // State to trigger generation after OAuth redirect
  const [resumePrompt, setResumePrompt] = useState<string | null>(null);

  // Debug: Log localStorage state on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('pendingPrompt');
    console.log('[OAuth Mount] Page loaded. pendingPrompt in localStorage:', savedPrompt);
  }, []);

  // Resume generation after OAuth login redirect
  useEffect(() => {
    console.log('[OAuth Debug] Auth state changed - isAuthenticated:', isAuthenticated, 'isAuthLoading:', isAuthLoading);

    // Don't do anything while auth is loading
    if (isAuthLoading) {
      console.log('[OAuth Debug] Auth is still loading, waiting...');
      return;
    }

    // Skip if we already processed a Stripe return (prevents double trigger)
    if (stripeReturnProcessedRef.current) {
      console.log('[OAuth Debug] Stripe return already processed, skipping OAuth handler');
      return;
    }

    // Skip if resumeAfterSubscription is already set (another effect already triggered)
    if (resumeAfterSubscription) {
      console.log('[OAuth Debug] resumeAfterSubscription already set, skipping');
      return;
    }

    // Check if user just logged in and has a pending prompt
    if (isAuthenticated) {
      const savedPrompt = localStorage.getItem('pendingPrompt');
      console.log('[OAuth Debug] User is authenticated. savedPrompt:', savedPrompt, 'hasActiveSubscription:', hasActiveSubscription);

      if (savedPrompt) {
        // If user has active subscription, they might be returning after Stripe checkout
        // In this case, set resumeAfterSubscription instead of resumePrompt
        // to trigger the subscription resume flow
        if (hasActiveSubscription) {
          console.log('[OAuth Debug] User has active subscription, triggering subscription resume flow');
          localStorage.removeItem('pendingPrompt');
          localStorage.removeItem('pendingPromptSource');
          setResumeAfterSubscription(savedPrompt);
        } else {
          // Check if this prompt was saved by the paywall (Stripe flow)
          // If so, DON'T auto-resume - user needs to complete subscription first
          const promptSource = localStorage.getItem('pendingPromptSource');
          if (promptSource === 'stripe') {
            console.log('[OAuth Debug] Prompt was saved by paywall, not resuming (user needs subscription)');
            // Don't resume - user came back without completing Stripe checkout
            // They may have closed the tab or the browser
          } else {
            // Normal OAuth flow - user just logged in for the first time
            localStorage.removeItem('pendingPrompt');
            console.log('[OAuth Debug] Setting resumePrompt:', savedPrompt);
            setResumePrompt(savedPrompt);
          }
        }
      }
    }
  }, [isAuthenticated, isAuthLoading, hasActiveSubscription, resumeAfterSubscription]);

  const generateDesignSystemInBackground = async (html: string) => {
    try {
      const res = await fetch('/api/design-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html })
      });
      if (res.ok) {
        const data = await res.json();
        designSystemMarkdownRef.current = data.markdown;
      }
    } catch (e) {
      console.error('Background design system generation failed:', e);
    }
  };

  // Ensure we have a design system markdown available; generate on-demand if missing
  const ensureDesignSystemMarkdown = useCallback(async (): Promise<string | null> => {
    if (designSystemMarkdownRef.current) {
      return designSystemMarkdownRef.current;
    }

    const firstScreenHtml = generatedScreensRef.current[0]?.html;
    if (!firstScreenHtml) return null;

    try {
      const res = await fetch('/api/design-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: firstScreenHtml })
      });

      if (!res.ok) return null;

      const data = await res.json();
      designSystemMarkdownRef.current = data.markdown;
      return data.markdown;
    } catch (e) {
      console.error('ensureDesignSystemMarkdown failed:', e);
      return null;
    }
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  const recalculateLayout = useCallback((mode: 'desktop' | 'mobile', currentNodes: Node[], flows?: ScreenFlow[]) => {
    const config = getLayoutConfig(mode);
    const screens = plannedScreensRef.current;
    const flowsToUse = flows || plannedFlowsRef.current;

    if (flowsToUse.length > 0 && screens.length > 0) {
      const positions = computeFlowLayout(screens, flowsToUse, config);
      const positionMap = new Map(positions.map(p => [p.id, p]));

      return currentNodes.map(node => {
        const pos = positionMap.get(node.id);
        return {
          ...node,
          position: pos ? { x: pos.x, y: pos.y } : node.position,
          data: { ...node.data, viewMode: mode }
        };
      });
    }

    const cols = mode === 'mobile' ? 4 : 2;
    const w = config.nodeWidth;
    const h = config.nodeHeight;
    const gap = config.horizontalGap;

    return currentNodes.map((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      return {
        ...node,
        position: { x: col * (w + gap), y: row * (h + gap) },
        data: { ...node.data, viewMode: mode }
      };
    });
  }, []);

  const handleViewModeChange = (mode: 'desktop' | 'mobile') => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setNodes(prev => recalculateLayout(mode, prev));

    setTimeout(() => {
      reactFlowInstance.current?.fitView({ duration: 800, padding: 0.2 });
    }, 600);
  };

  const handleExpand = useCallback((screenId: string) => {
    setExpandedScreenId(screenId);
  }, []);

  const handleShowCode = useCallback((html: string) => {
    setCodeModalContent(html);
  }, []);

  const handleFocus = useCallback((id: string) => {
    const node = reactFlowInstance.current?.getNode(id);
    if (node && reactFlowInstance.current) {
      const currentMode = viewModeRef.current;
      const w = currentMode === 'mobile' ? 430 : 1920;
      const h = currentMode === 'mobile' ? 932 : 1080;
      const x = node.position.x + w / 2;
      const y = node.position.y + h / 2;
      reactFlowInstance.current.setCenter(x, y, { zoom: 0.6, duration: 1200 });
    }
  }, []);

  // Restore workspace state when a project is loaded from URL
  useEffect(() => {
    if (loadedProject && loadedProjectId) {
      console.log('[Project] Restoring workspace from project:', loadedProject._id);

      // Populate refs from loaded project
      currentPromptRef.current = loadedProject.prompt;
      generatedScreensRef.current = loadedProject.screens.map(s => ({
        id: s.id,
        name: s.name,
        html: s.html,
      }));
      // Restore persisted design system so export is instant
      // (schema stores markdown directly on the project)
      designSystemMarkdownRef.current = loadedProject.designSystemMarkdown || null;
      plannedScreensRef.current = loadedProject.screens.map(s => ({
        id: s.id,
        name: s.name,
        description: '',
      }));

      // Restore flows if available
      const restoredFlows: ScreenFlow[] = (loadedProject.flows || []).map((f, index) => ({
        id: `flow_${index}`,
        from: f.from,
        to: f.to,
        label: f.label || '',
      }));
      plannedFlowsRef.current = restoredFlows;

      // Create ReactFlow nodes using proper layout computation
      const config = getLayoutConfig(viewMode);

      let newNodes: Node[];
      if (restoredFlows.length > 0 && plannedScreensRef.current.length > 0) {
        // Use flow-based layout if flows are available
        const positions = computeFlowLayout(plannedScreensRef.current, restoredFlows, config);
        const positionMap = new Map(positions.map(p => [p.id, p]));

        newNodes = loadedProject.screens.map((screen) => {
          const pos = positionMap.get(screen.id);
          return {
            id: screen.id,
            type: 'previewNode',
            position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
            data: {
              label: screen.name,
              html: screen.html,
              viewMode,
              isGenerating: false,
              onExpand: handleExpand,
              onShowCode: handleShowCode,
              onFocus: handleFocus,
            },
          };
        });
      } else {
        // Fallback to grid layout
        const cols = viewMode === 'mobile' ? 4 : 2;
        const w = config.nodeWidth;
        const h = config.nodeHeight;
        const gap = config.horizontalGap;

        newNodes = loadedProject.screens.map((screen, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);

          return {
            id: screen.id,
            type: 'previewNode',
            position: { x: col * (w + gap), y: row * (h + gap) },
            data: {
              label: screen.name,
              html: screen.html,
              viewMode,
              isGenerating: false,
              onExpand: handleExpand,
              onShowCode: handleShowCode,
              onFocus: handleFocus,
            },
          };
        });
      }

      // Create edges from flows - label must be in data property for AnimatedEdge
      const newEdges: Edge[] = restoredFlows.map((flow, index) => ({
        id: `edge-${flow.from}-${flow.to}-${index}`,
        source: flow.from,
        target: flow.to,
        type: 'animatedEdge',
        data: { label: flow.label || undefined },
        animated: false,
      }));

      // Set nodes, edges and show workspace
      setNodes(newNodes);
      setEdges(newEdges);
      setHasStarted(true);
      setIsSidebarOpen(true);

      // Restore messages from project if available, otherwise create minimal state
      if (loadedProject.messages && loadedProject.messages.length > 0) {
        const normalizedMessages = (loadedProject.messages as Message[]).map((msg) => {
          if (msg.role !== 'assistant') return msg;

          // Default to complete (prevents empty spinning blocks), unless explicitly false
          const isThinkingComplete = typeof msg.isThinkingComplete === 'boolean'
            ? msg.isThinkingComplete
            : true;

          return {
            ...msg,
            isThinkingComplete,
            isThinkingPaused: msg.isThinkingPaused ?? false,
            // Keep any existing duration; default to 0 only when completed
            thinkingDuration: msg.thinkingDuration ?? (isThinkingComplete ? 0 : undefined),
          };
        });

        setMessages(normalizedMessages);
      } else {
        // Fallback for old projects without stored messages
        setMessages([
          { role: 'assistant', content: 'Hey ! How can i help you design your app today ?' },
          { role: 'user', content: loadedProject.prompt },
          {
            role: 'assistant',
            content: '',
            designSteps: loadedProject.screens.map((s) => ({
              id: `page-${s.id}`,
              label: `Page ${s.name} generated`,
              status: 'completed' as const,
            })),
          },
        ]);
      }

      // Fit view after nodes are set (retry until instance is ready)
      const fitViewWithRetry = (attempt = 0) => {
        const instance = reactFlowInstance.current as ReactFlowInstance & {
          updateNodeInternals?: (ids: string[]) => void;
        };

        if (instance) {
          instance.updateNodeInternals?.(newNodes.map(n => n.id));
          instance.fitView({ duration: 800, padding: 0.15 });
        } else if (attempt < 5) {
          setTimeout(() => fitViewWithRetry(attempt + 1), 120);
        }
      };

      fitViewWithRetry();

      // Clear the loaded project ID to prevent re-triggering
      setLoadedProjectId(null);

      console.log('[Project] Workspace restored with', loadedProject.screens.length, 'screens and', restoredFlows.length, 'flows');
    }
  }, [loadedProject, loadedProjectId, viewMode, handleExpand, handleShowCode, handleFocus, setNodes, setEdges]);

  const updateLastMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      const lastIndex = newMsgs.length - 1;
      if (lastIndex >= 0 && newMsgs[lastIndex].role === 'assistant') {
        newMsgs[lastIndex] = updater(newMsgs[lastIndex]);
      }
      return newMsgs;
    });
  }, []);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey ! How can i help you design your app today ?' }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync messagesRef with messages state for SSE callback access
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const runGeneration = useCallback(async (payload: Record<string, unknown>, isDesignPhase = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setHasStarted(true);
    abortControllerRef.current = new AbortController();
    thinkingStartTimeRef.current = Date.now();

    // For design phase, don't create new message - update existing one
    if (!isDesignPhase) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        thinkingContent: '',
        thinkingStartTime: Date.now(),
        isThinkingComplete: false,
        designSteps: []
      }]);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const shouldStopGeneration = false; // Flag to break out of SSE loop when paywall triggers

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              // Thinking content stream
              if (event.type === 'thought') {
                updateLastMessage(msg => ({
                  ...msg,
                  thinkingContent: (msg.thinkingContent || '') + event.data
                }));
              }

              // Chat response
              if (event.type === 'chat_response') {
                updateLastMessage(msg => ({
                  ...msg,
                  content: (msg.content || '') + event.data,
                  isThinkingComplete: true
                }));
              }

              // Clarification question arrived - complete thinking
              if (event.type === 'clarification_question') {
                const question = event.data;
                const qIndex = conversationHistoryRef.current.filter(t => t.type === 'qa').length + 1;
                const duration = Math.round((Date.now() - thinkingStartTimeRef.current) / 1000);
                updateLastMessage(msg => ({
                  ...msg,
                  question,
                  questionIndex: qIndex,
                  isThinkingComplete: true,
                  thinkingDuration: duration
                }));
              }

              // Design system options arrived - complete thinking and show selector
              if (event.type === 'design_system_options') {
                const options = event.data as DesignSystemOptions;
                designSystemOptionsRef.current = options;
                const duration = Math.round((Date.now() - thinkingStartTimeRef.current) / 1000);
                updateLastMessage(msg => ({
                  ...msg,
                  designSystemOptions: options,
                  isDesignSystemReady: true,
                  isThinkingComplete: true,
                  thinkingDuration: duration
                }));
              }

              // Plan data
              if (event.type === 'plan') {
                plannedScreensRef.current = event.data;
              }

              if (event.type === 'flows') {
                plannedFlowsRef.current = event.data;
              }

              // Plan ready - complete thinking and show plan
              if (event.type === 'plan_ready') {
                const { plannedScreens, plannedFlows } = event.data;
                plannedScreensRef.current = plannedScreens;
                plannedFlowsRef.current = plannedFlows || [];
                const duration = Math.round((Date.now() - thinkingStartTimeRef.current) / 1000);
                updateLastMessage(msg => ({
                  ...msg,
                  plannedScreens,
                  isPlanReady: true,
                  isThinkingComplete: true,
                  thinkingDuration: duration
                }));
              }

              // Design phase started
              if (event.type === 'step') {
                const { name, status, screenName, screenIndex } = event.data;

                // designing.started is now handled in handlePlanApprove
                // Only handle designing_screen for subsequent screens
                if (name === 'designing_screen' && status === 'started' && screenIndex > 0) {
                  updateLastMessage(msg => {
                    const steps = [...(msg.designSteps || [])];
                    // Check if this screen step already exists
                    if (!steps.find(s => s.label.includes(screenName))) {
                      steps.push({
                        id: `page-${screenName}-${screenIndex}`,
                        label: `Generating ${screenName}`,
                        status: 'running'
                      });
                    }
                    return { ...msg, designSteps: steps };
                  });
                }
              }

              // Screen start - focus camera and set generating state
              if (event.type === 'screen_start') {
                const { screenId } = event.data;

                // Update step status to running if it exists (for resume case)
                updateLastMessage(msg => {
                  const steps = [...(msg.designSteps || [])];
                  const stepIndex = steps.findIndex(s => s.id === `page-${screenId}`); // Try exact ID match first

                  if (stepIndex >= 0) {
                    steps[stepIndex] = {
                      ...steps[stepIndex],
                      status: 'running',
                      label: steps[stepIndex].label.replace(' (paused)', '')
                    };
                    return { ...msg, designSteps: steps };
                  }

                  // Fallback: find by checking if ID contains screenId (less reliable but useful)
                  const partialIndex = steps.findIndex(s => s.id.includes(screenId));
                  if (partialIndex >= 0) {
                    steps[partialIndex] = {
                      ...steps[partialIndex],
                      status: 'running',
                      label: steps[partialIndex].label.replace(' (paused)', '')
                    };
                    return { ...msg, designSteps: steps };
                  }

                  return msg;
                });

                // Initialize stall detection timestamp
                lastChunkTimestampRef.current.set(screenId, Date.now());

                // Set isGenerating on the current node
                setNodes(prev => prev.map(node => ({
                  ...node,
                  data: {
                    ...node.data,
                    isGenerating: node.id === screenId
                  }
                })));

                // Get fresh node data from instance directly to ensure we have latest position
                const targetNode = reactFlowInstance.current?.getNode(screenId);
                if (targetNode && reactFlowInstance.current) {
                  const currentMode = viewModeRef.current;
                  const w = currentMode === 'mobile' ? 375 : 1920;
                  const h = currentMode === 'mobile' ? 812 : 1080;
                  const x = targetNode.position.x + (w / 2);
                  const y = targetNode.position.y + (h / 2);
                  reactFlowInstance.current.setCenter(x, y, { zoom: 0.6, duration: 1200 });
                }
              }

              // Code chunk - stream HTML
              if (event.type === 'code_chunk') {
                const { screenId, content } = event.data;
                console.log('[Client] code_chunk received:', screenId, content?.length || 0, 'chars');

                // Update stall detection timestamp
                lastChunkTimestampRef.current.set(screenId, Date.now());
                // Clear stall warning if we received a chunk for the stalled screen
                setStallWarning(prev => prev?.screenId === screenId ? null : prev);

                // Update generatedScreensRef
                const existing = generatedScreensRef.current.find(s => s.id === screenId);
                if (existing) {
                  existing.html += content;
                } else {
                  const screen = plannedScreensRef.current.find(s => s.id === screenId);
                  generatedScreensRef.current.push({
                    id: screenId,
                    name: screen?.name || 'Unknown',
                    html: content
                  });
                }

                // Start design system generation early when first screen has enough HTML
                const firstScreenId = plannedScreensRef.current[0]?.id;
                if (
                  screenId === firstScreenId &&
                  !designSystemGenerationStartedRef.current &&
                  !designSystemMarkdownRef.current
                ) {
                  const firstScreenHtml = generatedScreensRef.current.find(s => s.id === firstScreenId)?.html || '';
                  // Start generating once we have at least 2000 characters (enough for meaningful design extraction)
                  if (firstScreenHtml.length >= 2000) {
                    console.log('[Design System] Starting background generation early, HTML length:', firstScreenHtml.length);
                    designSystemGenerationStartedRef.current = true;
                    generateDesignSystemInBackground(firstScreenHtml);
                  }
                }

                setNodes(prev => {
                  const updated = prev.map(node => {
                    if (node.id === screenId) {
                      const newHtml = (node.data.html || '') + content;
                      console.log('[Client] Updating node', screenId, 'html length:', newHtml.length);
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          html: newHtml
                        }
                      };
                    }
                    return node;
                  });
                  return updated;
                });
              }

              // Screen complete (first screen only now - design system)
              if (event.type === 'screen_complete') {
                const { screenId, screenIndex } = event.data;
                const screens = plannedScreensRef.current;
                const completedScreen = screens[screenIndex];

                // Increment completed screens counter
                completedScreensCountRef.current += 1;

                // Clear isGenerating on completed node
                setNodes(prev => prev.map(node => ({
                  ...node,
                  data: {
                    ...node.data,
                    isGenerating: node.id === screenId ? false : node.data.isGenerating
                  }
                })));

                // Zoom out after first screen is done to show overview
                if (screenIndex === 0 && reactFlowInstance.current) {
                  setTimeout(() => {
                    reactFlowInstance.current?.fitView({ duration: 1200, padding: 0.15 });
                  }, 500);

                  // Capture screenshot for project preview card (design system is already generating from code_chunk handler)
                  const completedNode = generatedScreensRef.current.find(s => s.id === screenId);
                  if (completedNode?.html) {
                    // If design system wasn't triggered during streaming, do it now as fallback
                    if (!designSystemGenerationStartedRef.current && !designSystemMarkdownRef.current) {
                      console.log('[Design System] Fallback generation on screen complete');
                      designSystemGenerationStartedRef.current = true;
                      generateDesignSystemInBackground(completedNode.html);
                    }
                  }
                }

                updateLastMessage(msg => {
                  const steps = [...(msg.designSteps || [])];

                  // Mark Design System as complete after first screen
                  if (screenIndex === 0) {
                    const dsIndex = steps.findIndex(s => s.id === 'design-system');
                    if (dsIndex >= 0) {
                      steps[dsIndex] = { ...steps[dsIndex], status: 'completed', label: 'Design System Generated' };
                    }
                  }

                  // Mark current page as complete
                  // Use ID if possible for precision, fallback to name logic
                  const pageId = `page-${screenId}`;
                  const pageIndexById = steps.findIndex(s => s.id === pageId);

                  if (pageIndexById >= 0) {
                    steps[pageIndexById] = { ...steps[pageIndexById], status: 'completed', label: `Page ${completedScreen?.name || 'Screen'} generated` };
                  } else {
                    // Fallback
                    const pageIndex = steps.findIndex(s => s.label.includes(completedScreen?.name || ''));
                    if (pageIndex >= 0) {
                      steps[pageIndex] = { ...steps[pageIndex], status: 'completed', label: `Page ${completedScreen?.name} generated` };
                    }
                  }

                  return { ...msg, designSteps: steps };
                });

              }

              // Parallel screens start - show all remaining screen loaders at once
              if (event.type === 'parallel_screens_start') {
                const { screens } = event.data;
                console.log('[Client] parallel_screens_start:', screens.length, 'screens');

                // Initialize stall detection timestamps for all parallel screens
                const now = Date.now();
                screens.forEach((screen: { id: string }) => {
                  lastChunkTimestampRef.current.set(screen.id, now);
                });

                // Set isGenerating on ALL remaining nodes
                setNodes(prev => prev.map(node => {
                  const isRemaining = screens.some((s: { id: string }) => s.id === node.id);
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isGenerating: isRemaining ? true : node.data.isGenerating
                    }
                  };
                }));

                // Zoom out to show all screens (global view)
                if (reactFlowInstance.current) {
                  setTimeout(() => {
                    reactFlowInstance.current?.fitView({ duration: 800, padding: 0.15 });
                  }, 100);
                }

                // Add all remaining screen steps at once with running status
                updateLastMessage(msg => {
                  const steps = [...(msg.designSteps || [])];
                  screens.forEach((screen: { id: string; name: string; index: number }) => {
                    const existingStepIndex = steps.findIndex(s => s.id === `page-${screen.id}`);
                    if (existingStepIndex >= 0) {
                      // Reset existing step to running
                      steps[existingStepIndex] = {
                        ...steps[existingStepIndex],
                        status: 'running',
                        label: `Generating ${screen.name}` // Remove (paused) if present
                      };
                    } else {
                      // Add new step
                      steps.push({
                        id: `page-${screen.id}`,
                        label: `Generating ${screen.name}`,
                        status: 'running'
                      });
                    }
                  });
                  return { ...msg, designSteps: steps };
                });
              }

              // Parallel screens complete - all remaining screens generated
              if (event.type === 'parallel_screens_complete') {
                const { screens } = event.data;
                console.log('[Client] parallel_screens_complete:', screens.length, 'screens');

                // Clear isGenerating on all parallel screens (HTML was already streamed via code_chunk)
                setNodes(prev => prev.map(node => {
                  const isParallelScreen = screens.some((s: { id: string }) => s.id === node.id);
                  if (isParallelScreen) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        isGenerating: false
                      }
                    };
                  }
                  return node;
                }));

                // Mark all remaining steps as completed
                updateLastMessage(msg => {
                  const steps = [...(msg.designSteps || [])];
                  screens.forEach((screen: { id: string; name: string }) => {
                    const pageIndex = steps.findIndex(s => s.id === `page-${screen.id}`);
                    if (pageIndex >= 0) {
                      steps[pageIndex] = { ...steps[pageIndex], status: 'completed', label: `Page ${screen.name} generated` };
                    }
                  });
                  return { ...msg, designSteps: steps };
                });
              }

              // AI Completion Message
              if (event.type === 'completion_message') {
                updateLastMessage(msg => ({
                  ...msg,
                  completionMessage: String(event.data),
                }));
              }

              // Rate Limit Error
              if (event.type === 'rate_limit_error') {
                console.log('Rate limit error detected');
                setIsOverloadModalOpen(true);
                updateLastMessage(msg => ({
                  ...msg,
                  isThinkingPaused: true,
                  content: msg.content || "Our systems are currently overloaded. Please try again later."
                }));
              }

              // Done
              if (event.type === 'done') {
                updateLastMessage(msg => ({
                  ...msg,
                  designSteps: msg.designSteps?.map(s => ({ ...s, status: 'completed' as const }))
                }));

                // Only increment generations counter if screens were actually generated
                // (not for clarification, design system selection, or planning phases)
                const completedScreens = generatedScreensRef.current.filter(s => s.html.includes('</html>'));
                if (completedScreens.length > 0) {
                  console.log('[Generations] Incrementing counter - generated', completedScreens.length, 'screens');
                  incrementGenerationsUsed().catch(err => console.error('[Generations] Failed to increment counter:', err));
                } else {
                  console.log('[Generations] Not incrementing - no completed screens (clarification/planning phase)');
                }

                // Save project to Convex
                const screens = generatedScreensRef.current;
                if (screens.length > 0 && currentPromptRef.current) {
                  const designSystemMarkdown = await ensureDesignSystemMarkdown();

                  // Create temporary title from first 50 chars of prompt (will be replaced by AI-generated name)
                  const tempTitle = currentPromptRef.current.slice(0, 50) + (currentPromptRef.current.length > 50 ? '...' : '');

                  // Get current messages from ref (avoids stale closure issue)
                  const currentMessages = messagesRef.current.map(m => ({
                    role: m.role,
                    content: m.content,
                    thinkingContent: m.thinkingContent,
                    isThinkingComplete: m.isThinkingComplete,
                    isThinkingPaused: m.isThinkingPaused,
                    thinkingDuration: m.thinkingDuration,
                    question: m.question,
                    questionIndex: m.questionIndex,
                    submittedAnswer: m.submittedAnswer,
                    isPlanReady: m.isPlanReady,
                    plannedScreens: m.plannedScreens ?? undefined,
                    isArchitectureApproved: m.isArchitectureApproved,
                    isDesignSystemReady: m.isDesignSystemReady,
                    designSystemOptions: m.designSystemOptions,
                    submittedDesignSystem: m.submittedDesignSystem,
                    completionMessage: m.completionMessage,
                    designSteps: m.designSteps?.map(s => ({
                      id: s.id,
                      label: s.label,
                      status: s.status,
                    })),
                  }));

                  // Debug logging
                  console.log('[Project] Saving project with:', {
                    screensCount: screens.length,
                    flowsCount: plannedFlowsRef.current.length,
                    messagesCount: currentMessages.length,
                    hasDesignSystem: !!designSystemMarkdown,
                  });

                  // Store prompt for AI name extraction (before async operations)
                  const promptForExtraction = currentPromptRef.current;

                  createProject({
                    title: tempTitle,
                    prompt: currentPromptRef.current,
                    screens: screens.map(s => ({
                      id: s.id,
                      name: s.name,
                      html: s.html,
                    })),
                    flows: plannedFlowsRef.current.map(f => ({
                      from: f.from,
                      to: f.to,
                      label: f.label,
                    })),
                    messages: currentMessages,
                    designSystemMarkdown: designSystemMarkdown || undefined,
                  }).then(async result => {
                    if (result?.projectId) {
                      setSavedProjectId(result.projectId);

                      // Extract AI-generated name in background
                      try {
                        console.log('[Project] Extracting AI-generated name...');
                        const nameResponse = await fetch('/api/extract-name', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt: promptForExtraction }),
                        });

                        if (nameResponse.ok) {
                          const { name } = await nameResponse.json();
                          if (name && name !== tempTitle) {
                            console.log('[Project] Updating title to:', name);
                            await updateProjectTitle({
                              projectId: result.projectId,
                              title: name,
                            });
                          }
                        }
                      } catch (err) {
                        console.error('[Project] Failed to extract AI name (keeping temp title):', err);
                      }
                    }
                  }).catch(err => console.error('[Project] Failed to save project:', err));
                }
              }

            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
        }
        // Break out of the 'while(true)' loop if paywall was triggered
        if (shouldStopGeneration) {
          console.log('[Paywall] Breaking out of SSE reading loop');
          break;
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Une erreur est survenue lors de la génération." }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    createProject,
    ensureDesignSystemMarkdown,
    incrementGenerationsUsed,
    isLoading,
    setHasStarted,
    setIsLoading,
    setIsOverloadModalOpen,
    setMessages,
    setNodes,
    setStallWarning,
    updateLastMessage,
    updateProjectTitle
  ]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input;
    setInput('');

    // Check if user is authenticated
    if (!isAuthenticated) {
      // Store the prompt in localStorage directly (useEffect may not run before OAuth redirect)
      localStorage.setItem('pendingPrompt', userPrompt);
      console.log('[Auth] Saved pendingPrompt to localStorage:', userPrompt);
      setPendingPrompt(userPrompt);
      setIsLoginModalOpen(true);
      return;
    }

    // User is authenticated, proceed with generation
    await processUserPrompt(userPrompt);
  };

  const handlePlanRefine = useCallback(async (feedback: string) => {
    const currentPlan = [...plannedScreensRef.current];

    updateLastMessage(msg => ({
      ...msg,
      isPlanReady: false,
      plannedScreens: null
    }));

    conversationHistoryRef.current.push({
      type: 'plan_feedback',
      feedback: feedback
    });

    setMessages(prev => [...prev, { role: 'user', content: `Changes requested: ${feedback}` }]);

    await runGeneration({
      prompt: currentPromptRef.current,
      conversationHistory: conversationHistoryRef.current,
      plannedScreens: currentPlan,
      planFeedback: feedback
    });
  }, [runGeneration, updateLastMessage]);

  // Process user prompt (after auth check)
  const processUserPrompt = useCallback(async (userPrompt: string) => {
    // PAYWALL CHECK: If user has 0 generations remaining (and not unlimited), show modal immediately
    if (generationsData && generationsData.remaining === 0) {
      console.log('[Paywall] User has 0 generations remaining, showing subscription modal');
      setIsSubscriptionModalOpen(true);
      return;
    }

    if (isRefiningPlan) {
      setIsRefiningPlan(false);
      handlePlanRefine(userPrompt);
      return;
    }

    // Check for resume/chat scenario
    const isPaused = !isLoading && hasStarted && plannedScreensRef.current.length > 0;

    if (isPaused) {
      const lower = userPrompt.toLowerCase();
      const isResume = lower.includes('continue') || lower.includes('resume') || lower.includes('go on');

      if (isResume) {
        setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

        // Filter out incomplete screens (partial HTML) so they get regenerated
        // Keep only screens that have a closing html tag
        const completedScreens = generatedScreensRef.current.filter(s => s.html.includes('</html>'));
        generatedScreensRef.current = completedScreens;

        // Resume generation
        await runGeneration({
          prompt: currentPromptRef.current,
          conversationHistory: conversationHistoryRef.current,
          plannedScreens: plannedScreensRef.current,
          plannedFlows: plannedFlowsRef.current,
          generatedScreens: completedScreens,
          designApproved: true
        });
        return;
      } else {
        // Chat mode
        setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

        await runGeneration({
          prompt: userPrompt,
          plannedScreens: plannedScreensRef.current,
          plannedFlows: plannedFlowsRef.current,
          mode: 'chat'
        });
        return;
      }
    }

    const isActiveConversation = conversationHistoryRef.current.length > 0 || plannedScreensRef.current.length > 0;

    if (isActiveConversation) {
      conversationHistoryRef.current.push({
        type: 'qa',
        question: 'User additional input',
        answer: userPrompt
      });

      setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

      await runGeneration({
        prompt: currentPromptRef.current,
        conversationHistory: conversationHistoryRef.current,
        plannedScreens: plannedScreensRef.current,
        skipToPlanning: true
      });
    } else {
      currentPromptRef.current = userPrompt;
      setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
      conversationHistoryRef.current = [];
      plannedScreensRef.current = [];
      await runGeneration({ prompt: userPrompt });
    }
  }, [
    generationsData,
    handlePlanRefine,
    hasStarted,
    isLoading,
    isRefiningPlan,
    runGeneration,
    setIsSubscriptionModalOpen
  ]);

  // Effect to handle resumePrompt after OAuth redirect
  useEffect(() => {
    if (resumePrompt) {
      console.log('[OAuth Debug] Processing resumePrompt:', resumePrompt);
      const promptToProcess = resumePrompt;
      setResumePrompt(null); // Clear it to prevent re-triggering

      // Show the user's input in the homepage input field briefly
      setInput(promptToProcess);

      // Wait 1 second to show homepage with input, then start generation
      setTimeout(() => {
        setInput(''); // Clear input before transition
        processUserPrompt(promptToProcess);
      }, 1000);
    }
  }, [resumePrompt, processUserPrompt]);

  // Effect to handle resumeAfterSubscription after Stripe checkout success
  // We wait for hasActiveSubscription to be true before processing
  const resumeProcessedRef = useRef(false);
  useEffect(() => {
    // If we have a pending prompt and subscription is now active, process it
    if (resumeAfterSubscription && hasActiveSubscription && !resumeProcessedRef.current) {
      console.log('[Stripe] Processing resumeAfterSubscription:', resumeAfterSubscription);
      resumeProcessedRef.current = true; // Guard against double execution
      setResumeAfterSubscription(null); // Clear it to prevent re-triggering

      // Check if we have complete saved state to resume from
      if (resumeState && resumeState.generatedScreens?.length > 0) {
        console.log('[Stripe] Resuming with saved state - restoring workspace');

        // IMMEDIATELY show ReactFlow workspace to avoid landing page flash
        setHasStarted(true);
        setIsSidebarOpen(true);

        // Restore all refs from saved state
        currentPromptRef.current = resumeState.prompt;
        plannedScreensRef.current = resumeState.plannedScreens || [];
        plannedFlowsRef.current = resumeState.plannedFlows || [];
        generatedScreensRef.current = resumeState.generatedScreens || [];
        selectedDesignSystemRef.current = resumeState.selectedDesignSystem || null;
        conversationHistoryRef.current = resumeState.conversationHistory || [];
        completedScreensCountRef.current = resumeState.currentScreenIndex || 0;

        // Create set of already-generated screen IDs for fast lookup
        const generatedIds = new Set(resumeState.generatedScreens.map(s => s.id));

        // Recreate ReactFlow nodes for already-generated screens
        const config = getLayoutConfig(viewMode);
        let newNodes: Node[];

        if (resumeState.plannedFlows.length > 0 && plannedScreensRef.current.length > 0) {
          // Use flow-based layout
          const positions = computeFlowLayout(plannedScreensRef.current, resumeState.plannedFlows, config);
          const positionMap = new Map(positions.map(p => [p.id, p]));

          newNodes = plannedScreensRef.current.map((screen) => {
            const pos = positionMap.get(screen.id);
            const generated = resumeState.generatedScreens.find(g => g.id === screen.id);
            const isAlreadyGenerated = generatedIds.has(screen.id);
            return {
              id: screen.id,
              type: 'previewNode',
              position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
              data: {
                label: screen.name,
                html: generated?.html || '',
                viewMode,
                // CRITICAL: Only set isGenerating=true for screens NOT yet generated
                isGenerating: !isAlreadyGenerated,
                onExpand: handleExpand,
                onShowCode: handleShowCode,
                onFocus: handleFocus,
              },
            };
          });
        } else {
          // Fallback to grid layout
          const cols = viewMode === 'mobile' ? 4 : 2;
          const w = config.nodeWidth;
          const h = config.nodeHeight;
          const gap = config.horizontalGap;

          newNodes = plannedScreensRef.current.map((screen, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const generated = resumeState.generatedScreens.find(g => g.id === screen.id);
            const isAlreadyGenerated = generatedIds.has(screen.id);

            return {
              id: screen.id,
              type: 'previewNode',
              position: { x: col * (w + gap), y: row * (h + gap) },
              data: {
                label: screen.name,
                html: generated?.html || '',
                viewMode,
                isGenerating: !isAlreadyGenerated,
                onExpand: handleExpand,
                onShowCode: handleShowCode,
                onFocus: handleFocus,
              },
            };
          });
        }

        // Create edges from flows
        const newEdges: Edge[] = resumeState.plannedFlows.map((flow, index) => ({
          id: `edge-${flow.from}-${flow.to}-${index}`,
          source: flow.from,
          target: flow.to,
          type: 'animatedEdge',
          data: { label: flow.label || undefined },
          animated: false,
        }));

        // Set nodes and edges
        setNodes(newNodes);
        setEdges(newEdges);

        // Create design steps for UI showing progress
        const designSteps: Step[] = [
          { id: 'design-system', label: 'Design System Generated', status: 'completed' },
          ...resumeState.generatedScreens.map((s) => ({
            id: `page-${s.id}`,
            label: `Page ${s.name} generated`,
            status: 'completed' as const,
          })),
          ...plannedScreensRef.current
            .filter(s => !resumeState.generatedScreens.find(g => g.id === s.id))
            .map(s => ({
              id: `page-${s.id}`,
              label: `Generating ${s.name}`,
              status: 'running' as const,
            })),
        ];

        // Update messages
        setMessages([
          { role: 'assistant', content: 'Hey ! How can i help you design your app today ?' },
          { role: 'user', content: resumeState.prompt },
          {
            role: 'assistant',
            content: '',
            designSteps,
          },
        ]);

        // Fit view after nodes are set
        setTimeout(() => {
          reactFlowInstance.current?.fitView({ duration: 800, padding: 0.15 });
        }, 100);

        // Clear resume state
        setResumeState(null);

        // Get reference HTML from first generated screen
        const referenceHtml = resumeState.generatedScreens[0]?.html || '';

        // Actually resume generation - call runGeneration with resume context
        const remainingScreens = plannedScreensRef.current.filter(s => !generatedIds.has(s.id));

        if (remainingScreens.length > 0) {
          console.log('[Stripe] Resuming generation of', remainingScreens.length, 'remaining screens');

          // Run generation with resume context
          runGeneration({
            prompt: resumeState.prompt,
            conversationHistory: resumeState.conversationHistory,
            plannedScreens: plannedScreensRef.current,
            selectedDesignSystem: resumeState.selectedDesignSystem,
            // Resume flags
            resumeFromIndex: resumeState.currentScreenIndex,
            referenceHtml,
          }, true); // isDesignPhase = true to not create new message
        } else {
          console.log('[Stripe] All screens already generated, nothing to resume');
        }
      } else {
        // No saved state - fall back to restarting from scratch
        console.log('[Stripe] No saved state, restarting generation from scratch');
        const promptToProcess = resumeAfterSubscription;

        // Show the user's input in the homepage input field briefly
        setInput(promptToProcess);

        // Wait 1 second to show homepage with input, then start generation
        setTimeout(() => {
          setInput(''); // Clear input before transition
          processUserPrompt(promptToProcess);
        }, 1000);
      }
    }
  }, [resumeAfterSubscription, hasActiveSubscription, resumeState, viewMode, handleExpand, handleShowCode, handleFocus, setNodes, setEdges, runGeneration, processUserPrompt]);

  const handleClarificationSubmit = async (answers: ClarificationAnswer[]) => {
    const answer = answers[0];
    conversationHistoryRef.current.push({
      type: 'qa',
      question: answer.question,
      answer: answer.answer
    });

    updateLastMessage(msg => ({
      ...msg,
      submittedAnswer: answer
    }));

    await runGeneration({
      prompt: currentPromptRef.current,
      conversationHistory: conversationHistoryRef.current,
      plannedScreens: plannedScreensRef.current
    });
  };

  const handleAutoGenerate = async (answers: ClarificationAnswer[]) => {
    const answer = answers[0];

    conversationHistoryRef.current.push({
      type: 'qa',
      question: answer.question,
      answer: answer.answer
    });

    updateLastMessage(msg => ({
      ...msg,
      submittedAnswer: answer
    }));

    await runGeneration({
      prompt: currentPromptRef.current,
      conversationHistory: conversationHistoryRef.current,
      plannedScreens: plannedScreensRef.current,
      skipToPlanning: true
    });
  };

  const handleDesignSystemSelect = async (selection: DesignSystemSelection) => {
    selectedDesignSystemRef.current = selection;

    updateLastMessage(msg => ({
      ...msg,
      isDesignSystemReady: false,
      submittedDesignSystem: selection
    }));

    await runGeneration({
      prompt: currentPromptRef.current,
      conversationHistory: conversationHistoryRef.current,
      plannedScreens: plannedScreensRef.current,
      designSystemOptions: designSystemOptionsRef.current,
      selectedDesignSystem: selection,
      designSystemComplete: true
    });
  };

  const handlePlanApprove = async () => {
    const screens = plannedScreensRef.current;
    const flows = plannedFlowsRef.current;
    const firstScreen = screens[0];

    // Update EXISTING message - mark architecture as approved and add design steps
    updateLastMessage(msg => ({
      ...msg,
      isPlanReady: false,
      isArchitectureApproved: true,
      isThinkingComplete: true,
      designSteps: [
        { id: 'design-system', label: 'Generating Design System', status: 'running' as const },
        { id: `page-${firstScreen?.id || '0'}`, label: `Generating ${firstScreen?.name || 'Unknown'}`, status: 'running' as const }
      ]
    }));

    // Create nodes
    const currentMode = viewModeRef.current;
    const config = getLayoutConfig(currentMode);
    const positions = computeFlowLayout(screens, flows, config);
    const positionMap = new Map(positions.map(p => [p.id, p]));

    const newNodes: Node[] = screens.map((screen: PlannedScreen, index: number) => {
      const pos = positionMap.get(screen.id);

      return {
        id: screen.id,
        type: 'previewNode',
        draggable: false,
        position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        data: {
          label: screen.name,
          html: '',
          onExpand: handleExpand,
          onShowCode: handleShowCode,
          onFocus: handleFocus,
          viewMode: currentMode,
          isGenerating: index === 0 // First screen starts generating immediately
        },
        style: { opacity: 1, transition: 'opacity 0.5s' }
      };
    });
    setNodes(newNodes);

    const newEdges: Edge[] = flows.map((flow: ScreenFlow) => ({
      id: flow.id,
      source: flow.from,
      target: flow.to,
      type: 'animatedEdge',
      data: { label: flow.label },
    }));
    setEdges(newEdges);

    // Run design generation WITHOUT creating new message
    await runGeneration({
      prompt: currentPromptRef.current,
      conversationHistory: conversationHistoryRef.current,
      plannedScreens: plannedScreensRef.current,
      plannedFlows: plannedFlowsRef.current,
      designApproved: true,
      selectedDesignSystem: selectedDesignSystemRef.current,
      designSystemComplete: true
    }, true); // isDesignPhase = true
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setHasStarted(false);
    setMessages([{ role: 'assistant', content: 'Hey ! How can i help you design your app today ?' }]);
    setNodes([]);
    setEdges([]);
    plannedScreensRef.current = [];
    plannedFlowsRef.current = [];
    generatedScreensRef.current = [];
    conversationHistoryRef.current = [];
    currentPromptRef.current = '';
    designSystemMarkdownRef.current = null;
    designSystemGenerationStartedRef.current = false;
    designSystemOptionsRef.current = null;
    selectedDesignSystemRef.current = null;
    completedScreensCountRef.current = 0;
    messagesRef.current = [];
    setIsResetModalOpen(false);
    setSavedProjectId(null);
    setIsSidebarOpen(true);
    setInput('');
  };

  // Handler for Draftly button click - conditional based on generation progress
  const handleDraftlyClick = () => {
    const plannedScreens = plannedScreensRef.current;
    const generatedScreens = generatedScreensRef.current;

    // Check if all screens are generated with complete HTML
    const allScreensGenerated =
      plannedScreens.length > 0 &&
      generatedScreens.length >= plannedScreens.length &&
      generatedScreens.every(screen => screen.html && screen.html.includes('</html>'));

    // If all screens are generated and complete, go directly to landing page (no confirmation)
    if (allScreensGenerated && !isLoading) {
      handleReset();
    } else {
      // Show confirmation modal if generation is in progress or incomplete
      setIsResetModalOpen(true);
    }
  };

  const handleRequestRefine = () => {
    setIsRefiningPlan(true);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.placeholder = "Describe the changes you want to make to the plan...";
    }
  };

  const handleInputBlur = () => {
    if (isRefiningPlan && !input.trim()) {
      setIsRefiningPlan(false);
    }
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    let count = 0;

    nodes.forEach(node => {
      if (node.data.html && node.data.label) {
        const safeName = (node.data.label as string).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeName}.html`;
        zip.file(filename, node.data.html as string);
        count++;
      }
    });

    if (count === 0) {
      alert("No generated screens to export.");
      return;
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "project-screens.zip");
    setIsExportOpen(false);
  };

  const handleExportDesignSystem = async () => {
    // Use pre-generated markdown if available (instant export)
    if (designSystemMarkdownRef.current) {
      const blob = new Blob([designSystemMarkdownRef.current], { type: "text/markdown;charset=utf-8" });
      saveAs(blob, "design-system.md");
      setIsExportOpen(false);
      return;
    }

    // Fallback: generate on-demand if not ready yet
    const firstScreenId = plannedScreensRef.current[0]?.id;
    const firstNode = nodes.find(n => n.id === firstScreenId) || nodes.find(n => n.data.html);

    if (!firstNode?.data?.html) {
      alert("No screens generated yet to build a design system from.");
      return;
    }

    const originalButtonText = document.getElementById('btn-export-ds')?.innerText;
    const btn = document.getElementById('btn-export-ds');
    if (btn) btn.innerText = "Generating...";

    try {
      const res = await fetch('/api/design-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: firstNode.data.html })
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
      saveAs(blob, "design-system.md");
      setIsExportOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error generating design system");
    } finally {
      if (btn && originalButtonText) btn.innerText = originalButtonText;
    }
  };

  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        onExpand: handleExpand,
        onShowCode: handleShowCode,
        onFocus: handleFocus,
        viewMode
      }
    })));
  }, [handleExpand, handleShowCode, handleFocus, viewMode, setNodes]);

  const isLastMessageInteractive = () => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant') {
      if (lastMsg.question && !lastMsg.submittedAnswer) return true;
      if (lastMsg.isDesignSystemReady && !lastMsg.submittedDesignSystem) return true;
      if (lastMsg.isPlanReady && !isRefiningPlan) return true;
    }
    return false;
  };

  const isInputDisabled = isLoading || isLastMessageInteractive();
  const isGenerationComplete = !isLoading && !nodes.some(n => n.data.isGenerating);

  const SUGGESTIONS = [
    { title: "SaaS Dashboard", prompt: "A modern analytics dashboard for a SaaS platform with dark mode, charts, and user management." },
    { title: "Social Web App", prompt: "A social networking app focused on sharing travel itineraries and photos with friends." },
    { title: "Portfolio Website", prompt: "A minimalist portfolio website for a digital artist with gallery grid and contact form." },
    { title: "E-commerce Store", prompt: "A clean, modern e-commerce store for high-end furniture with product filtering and cart." },
  ];

  return (
    <div className="relative h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden font-mono">
      <AnimatePresence mode="wait">
        {!hasStarted && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 z-20 bg-[#1e1e1e] overflow-y-auto custom-scrollbar" // Enable scrolling
          >
            <div className="flex flex-col min-h-full p-6"> {/* Content wrapper */}
              {/* Top header with My Projects & Log Out */}
              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-4 right-4 flex items-center gap-2"
                >
                  <Link
                    href="/subscription"
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                  >
                    Subscription
                  </Link>
                  <Link
                    href="/projects"
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    My Projects
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                  >
                    Log Out
                  </button>
                </motion.div>
              )}

              {/* Login button for non-authenticated users */}
              {!isAuthenticated && !isAuthLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute top-4 right-4"
                >
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors cursor-pointer"
                  >
                    Login
                  </button>
                </motion.div>
              )}

              <div className="flex-1 flex items-center justify-center min-h-[70vh]">
                <div className="w-full max-w-xl flex flex-col items-center gap-8">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center justify-center gap-2.5"
                    >
                      <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        <AiPaintbrush size={20} className="text-blue-400" />
                      </div>
                      <h1 className="text-2xl font-semibold text-zinc-100">Draftly</h1>
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-sm text-zinc-500"
                    >
                      {isAuthenticated && firstName
                        ? `Hi ${firstName}, describe your app idea and get instant UI design`
                        : 'Describe your app idea and get instant UI designs'
                      }
                    </motion.p>
                  </div>

                  {/* Input */}
                  <motion.form
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    onSubmit={sendMessage}
                    className="w-full"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe your app..."
                        className="w-full h-11 bg-[#252526] border border-[#3e3e42] text-xs text-zinc-200 rounded-lg px-4 pr-11 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 disabled:text-zinc-700 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                    {/* Remaining Generations Counter - inline below input */}
                    {isAuthenticated && generationsData && (
                      <div className="flex justify-start mt-1.5 pl-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${generationsData.remaining === -1
                            ? 'bg-emerald-400'
                            : generationsData.remaining > 5
                              ? 'bg-emerald-400'
                              : generationsData.remaining > 0
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`} />
                          <span className="text-[9px] text-zinc-500">
                            {generationsData.remaining === -1
                              ? 'Unlimited generations'
                              : generationsData.remaining === 0
                                ? 'No generations left'
                                : `${generationsData.remaining} generation${generationsData.remaining > 1 ? 's' : ''} remaining`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.form>

                  {/* Suggestions */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-full space-y-2"
                  >
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-1 text-center">Try an example</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.title}
                          onClick={() => setInput(s.prompt)}
                          className="px-3 py-1.5 bg-[#252526] hover:bg-[#3e3e42] border border-[#3e3e42] rounded-full text-[11px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>


              {/* Project Showcase Grid */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <ProjectShowcase />
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {
        hasStarted && (
          <div className="flex h-full w-full relative">
            {/* LEFT SIDE: CHAT */}
            <motion.div
              initial={{ x: -400, opacity: 0, width: 400 }}
              animate={{
                x: isSidebarOpen ? 0 : -400,
                opacity: isSidebarOpen ? 1 : 0,
                width: isSidebarOpen ? 400 : 0
              }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 border-r border-[#3e3e42] flex flex-col bg-[#252526] z-10 shadow-xl overflow-hidden"
            >
              <div className="h-14 border-b border-[#3e3e42] flex items-center px-4 justify-between bg-[#1e1e1e] shrink-0">
                <button
                  onClick={handleDraftlyClick}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Retour à l'accueil"
                >
                  <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center text-blue-400">
                    <AiPaintbrush size={14} />
                  </div>
                  <span className="font-semibold text-sm">Draftly</span>
                </button>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-white/5 transition-colors"
                  title="Close Sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-2 font-mono text-[11px] scroll-smooth custom-scrollbar w-[400px]">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                    {msg.role === 'user' && (
                      <div className="max-w-[90%] bg-[#007acc]/10 border border-[#007acc]/30 text-white p-3 rounded-xl rounded-tr-none whitespace-pre-wrap text-[11px]">
                        {msg.content}
                      </div>
                    )}

                    {msg.role === 'assistant' && (
                      <div className="w-full space-y-2">
                        {/* Thinking Block */}
                        {(msg.thinkingContent || msg.isThinkingComplete === false || msg.isThinkingPaused) && (
                          <ThinkingBlock
                            content={msg.thinkingContent || ''}
                            isComplete={msg.isThinkingComplete}
                            isPaused={msg.isThinkingPaused}
                            durationSeconds={msg.thinkingDuration}
                          />
                        )}

                        {/* Clarification Question */}
                        {msg.question && (
                          <ClarificationQuestions
                            questions={[msg.question]}
                            onSubmit={handleClarificationSubmit}
                            onAutoGenerate={!msg.submittedAnswer ? handleAutoGenerate : undefined}
                            submittedAnswer={msg.submittedAnswer}
                            startIndex={msg.questionIndex || 1}
                          />
                        )}

                        {/* Design System Selector */}
                        {msg.designSystemOptions && (msg.isDesignSystemReady || msg.submittedDesignSystem) && (
                          <DesignSystemSelector
                            options={msg.designSystemOptions}
                            onSubmit={msg.isDesignSystemReady ? handleDesignSystemSelect : undefined}
                            submittedSelection={msg.submittedDesignSystem}
                          />
                        )}

                        {/* Plan Review - with approved state */}
                        {msg.plannedScreens && (msg.isPlanReady || msg.isArchitectureApproved) && (
                          <PlanReview
                            screens={msg.plannedScreens}
                            onApprove={msg.isPlanReady ? handlePlanApprove : undefined}
                            onRequestRefine={msg.isPlanReady ? handleRequestRefine : undefined}
                            isApproved={msg.isArchitectureApproved}
                          />
                        )}

                        {/* Design Steps */}
                        {msg.designSteps && msg.designSteps.length > 0 && (
                          <ProcessSteps steps={msg.designSteps} />
                        )}

                        {/* Completion Message */}
                        {msg.completionMessage && (
                          <div className="text-[12px] text-white leading-relaxed mt-2 px-3 pt-[5px]">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2">{children}</p>,
                                strong: ({ children }) => <span className="text-white font-medium">{children}</span>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                li: ({ children }) => <li className="text-white">{children}</li>,
                              }}
                            >
                              {msg.completionMessage}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Showcase Toggle Block - only for newly created projects, not loaded ones */}
                        {msg.completionMessage && savedProjectId && !loadedProjectId && (
                          <div className="mt-2 space-y-2">
                            <ShowcaseToggleBlock projectId={savedProjectId} initialIsPublic={true} />

                            {/* Start New Project Button */}
                            <button
                              onClick={handleReset}
                              className="w-full bg-[#1e1e1e] rounded-xl border border-[#27272a] overflow-hidden px-4 py-3 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <RotateCcw size={14} className="text-blue-400" />
                              <span className="text-xs font-medium text-zinc-300">Start New Project</span>
                            </button>
                          </div>
                        )}

                        {/* Welcome message */}
                        {msg.content === 'Hey ! How can i help you design your app today ?' && (
                          <div className="px-3 py-2.5 bg-[#1e1e1e] rounded-lg border border-[#3e3e42]">
                            <p className="text-sm font-medium text-zinc-300">👋 How can I help you design your app?</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#3e3e42] bg-[#1e1e1e] shrink-0 w-[400px]">
                {nodes.length === 0 ? (
                  <form onSubmit={sendMessage} className="relative group">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onBlur={handleInputBlur}
                      placeholder={isInputDisabled ? "Write here.." : "Reply or refine..."}
                      disabled={isInputDisabled}
                      className={`w-full bg-[#252526] border border-[#3e3e42] text-[12px] text-[#d4d4d4] rounded-lg py-3 pl-4 pr-10 focus:outline-none transition-all placeholder:text-[#52525b]
                       ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-[#007acc]'}
                       ${isRefiningPlan ? 'border-blue-500/50 ring-1 ring-blue-500/20 bg-blue-500/5' : ''}
                    `}
                    />

                    {isLoading || !input.trim() ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-600 cursor-not-allowed"
                        disabled
                      >
                        <Send size={16} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isInputDisabled}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#858585] hover:text-white transition-colors cursor-pointer"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      id="btn-export-ds"
                      onClick={handleExportDesignSystem}
                      disabled={!isGenerationComplete}
                      className="flex-1 h-9 bg-[#252526] hover:bg-[#3e3e42] border border-[#3e3e42] text-[11px] text-zinc-300 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Palette size={14} />
                      <span>Export Design</span>
                    </button>
                    <button
                      onClick={handleExportZip}
                      disabled={!isGenerationComplete}
                      className="flex-1 h-9 bg-[#252526] hover:bg-[#3e3e42] border border-[#3e3e42] text-[11px] text-zinc-300 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Export Screens</span>
                    </button>
                    <button
                      onClick={() => setIsResetModalOpen(true)}
                      className="h-9 w-9 bg-[#252526] hover:bg-red-500/10 border border-[#3e3e42] hover:border-red-500/50 text-zinc-400 hover:text-red-400 rounded-lg flex items-center justify-center transition-all group cursor-pointer"
                      title="Reset Project"
                    >
                      <RotateCcw size={14} className="group-hover:-rotate-180 transition-transform duration-500" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT SIDE: GRAPH */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1 relative bg-[#1e1e1e] h-full"
            >
              <AnimatePresence>
                {!isSidebarOpen && (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-50 p-2 bg-[#252526] border border-[#3e3e42] rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 shadow-lg transition-all cursor-pointer"
                    title="Open Sidebar"
                  >
                    <ChevronRight size={18} />
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="h-full w-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={(instance) => { reactFlowInstance.current = instance; }}
                  colorMode="dark"
                  fitView
                  className="bg-[#1e1e1e]"
                  minZoom={0.1}
                  proOptions={{ hideAttribution: true }}
                  defaultEdgeOptions={{ type: 'animatedEdge' }}
                >
                  <Background color="#555" gap={20} variant={BackgroundVariant.Dots} size={1} />
                  <Controls className="bg-[#252526] border-[#3e3e42] text-[#d4d4d4] fill-[#d4d4d4] rounded-md overflow-hidden shadow-xl" />
                </ReactFlow>

                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] p-1 rounded-full shadow-xl ring-1 ring-black/20">
                  <button
                    onClick={() => handleViewModeChange('desktop')}
                    className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'desktop' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Desktop View"
                  >
                    <Monitor size={20} />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('mobile')}
                    className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'mobile' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Mobile View"
                  >
                    <Smartphone size={20} />
                  </button>
                </div>

                <HelpBubble />

                {/* Generations counter bubble */}
                {isAuthenticated && generationsData && (
                  <div className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-[#252526]/90 backdrop-blur-md border border-[#3e3e42] px-3 py-2 rounded-full shadow-xl ring-1 ring-black/20">
                    <div className={`w-2 h-2 rounded-full ${generationsData.remaining === -1
                      ? 'bg-emerald-400'
                      : generationsData.remaining > 5
                        ? 'bg-emerald-400'
                        : generationsData.remaining > 0
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`} />
                    <span className="text-[11px] text-zinc-400">
                      {generationsData.remaining === -1
                        ? 'Unlimited'
                        : `${generationsData.remaining} generation${generationsData.remaining > 1 ? 's' : ''} left`
                      }
                    </span>
                  </div>
                )}

                {/* Export Menu (Removed) */}

              </div>
            </motion.div>
          </div>
        )
      }

      {/* PREVIEW MODAL - uses StreamingIframe for live updates */}
      {
        expandedScreenId && (() => {
          const expandedNode = nodes.find(n => n.id === expandedScreenId);
          const expandedHtml = (expandedNode?.data?.html as string) || '';
          const expandedLabel = (expandedNode?.data?.label as string) || 'Preview';
          const isGenerating = (expandedNode?.data?.isGenerating as boolean) || false;

          return (
            <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
              {viewMode === 'mobile' ? (
                <div className="relative scale-[0.85] sm:scale-100 transition-transform duration-300">
                  <button
                    onClick={() => setExpandedScreenId(null)}
                    className="absolute -right-16 top-0 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X size={24} />
                  </button>

                  <div
                    style={{ width: 430, height: 932 }}
                    className="relative bg-black rounded-[60px] shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a] ring-1 ring-[#333] overflow-hidden select-none flex flex-col"
                  >
                    <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                    <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                    <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                    <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div>

                    <div className="w-full h-[54px] px-7 flex justify-between items-center z-40 text-white pointer-events-none bg-black shrink-0 relative">
                      <span className="font-semibold text-[15px] tracking-wide pl-1">9:41</span>

                      <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[120px] h-[35px] bg-[#1a1a1a] rounded-[20px] z-50 flex items-center justify-center gap-5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] shadow-[inset_0_0_2px_1px_rgba(50,20,20,0.5)] opacity-80"></div>
                        <div className="w-3 h-3 rounded-full bg-[#08081a] shadow-[inset_0_0_4px_2px_rgba(60,70,120,0.6)] ring-[0.5px] ring-white/5"></div>
                      </div>

                      <div className="flex items-center gap-2 pr-1">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" className="opacity-90">
                          <path d="M1 9C1 9.55 1.45 10 2 10H14C14.55 10 15 9.55 15 9V3C15 2.45 14.55 2 14 2H2C1.45 2 1 2.45 1 3V9ZM2 11C0.9 11 0 10.1 0 9V3C0 1.9 0.9 1 2 1H14C15.1 1 16 1.9 16 3V9C16 10.1 15.1 11 14 11H2ZM16.5 4.5V7.5C17.33 7.5 18 6.83 18 6C18 5.17 17.33 4.5 16.5 4.5Z" />
                          <rect x="2" y="3" width="11" height="6" rx="1" />
                        </svg>
                      </div>
                    </div>

                    {expandedHtml ? (
                      <StreamingIframe html={expandedHtml} title={expandedLabel} isGenerating={isGenerating} />
                    ) : isGenerating ? (
                      <div className="flex-1 w-full bg-[#09090b] flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 border-3 border-blue-500/20 rounded-full"></div>
                          <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center px-6">
                          <p className="text-zinc-400 text-xs font-medium">Generating</p>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{expandedLabel}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 w-full bg-[#09090b] p-5 pt-4 flex flex-col gap-4 opacity-40">
                        <div className="h-10 bg-zinc-900 rounded-xl flex items-center px-4 border border-zinc-800/50">
                          <div className="h-4 w-24 bg-zinc-800 rounded"></div>
                        </div>
                        <div className="h-40 bg-zinc-900 rounded-2xl border border-zinc-800/50"></div>
                        <div className="flex gap-3">
                          <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
                          <div className="flex-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800/50"></div>
                        </div>
                        <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800/50 p-4 flex flex-col gap-3">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-12 bg-zinc-800/50 rounded-lg"></div>
                          ))}
                        </div>
                        <div className="h-16 bg-zinc-900 rounded-2xl border border-zinc-800/50 flex items-center justify-around px-4">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-10 h-10 bg-zinc-800 rounded-full"></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#1e1e1e] w-full h-full rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
                  <div className="h-9 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                      </div>
                      <span className="text-xs font-medium text-zinc-400">{expandedLabel}</span>
                    </div>
                    <button
                      onClick={() => setExpandedScreenId(null)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                      title="Close Preview"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 bg-[#09090b] overflow-hidden relative flex flex-col">
                    {expandedHtml ? (
                      <StreamingIframe html={expandedHtml} title={expandedLabel} isGenerating={isGenerating} />
                    ) : isGenerating ? (
                      <div className="flex-1 w-full h-full flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
                          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-400 text-sm font-medium">Generating {expandedLabel}</p>
                          <p className="text-zinc-600 text-xs mt-1">Creating your design...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 w-full h-full bg-[#09090b] p-8 flex flex-col gap-6 opacity-40">
                        <div className="w-full h-16 bg-zinc-900 rounded-lg flex items-center px-6 justify-between border border-zinc-800/50">
                          <div className="h-6 w-32 bg-zinc-800 rounded"></div>
                          <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
                            <div className="h-8 w-8 rounded-full bg-zinc-800"></div>
                          </div>
                        </div>
                        <div className="flex gap-6 flex-1">
                          <div className="w-64 h-full bg-zinc-900 rounded-lg border border-zinc-800/50 p-4 flex flex-col gap-3">
                            <div className="h-4 w-3/4 bg-zinc-800 rounded mb-4"></div>
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} className="h-8 w-full bg-zinc-800/50 rounded"></div>
                            ))}
                          </div>
                          <div className="flex-1 h-full flex flex-col gap-6">
                            <div className="w-full h-64 bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                            <div className="grid grid-cols-2 gap-6 flex-1">
                              <div className="bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                              <div className="bg-zinc-900 rounded-lg border border-zinc-800/50"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()
      }

      {/* CODE MODAL */}
      {
        codeModalContent && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm p-10 animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] w-full h-full max-w-6xl rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden">
              <div className="h-12 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <CodeIcon size={16} className="text-blue-400" />
                  <span className="text-sm font-mono">Source Code (HTML/Tailwind)</span>
                </div>
                <button
                  onClick={() => setCodeModalContent(null)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 bg-[#1e1e1e] overflow-auto">
                <SyntaxHighlighter
                  language="html"
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px' }}
                  wrapLongLines={true}
                >
                  {codeModalContent}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )
      }

      {/* RESET CONFIRMATION MODAL */}
      {
        isResetModalOpen && (
          <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e1e1e] w-full max-w-md rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
                  <RotateCcw size={24} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-sm font-semibold text-white">Reset Project?</h3>
                  <p className="text-[11px] text-zinc-400">
                    This will permanently delete all generated screens, chat history, and current progress. You will be returned to the start screen.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-[#252526] border-t border-[#3e3e42] flex items-center gap-3">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-transparent hover:bg-[#3e3e42] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 text-[11px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-lg shadow-red-900/20 cursor-pointer"
                >
                  Reset Everything
                </button>
              </div>
            </div>
          </div>
        )
      }

      <OverloadModal
        isOpen={isOverloadModalOpen}
        onClose={() => setIsOverloadModalOpen(false)}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingPrompt(null);
        }}
      />

      <StallWarningModal
        isOpen={stallWarning !== null}
        screenName={stallWarning?.screenName || ''}
        duration={stallWarning?.duration || 0}
        onClose={() => setStallWarning(null)}
        onRetry={() => {
          // Abort current generation and restart
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          setStallWarning(null);
          setIsLoading(false);

          // Clear all generating states
          setNodes(prev => prev.map(node => ({
            ...node,
            data: {
              ...node.data,
              isGenerating: false
            }
          })));

          // Update message to show retry state
          updateLastMessage(msg => ({
            ...msg,
            isThinkingPaused: true,
            designSteps: msg.designSteps?.map(s =>
              s.status === 'running' ? { ...s, status: 'completed' as const, label: s.label + ' (timeout)' } : s
            ),
          }));
        }}
      />
    </div >
  );
}
