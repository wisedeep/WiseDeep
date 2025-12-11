import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CallTimerProps {
  startTime: Date;
  className?: string;
}

export function CallTimer({ startTime, className = '' }: CallTimerProps) {
  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diffInSeconds / 60).toString().padStart(2, '0');
      const seconds = (diffInSeconds % 60).toString().padStart(2, '0');
      setDuration(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{duration}</span>
    </div>
  );
}