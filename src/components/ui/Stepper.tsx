import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              {/* Circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-emerald-500 text-white',
                  isActive && 'bg-purple-600 text-white',
                  !isCompleted && !isActive && 'bg-gray-200 text-gray-500',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-purple-600' : isCompleted ? 'text-gray-700' : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-[10px] text-gray-400">{step.description}</span>
              )}
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1',
                  i < currentStep ? 'bg-emerald-500' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { Stepper, type StepperProps, type Step };
