import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface CallQualityIndicatorProps {
  connectionQuality: 'good' | 'average' | 'poor' | 'offline';
  className?: string;
}

export function CallQualityIndicator({ connectionQuality, className = '' }: CallQualityIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getQualityInfo = () => {
    switch (connectionQuality) {
      case 'good':
        return {
          icon: <Wifi className="h-4 w-4 text-green-500" />,
          text: 'Good connection',
          description: 'Your call quality is good',
        };
      case 'average':
        return {
          icon: <Wifi className="h-4 w-4 text-yellow-500" />,
          text: 'Average connection',
          description: 'Your call quality may be affected',
        };
      case 'poor':
        return {
          icon: <Wifi className="h-4 w-4 text-red-500" />,
          text: 'Poor connection',
          description: 'Your call quality is poor. Check your internet connection',
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-4 w-4 text-gray-500" />,
          text: 'No connection',
          description: 'You are currently offline',
        };
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          text: 'Unknown',
          description: 'Connection status unknown',
        };
    }
  };

  const quality = getQualityInfo();

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="flex items-center space-x-1 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {quality.icon}
        <span className="text-xs text-muted-foreground">{quality.text}</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg whitespace-nowrap z-50">
          {quality.description}
        </div>
      )}
    </div>
  );
}