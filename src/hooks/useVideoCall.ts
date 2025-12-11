import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const useVideoCall = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const initiateCall = useCallback(async (userId: string, userName: string) => {
    try {
      setIsCalling(true);
      setCallError(null);

      const response = await fetch('/api/video-call/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counsellorId: userId,
          // Include user token if needed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create call room');
      }

      const { roomId } = await response.json();
      navigate(`/video-call/${roomId}`);
    } catch (error) {
      console.error('Call failed:', error);
      setCallError(error instanceof Error ? error.message : 'Failed to start call');
      toast({
        title: 'Call Failed',
        description: error instanceof Error ? error.message : 'Could not connect to the counsellor',
        variant: 'destructive',
      });
    } finally {
      setIsCalling(false);
    }
  }, [navigate, toast]);

  return {
    isCalling,
    callError,
    initiateCall,
  };
};