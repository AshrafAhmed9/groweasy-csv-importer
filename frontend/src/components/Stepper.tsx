import { Check } from "lucide-react";

const STEPS = ["Upload", "Preview", "Confirm", "Results"];

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <li key={step} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-brand text-brand-foreground"
                    : isActive
                      ? "border-2 border-brand text-brand"
                      : "border border-border text-foreground-muted"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </div>
              <span className={`hidden text-sm font-medium sm:inline ${isActive ? "text-foreground" : "text-foreground-muted"}`}>
                {step}
              </span>
            </div>
            {stepNum < STEPS.length && <div className="h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
