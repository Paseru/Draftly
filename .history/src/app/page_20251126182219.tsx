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
import { Send, Terminal, Play, X, Code as CodeIcon, Square, ChevronLeft, ChevronRight, Monitor, Smartphone } from 'lucide-react';
import AiPaintbrush from '@/components/ui/AiPaintbrush';
import PreviewNode from '@/components/PreviewNode';
import ProcessSteps, { Step } from '@/components/ProcessSteps';
import ThinkingBlock from '@/components/ThinkingBlock';
import ClarificationQuestions, { ClarificationQuestion, ClarificationAnswer } from '@/components/ClarificationQuestions';
import PlanReview from '@/components/PlanReview';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  // Plan state
  plannedScreens?: PlannedScreen[] | null;
  isPlanReady?: boolean;
  isArchitectureApproved?: boolean;
  // Design steps
  designSteps?: Step[];
};

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({
    previewNode: PreviewNode as any,
  }), []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edgeTypes = useMemo(() => ({
    animatedEdge: AnimatedEdge as any,
  }), []);

  const [modalHtml, setModalHtml] = useState<string | null>(null);
  const [codeModalContent, setCodeModalContent] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Persistence states for the flow
  const currentPromptRef = useRef<string>('');
  const conversationHistoryRef = useRef<ConversationTurn[]>([]);
  const plannedScreensRef = useRef<PlannedScreen[]>([]);
  const plannedFlowsRef = useRef<ScreenFlow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewModeRef = useRef<'desktop' | 'mobile'>('desktop');
  const thinkingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  
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

  const handleExpand = useCallback((html: string) => {
    setModalHtml(html);
  }, []);

  const handleShowCode = useCallback((html: string) => {
    setCodeModalContent(html);
  }, []);

  const updateLastMessage = (updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      const lastIndex = newMsgs.length - 1;
      if (lastIndex >= 0 && newMsgs[lastIndex].role === 'assistant') {
        newMsgs[lastIndex] = updater(newMsgs[lastIndex]);
      }
      return newMsgs;
    });
  };

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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      updateLastMessage(msg => ({
        ...msg,
        isThinkingPaused: true,
        designSteps: msg.designSteps?.map(s => s.status === 'running' ? { ...s, status: 'completed' as const, label: s.label + ' (paused)' } : s),
      }));
    }
  };

  const runGeneration = async (payload: Record<string, unknown>, isDesignPhase = false) => {
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
                const { name, status, screenName, screenIndex, totalScreens } = event.data;
                
                // designing.started is now handled in handlePlanApprove
                // Only handle designing_screen for subsequent screens
                if (name === 'designing_screen' && status === 'started' && screenIndex > 0) {
                  updateLastMessage(msg => {
                    const steps = [...(msg.designSteps || [])];
                    // Check if this screen step already exists
                    if (!steps.find(s => s.label.includes(screenName))) {
                      steps.push({ 
                        id: `page-${screenName}-${screenIndex}`, 
                        label: `Generating page ${screenName}`, 
                        status: 'running' 
                      });
                    }
                    return { ...msg, designSteps: steps };
                  });
                }
              }

              // Screen start - focus camera
              if (event.type === 'screen_start') {
                const { screenId } = event.data;
                const targetNode = nodes.find(n => n.id === screenId);
                if (targetNode && reactFlowInstance.current) {
                  const currentMode = viewModeRef.current;
                  const w = currentMode === 'mobile' ? 375 : 1920;
                  const h = currentMode === 'mobile' ? 812 : 1080;
                  const x = targetNode.position.x + (w / 2); 
                  const y = targetNode.position.y + (h / 2);
                  reactFlowInstance.current.setCenter(x, y, { zoom: 0.575, duration: 500 });
                }
              }

              // Code chunk - stream HTML
              if (event.type === 'code_chunk') {
                const { screenId, content } = event.data;
                setNodes(prev => prev.map(node => {
                  if (node.id === screenId) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        html: (node.data.html || '') + content
                      }
                    };
                  }
                  return node;
                }));
              }

              // Screen complete
              if (event.type === 'screen_complete') {
                const { screenId, screenIndex } = event.data;
                const screens = plannedScreensRef.current;
                const completedScreen = screens[screenIndex];
                const nextScreen = screens[screenIndex + 1];
                
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
                  const pageIndex = steps.findIndex(s => s.label.includes(completedScreen?.name || ''));
                  if (pageIndex >= 0) {
                    steps[pageIndex] = { ...steps[pageIndex], status: 'completed', label: `Page ${completedScreen?.name} generated` };
                  }
                  
                  // Add next page step if exists
                  if (nextScreen && !steps.find(s => s.label.includes(nextScreen.name))) {
                    steps.push({ 
                      id: `page-${nextScreen.id}`, 
                      label: `Generating page ${nextScreen.name}`, 
                      status: 'running' 
                    });
                  }
                  
                  return { ...msg, designSteps: steps };
                });
              }

              // Done
              if (event.type === 'done') {
                updateLastMessage(msg => ({
                  ...msg,
                  designSteps: msg.designSteps?.map(s => ({ ...s, status: 'completed' as const }))
                }));
              }

            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
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
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input;
    setInput('');

    if (isRefiningPlan) {
        setIsRefiningPlan(false);
        handlePlanRefine(userPrompt);
        return;
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
  };

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

  const handleAutoGenerate = async () => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg.question) return;

    const autoAnswer: ClarificationAnswer = {
        questionId: lastMsg.question.id,
        question: lastMsg.question.question,
        answer: "Submit & Generate Plan"
    };

    conversationHistoryRef.current.push({
        type: 'qa',
        question: autoAnswer.question,
        answer: autoAnswer.answer
    });

    updateLastMessage(msg => ({ 
       ...msg, 
       submittedAnswer: autoAnswer 
    }));

    await runGeneration({
        prompt: currentPromptRef.current,
        conversationHistory: conversationHistoryRef.current,
        plannedScreens: plannedScreensRef.current,
        skipToPlanning: true
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
          { id: `page-${firstScreen?.id || '0'}`, label: `Generating page ${firstScreen?.name || 'Unknown'}`, status: 'running' as const }
        ]
      }));

      // Create nodes
      const currentMode = viewModeRef.current;
      const config = getLayoutConfig(currentMode);
      const positions = computeFlowLayout(screens, flows, config);
      const positionMap = new Map(positions.map(p => [p.id, p]));
      
      const newNodes: Node[] = screens.map((screen: PlannedScreen) => {
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
                viewMode: currentMode
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
          designApproved: true
      }, true); // isDesignPhase = true
  };

  const handlePlanRefine = async (feedback: string) => {
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

  useEffect(() => {
     setNodes(nds => nds.map(n => ({
       ...n,
       data: { ...n.data, onExpand: handleExpand, onShowCode: handleShowCode, viewMode }
     })));
  }, [handleExpand, handleShowCode, viewMode, setNodes]);

  const isLastMessageInteractive = () => {
      if (messages.length === 0) return false;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
          if (lastMsg.question && !lastMsg.submittedAnswer) return true;
          if (lastMsg.isPlanReady && !isRefiningPlan) return true;
      }
      return false;
  };

  const isInputDisabled = isLoading || isLastMessageInteractive();

  return (
    <div className="relative h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden">
      <AnimatePresence mode="wait">
        {!hasStarted && (
          <motion.div 
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center p-4 z-20 bg-[#1e1e1e]"
          >
             <div className="max-w-2xl w-full flex flex-col items-center space-y-8">
                <div className="text-center space-y-4">
                   <motion.div 
                     initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
                     animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                     transition={{ delay: 0.1, duration: 0.8 }}
                     className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/30"
                   >
                      <AiPaintbrush size={32} className="text-blue-500" />
                   </motion.div>
                   <motion.h1 
                     initial={{ y: 10, opacity: 0, filter: 'blur(10px)' }}
                     animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                     transition={{ delay: 0.2, duration: 0.8 }}
                     className="text-4xl font-bold text-white tracking-tight"
                   >
                     What are we building today?
                   </motion.h1>
                   <motion.p 
                     initial={{ y: 10, opacity: 0, filter: 'blur(10px)' }}
                     animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                     transition={{ delay: 0.3, duration: 0.8 }}
                     className="text-lg text-zinc-400 max-w-md mx-auto"
                   >
                     Describe your dream app. I will architect the user journey and design every screen in real-time.
                   </motion.p>
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                  animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="w-full relative"
                >
                  <form onSubmit={sendMessage}>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. A marketplace for vintage watches with bidding..."
                      className="w-full bg-[#252526] border border-[#3e3e42] text-sm text-white rounded-xl py-4 pl-5 pr-12 focus:outline-none focus:border-[#007acc] focus:ring-4 focus:ring-[#007acc]/10 transition-all placeholder:text-zinc-600 shadow-2xl"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#007acc] hover:bg-[#0062a3] rounded-lg text-white transition-colors disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="flex gap-4 text-sm text-zinc-500"
                >
                   <span className="flex items-center gap-1"><Play size={12}/> Gemini 3.0 Pro</span>
                   <span className="flex items-center gap-1"><CodeIcon size={12}/> React Flow</span>
                   <span className="flex items-center gap-1"><Terminal size={12}/> Tailwind CSS</span>
                </motion.div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {hasStarted && (
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
              <div className="flex items-center gap-2">
                 <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center text-blue-400">
                   <AiPaintbrush size={14} />
                 </div>
                 <span className="font-semibold text-sm">Draftly</span>
              </div>
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
    
                       {/* Welcome message */}
                       {msg.content === 'Hey ! How can i help you design your app today ?' && (
                         <div className="mb-2 px-4 py-3 bg-[#1e1e1e] rounded-xl border border-[#3e3e42]">
                           <h2 className="text-lg font-semibold text-white tracking-tight flex items-start gap-3 font-sans">
                             <span className="text-xl mt-0.5">👋</span>
                             Hey ! How can I help you design your app today ?
                           </h2>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
    
            <div className="p-4 border-t border-[#3e3e42] bg-[#1e1e1e] shrink-0 w-[400px]">
              <form onSubmit={sendMessage} className="relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onBlur={handleInputBlur}
                  placeholder={isInputDisabled ? "Waiting for response..." : "Reply or refine..."}
                  disabled={isInputDisabled}
                  className={`w-full bg-[#252526] border border-[#3e3e42] text-[12px] text-[#d4d4d4] rounded-lg py-3 pl-4 pr-10 focus:outline-none transition-all placeholder:text-[#52525b]
                     ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-[#007acc]'}
                     ${isRefiningPlan ? 'border-blue-500/50 ring-1 ring-blue-500/20 bg-blue-500/5' : ''}
                  `}
                />
                
                {isLoading ? (
                  <button 
                    type="button"
                    onClick={handleStop}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    disabled={!input.trim() || isInputDisabled}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#858585] hover:text-white transition-colors cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                )}
              </form>
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
                <Background color="#222" gap={40} variant={BackgroundVariant.Lines} size={1} />
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
            </div>
          </motion.div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {modalHtml && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
          {viewMode === 'mobile' ? (
            <div className="relative scale-[0.85] sm:scale-100 transition-transform duration-300">
               <button 
                 onClick={() => setModalHtml(null)} 
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

                  <iframe 
                    srcDoc={modalHtml || ''}
                    className="flex-1 w-full border-none bg-[#09090b]"
                    title="Preview"
                    sandbox="allow-scripts"
                  />
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
                    <span className="text-xs font-medium text-zinc-400">Design Preview</span>
                 </div>
                 <button 
                   onClick={() => setModalHtml(null)} 
                   className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                   title="Close Preview"
                 >
                   <X size={14} />
                 </button>
              </div>
              <div className="flex-1 bg-[#09090b] overflow-hidden relative">
                   <iframe 
                     srcDoc={modalHtml || ''}
                     className="w-full h-full border-none"
                     title="Preview"
                     sandbox="allow-scripts"
                   />
              </div>
            </div>
          )}
        </div>
      )}

      {/* CODE MODAL */}
      {codeModalContent && (
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
      )}

    </div>
  );
}
