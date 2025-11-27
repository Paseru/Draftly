import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export type StepStatus = 'running' | 'completed';

export type Step = {
  id: string;
  label: string;
  status: StepStatus;
};

interface ProcessStepsProps {
  steps: Step[];
}

export default function ProcessSteps({ steps }: ProcessStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div 
          key={step.id} 
          className="bg-[#1e1e1e] rounded-xl border border-[#27272a] overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 py-3">
            {step.status === 'completed' ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Loader2 size={14} className="text-blue-400 animate-spin" />
            )}
            <span className={`text-xs font-medium ${
              step.status === 'completed' ? 'text-zinc-500' : 'text-white'
            }`}>
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
