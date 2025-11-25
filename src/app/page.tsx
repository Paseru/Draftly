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
import ClarificationQuestions, { ClarificationQuestion, ClarificationAnswer } from '@/components/ClarificationQuestions';
import PlanReview from '@/components/PlanReview';
import ArchitectureReview from '@/components/ArchitectureReview';
import ThinkingBlock from '@/components/ThinkingBlock';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationTurn, ScreenFlow } from '@/ai/graph';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedEdge from '@/components/AnimatedEdge';
import { computeFlowLayout, getLayoutConfig } from '@/lib/layoutUtils';

const initialNodes: Node[] = []; 

interface PlannedScreen {
  id: string;
  name: string;
  description: string;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  steps?: Step[]; 
  currentThinking?: string;
  isThinkingComplete?: boolean;
  isInClarificationPhase?: boolean;
  question?: ClarificationQuestion | null;
  questionIndex?: number;
  submittedAnswer?: ClarificationAnswer | null;
  plannedScreens?: PlannedScreen[] | null;
  isPlanReady?: boolean;
  approvedArchitecture?: PlannedScreen[] | null;
  previousArchitectures?: PlannedScreen[][];
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
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

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  
  // Abort Controller pour le bouton Stop
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // ReactFlow instance pour le focus
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  const recalculateLayout = useCallback((mode: 'desktop' | 'mobile', currentNodes: Node[], flows?: ScreenFlow[]) => {
    const config = getLayoutConfig(mode);
    const screens = plannedScreensRef.current;
    const flowsToUse = flows || plannedFlowsRef.current;
    
    // Use flow-based layout if we have flows
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
    
    // Fallback to grid layout
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
    
    // Fit view after transition (allow some time for nodes to resize/move)
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

  const updateLastMessageSteps = (updater: (steps: Step[]) => Step[]) => {
    updateLastMessage(msg => ({
      ...msg,
      steps: updater(msg.steps || [])
    }));
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
        content: (msg.content || "") + " Paused",
        steps: msg.steps?.map(s => s.status === 'running' ? { ...s, status: 'completed', label: s.label + ' (Stopped)' } : s),
        isThinkingComplete: true
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runGeneration = async (payload: any) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setHasStarted(true);
    abortControllerRef.current = new AbortController();

    // Always start with a thinking/processing step if not already present
    const initialStep: Step = { id: 'processing', label: 'Processing...', status: 'running' };

    // Append new assistant message if we are starting a NEW turn (not refining existing)
    // NOTE: For this flow, we assume we append a new message for every user interaction, 
    // but if we are just continuing a stream (like after a question), we might want to append.
    // For simplicity: Always append a new Assistant block when runGeneration is called.
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      currentThinking: '',
      isThinkingComplete: false,
      steps: [initialStep] 
    }]);

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
              
              if (event.type === 'thought') {
                updateLastMessage(msg => ({
                  ...msg,
                  currentThinking: (msg.currentThinking || '') + event.data
                }));
              }

              if (event.type === 'step') {
                 const { name, status, screenName, screenIndex, totalScreens } = event.data;
                 updateLastMessageSteps(steps => {
                    // Remove initial processing step
                    if (name !== 'processing' && steps.some(s => s.id === 'processing')) {
                       steps = steps.filter(s => s.id !== 'processing');
                    }

                    if (name === 'clarifying' && status === 'started') {
                        updateLastMessage(msg => ({ ...msg, isInClarificationPhase: true }));
                        if (!steps.find(s => s.id === 'clarifying')) {
                            return [...steps, { id: 'clarifying', label: 'Thinking', status: 'running' }];
                        }
                    }
                    
                    if (name === 'clarifying' && status === 'waiting') {
                       // Waiting for user input
                       return steps.map(s => s.id === 'clarifying' ? { ...s, status: 'completed', label: 'Clarification Needed' } : s);
                    }

                    if (name === 'clarifying' && status === 'completed') {
                       return steps.map(s => s.id === 'clarifying' ? { ...s, status: 'completed', label: 'Analysis Complete' } : s);
                    }

                    if ((name === 'planning' || name === 'replanning') && status === 'started') {
                        updateLastMessage(msg => ({ ...msg, isInClarificationPhase: false, isThinkingComplete: false }));
                        // Pas de step visible pour le planning - ThinkingBlock gère l'affichage
                        // Si replanning, on garde les steps existants (l'architecture sera renommée au designing)
                        return steps;
                    }

                    if (name === 'planning' && status === 'completed') {
                       updateLastMessage(msg => ({ ...msg, isThinkingComplete: true }));
                       // Pas de changement de steps - on attend l'approbation
                       return steps;
                    }
                    
                    if (name === 'awaiting_approval' && status === 'waiting') {
                        return steps;
                    }

                    if (name === 'designing' && status === 'started') {
                        // Stocker l'architecture approuvée dans le message
                        const approvedScreens = [...plannedScreensRef.current];
                        
                        // Si une architecture existe déjà, la renommer en "Previous architecture"
                        const updatedSteps = steps.map(s => 
                           s.label === 'Architecture Defined' 
                              ? { ...s, label: 'Previous architecture', status: 'modified' as const }
                              : s
                        );
                        
                        // Stocker l'architecture dans le message pour le rendu
                        updateLastMessage(msg => ({ 
                          ...msg, 
                          approvedArchitecture: approvedScreens,
                          previousArchitectures: msg.approvedArchitecture 
                            ? [...(msg.previousArchitectures || []), msg.approvedArchitecture]
                            : msg.previousArchitectures
                        }));
                        
                        return [
                          ...updatedSteps, 
                          { id: 'designing', label: 'Generating Design System', status: 'running' }
                        ];
                    }
                    
                    if (name === 'designing_screen' && status === 'started') {
                       const existingStep = steps.find(s => s.label.includes(screenName));
                       if (existingStep) return steps;
                       
                       const progressLabel = totalScreens ? ` (${screenIndex + 1}/${totalScreens})` : '';
                       return [...steps, { 
                         id: `screen-${screenName}-${Date.now()}`, 
                         label: `Designing ${screenName}${progressLabel}`,
                         status: 'running'
                       }];
                    }
                    return steps;
                 });
              }

              if (event.type === 'clarification_question') {
                 const question = event.data;
                 // Calculate index: existing history questions + 1
                 const qIndex = conversationHistoryRef.current.filter(t => t.type === 'qa').length + 1;
                 updateLastMessage(msg => ({ ...msg, question, questionIndex: qIndex, isThinkingComplete: true }));
              }

              if (event.type === 'plan') {
                plannedScreensRef.current = event.data;
              }

              if (event.type === 'flows') {
                plannedFlowsRef.current = event.data;
              }

              if (event.type === 'plan_ready') {
                 const { plannedScreens, plannedFlows } = event.data;
                 plannedScreensRef.current = plannedScreens;
                 plannedFlowsRef.current = plannedFlows || [];
                 updateLastMessage(msg => ({ 
                    ...msg, 
                    plannedScreens, 
                    isPlanReady: true, 
                    isThinkingComplete: true 
                 }));
              }

              if (event.type === 'screen_start') {
                 const { screenId } = event.data;
                 
                 updateLastMessageSteps(steps => {
                    const lastRunning = steps.find(s => s.status === 'running');
                    // Close previous screen step if exists
                    if (lastRunning && !lastRunning.label.includes(screenId) && lastRunning.id !== 'designing') {
                       return steps.map(s => s.id === lastRunning.id ? { ...s, status: 'completed' } : s);
                    }
                    return steps;
                 });

                 // Focus sur le node qui commence à se générer
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

              if (event.type === 'screen_complete') {
                const { screenIndex } = event.data;
                updateLastMessageSteps(steps => steps.map(s => {
                  // Marquer le screen actuel comme completed
                  if (s.status === 'running' && s.id !== 'designing') {
                    return { ...s, status: 'completed' };
                  }
                  // Marquer "Generating Design System" comme completed après le premier écran
                  if (s.id === 'designing' && screenIndex === 0) {
                    return { ...s, status: 'completed' };
                  }
                  return s;
                }));
              }

              if (event.type === 'done') {
                updateLastMessageSteps(steps => steps.map(s => ({ ...s, status: 'completed' })));
                updateLastMessage(msg => ({ ...msg, isThinkingComplete: true }));
              }

            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
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

    // Handling Refinement
    if (isRefiningPlan) {
        setIsRefiningPlan(false);
        handlePlanRefine(userPrompt);
        return;
    }

    // Check if we're in an active conversation (has answered questions or has a plan)
    const isActiveConversation = conversationHistoryRef.current.length > 0 || plannedScreensRef.current.length > 0;

    if (isActiveConversation) {
      // Continue conversation - add as feedback and trigger planning
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
      // New conversation
      currentPromptRef.current = userPrompt;
      setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
      conversationHistoryRef.current = [];
      plannedScreensRef.current = [];
      await runGeneration({ prompt: userPrompt });
    }
  };

  const handleClarificationSubmit = async (answers: ClarificationAnswer[]) => {
     // Add answer to history
     const answer = answers[0]; // We assume 1 question at a time now
     conversationHistoryRef.current.push({
         type: 'qa',
         question: answer.question,
         answer: answer.answer
     });

     // Update Last Message: KEEP question, ADD submittedAnswer
     updateLastMessage(msg => ({ 
        ...msg, 
        submittedAnswer: answer 
     }));
     
     // NO NEW USER MESSAGE HERE
     // setMessages(prev => [...prev, { role: 'user', content: `${answer.answer}` }]);

     // Continue generation
     await runGeneration({
         prompt: currentPromptRef.current,
         conversationHistory: conversationHistoryRef.current,
         plannedScreens: plannedScreensRef.current
     });
  };

  const handleAutoGenerate = async () => {
    // Auto generate plan logic: skip question by sending "Auto-generate" as answer
    // Or trigger a specific intent if backend supports it.
    // For now, we simulate "Auto-generate" which the backend likely handles or we treat as "Skip".
    
    // We add a dummy answer to history to close the loop
    // Note: In a real flow we might want to mark this as 'skipped' or 'auto'
    // But to keep UI consistent (submittedAnswer), we'll use a special value.
    
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

    // Call generation with skipToPlanning to go directly to architect
    await runGeneration({
        prompt: currentPromptRef.current,
        conversationHistory: conversationHistoryRef.current,
        plannedScreens: plannedScreensRef.current,
        skipToPlanning: true
    });
  };

  const handlePlanApprove = async () => {
      // Lock the plan UI
      updateLastMessage(msg => ({ ...msg, isPlanReady: false }));
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: "Plan approved. Proceed with design." }]);

      // Initialize nodes for the approved plan with flow-based layout
      const currentMode = viewModeRef.current;
      const config = getLayoutConfig(currentMode);
      const screens = plannedScreensRef.current;
      const flows = plannedFlowsRef.current;
      
      // Calculate positions using flow layout
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

      // Create edges from flows
      const newEdges: Edge[] = flows.map((flow: ScreenFlow) => ({
        id: flow.id,
        source: flow.from,
        target: flow.to,
        type: 'animatedEdge',
        data: { label: flow.label },
      }));
      setEdges(newEdges);

      // Call API with approval
      await runGeneration({
          prompt: currentPromptRef.current,
          conversationHistory: conversationHistoryRef.current,
          plannedScreens: plannedScreensRef.current,
          plannedFlows: plannedFlowsRef.current,
          designApproved: true
      });
  };

  const handlePlanRefine = async (feedback: string) => {
      // Sauvegarder l'architecture actuelle avant de lock
      const currentPlan = [...plannedScreensRef.current];
      
      // Lock plan UI et sauvegarder l'ancien plan comme "previous"
      updateLastMessage(msg => ({ 
        ...msg, 
        isPlanReady: false,
        previousArchitectures: msg.plannedScreens 
          ? [...(msg.previousArchitectures || []), msg.plannedScreens]
          : msg.previousArchitectures,
        plannedScreens: null
      }));

      // Add feedback to history
      conversationHistoryRef.current.push({
          type: 'plan_feedback',
          feedback: feedback
      });

      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: `Changes requested: ${feedback}` }]);

      // Call API with feedback
      await runGeneration({
          prompt: currentPromptRef.current,
          conversationHistory: conversationHistoryRef.current,
          plannedScreens: currentPlan,
          planFeedback: feedback
      });
  };

  // Handler called when "Refine Plan" button is clicked in the PlanReview component
  const handleRequestRefine = () => {
      setIsRefiningPlan(true);
      if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.placeholder = "Describe the changes you want to make to the plan...";
      }
  };

  // Clear refining state on blur if empty
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


  // Helper to determine if input should be disabled
  const isLastMessageInteractive = () => {
      if (messages.length === 0) return false;
      const lastMsg = messages[messages.length - 1];
      // If there is a question visible (not answered) OR plan is ready (waiting for approve/refine)
      // AND we are not currently in refining mode
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
      
      {/* MAIN VIEW */}
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
                       {/* Thinking Block - shows internal process content */}
                       <ThinkingBlock 
                         content={msg.currentThinking || ''} 
                         isComplete={msg.isThinkingComplete}
                         showWaiting={isLoading && idx === messages.length - 1 && !msg.isThinkingComplete && !msg.isInClarificationPhase}
                       />
                       
                       {/* Clarification Question (Single or Answered) */}
                       {msg.question && (
                          <ClarificationQuestions 
                            questions={[msg.question]} 
                            onSubmit={handleClarificationSubmit} 
                            onAutoGenerate={!msg.submittedAnswer ? handleAutoGenerate : undefined}
                            submittedAnswer={msg.submittedAnswer}
                            startIndex={msg.questionIndex || 1}
                          />
                       )}
    
                       {/* Plan Review (Interactive) */}
                       {msg.isPlanReady && msg.plannedScreens && (
                          <PlanReview 
                            screens={msg.plannedScreens}
                            onApprove={handlePlanApprove}
                            onRequestRefine={handleRequestRefine}
                          />
                       )}
    
                       {/* Previous Architectures (if any iterations) */}
                       {msg.previousArchitectures && msg.previousArchitectures.map((arch, idx) => (
                          <ArchitectureReview 
                            key={`prev-arch-${idx}`}
                            screens={arch}
                            label="Previous architecture"
                            isPrevious={true}
                          />
                       ))}
    
                       {/* Current Approved Architecture - BEFORE ProcessSteps */}
                       {msg.approvedArchitecture && !msg.isPlanReady && (
                          <ArchitectureReview 
                            screens={msg.approvedArchitecture}
                            label="Architecture Defined"
                            isPrevious={false}
                          />
                       )}
    
                       {/* Process Steps - Filter out redundant steps */}
                       <ProcessSteps 
                         steps={(msg.steps || []).filter(s => 
                            !['Clarification Needed', 'Analysis Complete'].includes(s.label)
                         )} 
                         hasThinkingContent={!!(msg.currentThinking && msg.currentThinking.trim().length > 0 && !msg.isThinkingComplete)}
                       />
    
                       {msg.content && (
                         msg.content === 'Hey ! How can i help you design your app today ?' ? (
                           <div className="mb-2 px-4 py-3 bg-[#1e1e1e] rounded-xl border border-[#3e3e42]">
                             <h2 className="text-lg font-semibold text-white tracking-tight flex items-start gap-3 font-sans">
                               <span className="text-xl mt-0.5">👋</span>
                               Hey ! How can I help you design your app today ?
                             </h2>
                           </div>
                         ) : (
                           <div className="mt-2 text-zinc-400 px-2 text-[11px] whitespace-pre-wrap">{msg.content}</div>
                         )
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
            {/* Reopen Sidebar Button */}
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
              
              {/* View Mode Toggle */}
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

      {/* PREVIEW MODAL - Full screen */}
      {modalHtml && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
          {viewMode === 'mobile' ? (
            <div className="relative scale-[0.85] sm:scale-100 transition-transform duration-300">
               {/* Floating Close Button for Mobile View */}
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
                  {/* Hardware Buttons */}
                  <div className="absolute top-[120px] -left-[16px] w-[4px] h-[26px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                  <div className="absolute top-[170px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                  <div className="absolute top-[240px] -left-[16px] w-[4px] h-[50px] bg-[#2a2a2a] rounded-l-[2px]"></div>
                  <div className="absolute top-[190px] -right-[16px] w-[4px] h-[80px] bg-[#2a2a2a] rounded-r-[2px]"></div>

                  {/* Status Bar */}
                  <div className="w-full h-[54px] px-7 flex justify-between items-center z-40 text-white pointer-events-none bg-black shrink-0 relative">
                     <span className="font-semibold text-[15px] tracking-wide pl-1">9:41</span>
                     
                     {/* Dynamic Island */}
                     <div className="absolute left-1/2 -translate-x-1/2 top-[11px] w-[120px] h-[35px] bg-[#1a1a1a] rounded-[20px] z-50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#0f0f0f]/50 ml-auto mr-3"></div>
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
