import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface ClarificationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

interface Props {
  questions: ClarificationQuestion[];
  onSubmit?: (answers: ClarificationAnswer[]) => void;
  onAutoGenerate?: () => void; // New prop
  submittedAnswer?: ClarificationAnswer | null;
  startIndex?: number;
}

export default function ClarificationQuestions({ questions, onSubmit, onAutoGenerate, submittedAnswer, startIndex = 1 }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [activeCustom, setActiveCustom] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  const isAnswered = !!submittedAnswer;

  useEffect(() => {
    if (submittedAnswer) {
        setIsExpanded(false);
        const qId = submittedAnswer.questionId;
        const question = questions.find(q => q.id === qId) || questions[0];
        
        if (question) {
             const isOption = question.options.includes(submittedAnswer.answer);
             if (isOption) {
                setAnswers(prev => ({ ...prev, [qId]: submittedAnswer.answer }));
             } else {
                setAnswers(prev => ({ ...prev, [qId]: submittedAnswer.answer }));
                setCustomInputs(prev => ({ ...prev, [qId]: submittedAnswer.answer }));
                setActiveCustom(prev => ({ ...prev, [qId]: true }));
             }
        }
    }
  }, [submittedAnswer, questions]);

  const handleSelect = (qId: string, value: string) => {
    if (isAnswered) return;
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setActiveCustom(prev => ({ ...prev, [qId]: false }));
  };

  const handleCustomToggle = (qId: string) => {
    if (isAnswered) return;
    setActiveCustom(prev => ({ ...prev, [qId]: true }));
    if (customInputs[qId]) {
      setAnswers(prev => ({ ...prev, [qId]: customInputs[qId] }));
    } else {
       setAnswers(prev => {
         const newAnswers = { ...prev };
         delete newAnswers[qId];
         return newAnswers;
       });
    }
  };

  const handleCustomChange = (qId: string, value: string) => {
    if (isAnswered) return;
    setCustomInputs(prev => ({ ...prev, [qId]: value }));
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    if (!onSubmit || isAnswered) return;
    const formattedAnswers: ClarificationAnswer[] = questions.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || customInputs[q.id] || "Skipped"
    }));
    onSubmit(formattedAnswers);
  };

  const allAnswered = questions.every(q => !!answers[q.id]);

  return (
    <div className={cn(
      "w-full max-w-xl border rounded-lg overflow-hidden transition-all duration-200",
      isAnswered ? "bg-[#18181b]/50 border-[#27272a]/50" : "bg-[#18181b] border-[#27272a] shadow-xl"
    )}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className={cn(
          "flex items-center justify-between px-4 py-3 bg-[#202023] transition-colors cursor-pointer hover:bg-[#27272a]",
          isExpanded && "border-b border-[#27272a]"
        )}
      >
         <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
           <span className="text-xs font-medium text-zinc-300 tracking-wide">
             Question {startIndex}
           </span>
         </div>
         <div className="text-zinc-500">
           {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
         </div>
      </div>

      <div 
        className={cn(
           "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
           isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-4 pt-6 space-y-6">
          {questions.map((q) => (
             <div key={q.id} className="space-y-3">
                <p className="text-[13px] text-zinc-200 font-medium leading-relaxed">
                  {q.question}
                </p>
                
                <div className="pl-0 space-y-2">
                    <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => {
                            const isSelected = answers[q.id] === opt && !activeCustom[q.id];
                            return (
                                <button
                                    key={opt}
                                    onClick={() => handleSelect(q.id, opt)}
                                    disabled={isAnswered}
                                    className={cn(
                                        "px-3 py-1.5 rounded text-[11px] transition-all duration-200 border text-left cursor-pointer",
                                        isSelected 
                                            ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                                            : "bg-[#202023] border-[#27272a] text-zinc-400",
                                        !isAnswered && !isSelected && "hover:bg-[#27272a] hover:border-zinc-600 hover:text-zinc-200",
                                        isAnswered && "cursor-default"
                                    )}
                                >
                                    {opt}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handleCustomToggle(q.id)}
                            disabled={isAnswered}
                            className={cn(
                                "px-3 py-1.5 rounded text-[11px] transition-all duration-200 border flex items-center gap-1.5 cursor-pointer",
                                activeCustom[q.id]
                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                    : "bg-[#202023] border-[#27272a] text-zinc-400",
                                !isAnswered && !activeCustom[q.id] && "hover:bg-[#27272a] hover:border-zinc-600 hover:text-zinc-200",
                                isAnswered && "cursor-default"
                            )}
                        >
                            <Edit3 size={10} />
                            Custom
                        </button>
                    </div>

                    {activeCustom[q.id] && (
                        <div className="pt-1">
                            <input
                                type="text"
                                value={customInputs[q.id] || ''}
                                onChange={(e) => handleCustomChange(q.id, e.target.value)}
                                placeholder="Type your specific requirement..."
                                autoFocus={!isAnswered}
                                disabled={isAnswered}
                                className={cn(
                                    "w-full bg-[#121214] border rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 transition-all",
                                    isAnswered ? "border-transparent opacity-80 cursor-default" : "border-[#27272a] focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10"
                                )}
                            />
                        </div>
                    )}
                </div>
             </div>
          ))}

            {!isAnswered && (
                <div className="flex justify-end items-center pt-2 border-t border-[#27272a] mt-4 gap-3">
                    {onAutoGenerate && (
                      <button
                        onClick={onAutoGenerate}
                        disabled={!allAnswered}
                        className={cn(
                          "mt-3 px-3 py-1.5 rounded text-[11px] font-medium border transition-all mr-auto",
                          allAnswered 
                            ? "text-zinc-400 hover:text-zinc-200 bg-[#27272a] hover:bg-[#323236] border-[#3e3e42] cursor-pointer" 
                            : "text-zinc-500 bg-[#27272a] border-transparent cursor-not-allowed"
                        )}
                      >
                        Submit & Generate Plan
                      </button>
                    )}
                    
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className={cn(
                            "mt-3 px-4 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5",
                            allAnswered 
                                ? "bg-zinc-100 hover:bg-white text-zinc-900 shadow-lg shadow-white/5 transform hover:-translate-y-0.5 cursor-pointer" 
                                : "bg-[#27272a] text-zinc-500 cursor-not-allowed border border-transparent"
                        )}
                    >
                        Submit Answer
                        <ChevronRight size={12} />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
