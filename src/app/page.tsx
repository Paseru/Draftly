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
  Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Send, Bot, Terminal, Play, X, Code as CodeIcon, Square } from 'lucide-react';
import PreviewNode from '@/components/PreviewNode';
import ProcessSteps, { Step } from '@/components/ProcessSteps';
import ClarificationQuestions, { ClarificationQuestion, ClarificationAnswer } from '@/components/ClarificationQuestions';
import PlanReview from '@/components/PlanReview';
import ThinkingBlock from '@/components/ThinkingBlock';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationTurn } from '@/ai/graph';

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
  question?: ClarificationQuestion | null;
  questionIndex?: number; // Add this
  submittedAnswer?: ClarificationAnswer | null;
  plannedScreens?: PlannedScreen[] | null;
  isPlanReady?: boolean;
};

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes = useMemo(() => ({
    previewNode: PreviewNode as any,
  }), []);

  const [modalHtml, setModalHtml] = useState<string | null>(null);
  const [codeModalContent, setCodeModalContent] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  
  // Persistence states for the flow
  const currentPromptRef = useRef<string>('');
  const conversationHistoryRef = useRef<ConversationTurn[]>([]);
  const plannedScreensRef = useRef<PlannedScreen[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Abort Controller pour le bouton Stop
  const abortControllerRef = useRef<AbortController | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

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
    { role: 'assistant', content: 'Bonjour. Je suis Droid (Gemini 3.0 Pro). Décrivez votre application complète (ex: App de Fitness, SaaS B2B, Réseau Social), et je générerai toute l\'architecture.' }
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
        content: (msg.content || "") + " [Stopped by user]",
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
                        updateLastMessage(msg => ({ ...msg, isThinkingComplete: false })); // Restart thinking for planning
                        return [...steps, { id: 'planning', label: 'Architecting Solution...', status: 'running' }];
                    }

                    if (name === 'planning' && status === 'completed') {
                       updateLastMessage(msg => ({ ...msg, isThinkingComplete: true }));
                       return steps.map(s => s.id === 'planning' ? { ...s, status: 'completed', label: 'Architecture Defined' } : s);
                    }
                    
                    if (name === 'awaiting_approval' && status === 'waiting') {
                        // Just a state marker, no visible step change needed necessarily
                        return steps;
                    }

                    if (name === 'designing' && status === 'started') {
                        return [...steps, { id: 'designing', label: 'Generating Design System', status: 'running' }];
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

              if (event.type === 'plan_ready') {
                 const { plannedScreens } = event.data;
                 plannedScreensRef.current = plannedScreens;
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

                 setNodes(prev => prev.map(node => {
                   if (node.id === screenId) {
                     return {
                       ...node,
                       style: { ...node.style, opacity: 1 },
                       data: {
                         ...node.data,
                         html: `<div class="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse gap-2 bg-zinc-950"><div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><div class="text-xs font-mono font-medium text-zinc-400">Generating UI...</div></div>`
                       }
                     };
                   }
                   return node;
                 }));
              }

              if (event.type === 'code_chunk') {
                 const { screenId, content } = event.data;
                 setNodes(prev => prev.map(node => {
                   if (node.id === screenId) {
                     const currentHtml = node.data.html as string;
                     const isLoader = currentHtml.includes('Generating UI...');
                     return {
                       ...node,
                       data: {
                         ...node.data,
                         html: isLoader ? content : currentHtml + content
                       }
                     };
                   }
                   return node;
                 }));
              }

              if (event.type === 'screen_complete') {
                updateLastMessageSteps(steps => steps.map(s => {
                  if (s.status === 'running' && s.id !== 'designing') {
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
        // Use handlePlanRefine logic
        handlePlanRefine(userPrompt);
        return;
    }

    currentPromptRef.current = userPrompt; 
    
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    
    // Reset context for new conversation
    conversationHistoryRef.current = [];
    plannedScreensRef.current = [];
    
    await runGeneration({ prompt: userPrompt });
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

    // Call generation
    await runGeneration({
        prompt: currentPromptRef.current,
        conversationHistory: conversationHistoryRef.current,
        plannedScreens: plannedScreensRef.current
    });
  };

  const handlePlanApprove = async () => {
      // Lock the plan UI
      updateLastMessage(msg => ({ ...msg, isPlanReady: false }));
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: "Plan approved. Proceed with design." }]);

      // Initialize nodes for the approved plan
      const cols = 3; 
      const screenWidth = 1200; 
      const screenHeight = 900; 
      
      const newNodes: Node[] = plannedScreensRef.current.map((screen: any, index: number) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          return {
          id: screen.id,
          type: 'previewNode',
          draggable: false,
          position: { x: col * screenWidth, y: row * screenHeight },
          data: {
              label: screen.name,
              html: '', 
              onExpand: handleExpand,
              onShowCode: handleShowCode
          },
          style: { opacity: 1, transition: 'opacity 0.5s' }
          };
      });
      setNodes(newNodes);

      // Call API with approval
      await runGeneration({
          prompt: currentPromptRef.current,
          conversationHistory: conversationHistoryRef.current,
          plannedScreens: plannedScreensRef.current,
          designApproved: true
      });
  };

  const handlePlanRefine = async (feedback: string) => {
      // Lock plan UI
      updateLastMessage(msg => ({ ...msg, isPlanReady: false }));

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
          plannedScreens: plannedScreensRef.current,
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
       data: { ...n.data, onExpand: handleExpand, onShowCode: handleShowCode }
     })));
  }, [handleExpand, handleShowCode, setNodes]);


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

  if (!hasStarted) {
    return (
      <div className="flex h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] items-center justify-center p-4">
         <div className="max-w-2xl w-full flex flex-col items-center space-y-8">
            <div className="text-center space-y-4">
               <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/30">
                  <Terminal size={32} className="text-blue-500" />
               </div>
               <h1 className="text-4xl font-bold text-white tracking-tight">What are we building today?</h1>
               <p className="text-lg text-zinc-400 max-w-md mx-auto">
                 Describe your dream app flow. Droid will architect the user journey and design every screen in real-time.
               </p>
            </div>

            <div className="w-full relative">
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
            </div>
            
            <div className="flex gap-4 text-sm text-zinc-500">
               <span className="flex items-center gap-1"><Play size={12}/> Gemini 3.0 Pro</span>
               <span className="flex items-center gap-1"><CodeIcon size={12}/> React Flow</span>
               <span className="flex items-center gap-1"><Terminal size={12}/> Tailwind CSS</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden relative">
      
      {/* LEFT SIDE: CHAT */}
      <div className="w-[400px] min-w-[350px] border-r border-[#3e3e42] flex flex-col bg-[#252526] z-10 shadow-xl">
        <div className="h-14 border-b border-[#3e3e42] flex items-center px-4 justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center text-blue-400">
               <Bot size={14} />
             </div>
             <span className="font-semibold text-sm">Droid Architect</span>
          </div>
          <button onClick={() => setHasStarted(false)} className="text-xs text-zinc-500 hover:text-white cursor-pointer">New Project</button>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[11px] scroll-smooth custom-scrollbar">
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
                   <ThinkingBlock 
                     content={msg.currentThinking || ''} 
                     isComplete={msg.isThinkingComplete} 
                   />

                   {/* Process Steps - Filter out redundant steps */}
                   <ProcessSteps steps={(msg.steps || []).filter(s => 
                      !['Clarification Needed', 'Analysis Complete'].includes(s.label)
                   )} />
                   
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

                   {msg.content && <div className="mt-2 text-zinc-400 px-2 text-[11px]">{msg.content}</div>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#3e3e42] bg-[#1e1e1e]">
          <form onSubmit={sendMessage} className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={handleInputBlur}
              placeholder={isInputDisabled ? "Waiting for response..." : "Reply or refine..."}
              disabled={isInputDisabled}
              className={`w-full bg-[#252526] border border-[#3e3e42] text-[11px] text-[#d4d4d4] rounded-lg py-3 pl-4 pr-10 focus:outline-none transition-all placeholder:text-[#52525b]
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
      </div>

      {/* RIGHT SIDE: GRAPH */}
      <div className="flex-1 relative bg-[#1e1e1e]">
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            colorMode="dark"
            fitView
            className="bg-[#1e1e1e]"
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#222" gap={40} variant={BackgroundVariant.Lines} size={1} />
            <Controls className="bg-[#252526] border-[#3e3e42] text-[#d4d4d4] fill-[#d4d4d4] rounded-md overflow-hidden shadow-xl" />
          </ReactFlow>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {modalHtml && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] w-full h-full rounded-xl border border-[#3e3e42] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
            <div className="h-12 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-4">
               <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-white">Design Preview</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">Interactive</span>
               </div>
               <button 
                 onClick={() => setModalHtml(null)} 
                 className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-all cursor-pointer"
               >
                 <X size={20} />
               </button>
            </div>
            <div className="flex-1 bg-[#09090b] overflow-hidden relative">
                 <iframe 
                   srcDoc={`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script><script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script><style>html,body{height:100%;margin:0;background:#09090b;color:#e4e4e7}</style></head><body>${modalHtml}</body></html>`}
                   className="w-full h-full border-none"
                   title="Preview"
                   sandbox="allow-scripts"
                 />
            </div>
          </div>
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
