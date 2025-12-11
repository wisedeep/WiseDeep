import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CallControlsContainerProps {
  children: ReactNode;
  position?: 'bottom' | 'left' | 'right';
  className?: string;
}

export function CallControlsContainer({
  children,
  position = 'bottom',
  className = '',
}: CallControlsContainerProps) {
  const positionClasses = {
    bottom: 'bottom-4 left-1/2 transform -translate-x-1/2',
    left: 'left-4 top-1/2 transform -translate-y-1/2 flex-col',
    right: 'right-4 top-1/2 transform -translate-y-1/2 flex-col',
  };

  return (
    <div
      className={cn(
        'absolute flex items-center space-x-2 p-3 bg-background/80 backdrop-blur-sm rounded-lg shadow-lg',
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}