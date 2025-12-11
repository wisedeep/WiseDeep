import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Monitor, MonitorOff } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface ScreenShareProps {
  isActive: boolean;
  onStart: (stream: MediaStream) => void;
  onStop: () => void;
  className?: string;
}

export function ScreenShare({ isActive, onStart, onStop, className = '' }: ScreenShareProps) {
  const screenStream = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      screenStream.current = stream;
      onStart(stream);

      toast({
        title: 'Screen sharing started',
        description: 'You are now sharing your screen',
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast({
            title: 'Permission denied',
            description: 'Please allow screen sharing to continue',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to start screen sharing',
            variant: 'destructive',
          });
        }
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    onStop();

    toast({
      title: 'Screen sharing stopped',
      description: 'You have stopped sharing your screen',
    });
  };

  useEffect(() => {
    return () => {
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      onClick={isActive ? stopScreenShare : startScreenShare}
      className={className}
      size="icon"
      aria-label={isActive ? 'Stop screen sharing' : 'Start screen sharing'}
    >
      {isActive ? (
        <MonitorOff className="h-5 w-5" />
      ) : (
        <Monitor className="h-5 w-5" />
      )}
    </Button>
  );
}