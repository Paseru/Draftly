import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Edit3, HelpCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

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
  onAutoGenerate?: (answers: ClarificationAnswer[]) => void;
  submittedAnswer?: ClarificationAnswer | null;
  startIndex?: number;
  // Edit mode props
  onEdit?: () => void;
  isEditing?: boolean;
  onConfirmEdit?: (answer: ClarificationAnswer) => void;
  disabled?: boolean; // Disable editing (e.g., during generation)
}

export default function ClarificationQuestions({
  questions,
  onSubmit,
  onAutoGenerate,
  submittedAnswer,
  startIndex = 1,
  onEdit,
  isEditing,
  onConfirmEdit,
  disabled
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [activeCustom, setActiveCustom] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // In edit mode, treat as not answered so user can change selection
  const isAnswered = !!submittedAnswer && !isEditing;

  useEffect(() => {
    if (submittedAnswer && !isEditing) {
      requestAnimationFrame(() => {
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
      });
    }
  }, [submittedAnswer, questions, isEditing]);

  // Expand when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setIsExpanded(true);
    }
  }, [isEditing]);

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

  const handleAutoGenerateClick = () => {
    if (!onAutoGenerate || isAnswered) return;
    const formattedAnswers: ClarificationAnswer[] = questions.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || customInputs[q.id] || "Skipped"
    }));
    onAutoGenerate(formattedAnswers);
  };

  const handleConfirmEditClick = () => {
    if (!onConfirmEdit || !isEditing) return;
    const q = questions[0];
    const answer: ClarificationAnswer = {
      questionId: q.id,
      question: q.question,
      answer: answers[q.id] || customInputs[q.id] || "Skipped"
    };
    onConfirmEdit(answer);
  };

  const allAnswered = questions.every(q => !!answers[q.id]);

  return (
    <div
      className="w-full max-w-xl bg-[#1e1e1e] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-200 group/question"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 transition-colors cursor-pointer hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          {isAnswered || (submittedAnswer && !isEditing) ? (
            <HelpCircle size={14} className="text-blue-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
          <span className={`text-xs font-medium tracking-wide ${isAnswered || (submittedAnswer && !isEditing) ? 'text-zinc-500' : 'text-white'}`}>
            Question {startIndex}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit button - always rendered to preserve space, visibility controlled by opacity */}
          {submittedAnswer && !isEditing && onEdit && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={cn(
                "p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer",
                isHovered ? "opacity-100" : "opacity-0"
              )}
              title="Edit this answer"
            >
              <Pencil size={12} />
            </button>
          )}
          <div className="text-zinc-500">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-4 pt-6 space-y-6 border-t border-[#27272a] bg-[#181818]">
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
                        <span className="markdown-option">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <>{children}</>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                            {opt}
                          </ReactMarkdown>
                        </span>
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
                        "w-full bg-[#121214] border rounded px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 transition-all",
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
              {/* Hide "Skip to Design" in edit mode */}
              {onAutoGenerate && !isEditing && (
                <button
                  onClick={handleAutoGenerateClick}
                  disabled={!allAnswered}
                  className={cn(
                    "mt-3 px-3 py-1.5 rounded text-[11px] font-medium border transition-all mr-auto",
                    allAnswered
                      ? "text-zinc-400 hover:text-zinc-200 bg-[#27272a] hover:bg-[#323236] border-[#3e3e42] cursor-pointer"
                      : "text-zinc-500 bg-[#27272a] border-transparent cursor-not-allowed"
                  )}
                >
                  Submit & Skip to Design
                </button>
              )}

              <button
                onClick={isEditing ? handleConfirmEditClick : handleSubmit}
                disabled={!allAnswered}
                className={cn(
                  "mt-3 px-4 py-1.5 rounded text-[11px] font-medium transition-all flex items-center gap-1.5",
                  allAnswered
                    ? "bg-zinc-100 hover:bg-white text-zinc-900 shadow-lg shadow-white/5 transform hover:-translate-y-0.5 cursor-pointer"
                    : "bg-[#27272a] text-zinc-500 cursor-not-allowed border border-transparent"
                )}
              >
                {isEditing ? 'Confirm Edit' : 'Submit Answer'}
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
