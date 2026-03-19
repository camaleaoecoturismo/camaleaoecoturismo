import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Flag } from 'lucide-react';
interface TrilhaProgressBarProps {
  currentStep: number;
  totalSteps: number;
  isComplete?: boolean;
  stepNames?: string[];
}
export function TrilhaProgressBar({
  currentStep,
  totalSteps,
  isComplete = false,
  stepNames = ['Dados Pessoais', 'Informações da Viagem', 'Confirmação']
}: TrilhaProgressBarProps) {
  // Calculate position based on step (0%, 50%, 100% for 3 steps)
  const getStepPosition = (step: number) => {
    if (totalSteps === 1) return 50;
    return (step - 1) / (totalSteps - 1) * 100;
  };
  const currentPosition = isComplete ? 100 : getStepPosition(currentStep);
  return <div className="w-full mb-6 py-0 px-[60px]">
      <div className="relative">
        {/* Simple progress trail */}
        <div className="relative h-12 mb-4">
          {/* Background trail line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted rounded-full transform -translate-y-1/2 px-0 py-[3px] my-[39px]"></div>
          
          {/* Progress line */}
          <div style={{
          width: `${currentPosition}%`
        }} className="absolute top-1/2 left-0 h-1 bg-primary rounded-full transform -translate-y-1/2 transition-all duration-500 ease-out my-[27px]"></div>
          
          {/* Animated camaleão */}
          <motion.div className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2" initial={{
          left: `${getStepPosition(1)}%`
        }} animate={{
          left: `${currentPosition}%`,
          scale: isComplete ? [1, 1.1, 1] : 1
        }} transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          duration: 0.5
        }}>
            <div className="relative">
              {/* Camaleão shadow */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-black/20 rounded-full blur-sm"></div>
              
              {/* Camaleão Character */}
              <motion.img src="/lovable-uploads/74b9aa45-a4f7-43db-a760-aeed79eb9da7.png" alt="Camaleão Trilheiro" className="w-10 h-10 object-contain" animate={{
              y: [-1, 1, -1]
            }} transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut"
            }} />
            </div>
          </motion.div>
        </div>
        
        {/* Step indicators - subtle numbered circles */}
        <div className="relative flex justify-between items-center mb-2">
          {Array.from({
          length: totalSteps
        }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep || isComplete;
          const isCurrent = stepNumber === currentStep && !isComplete;
          const position = index / (totalSteps - 1) * 100;
          return <motion.div key={stepNumber} className="absolute flex flex-col items-center" style={{
            left: `${position}%`,
            transform: 'translateX(-50%)'
          }} initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            delay: index * 0.1
          }}>
                {/* Subtle step indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${isCompleted ? 'bg-primary/20 text-primary border border-primary/30' : isCurrent ? 'bg-primary text-white border border-primary' : 'bg-muted text-muted-foreground border border-muted'}`}>
                  {isCompleted ? <CheckCircle className="w-3 h-3" /> : stepNumber}
                </div>
                
                {/* Step name - só aparece quando é o passo atual */}
                {isCurrent && (
                  <span className={`text-xs mt-1 text-center whitespace-nowrap text-primary`}>
                    {stepNames[index]}
                  </span>
                )}
              </motion.div>;
        })}
        </div>
        
        {/* Completion message */}
        <AnimatePresence>
          {isComplete && <motion.div className="text-center py-2" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }} transition={{
          type: "spring",
          stiffness: 200
        }}>
              <motion.div className="inline-flex items-center gap-2 text-green-700 font-semibold" animate={{
            scale: [1, 1.05, 1]
          }} transition={{
            repeat: 3,
            duration: 0.6
          }}>
                <Flag className="w-5 h-5 text-green-600" />
                🎉 Trilha completa! Reserva realizada com sucesso! 🎉
                <Flag className="w-5 h-5 text-green-600" />
              </motion.div>
            </motion.div>}
        </AnimatePresence>
      </div>
    </div>;
}