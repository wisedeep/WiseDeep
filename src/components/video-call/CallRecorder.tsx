import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Circle, Square } from 'lucide-react';
import { useToast } from '../ui/use-toast';

interface CallRecorderProps {
  stream: MediaStream | null;
  onRecordingComplete: (blob: Blob) => void;
  className?: string;
}

export function CallRecorder({ stream, onRecordingComplete, className = '' }: CallRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = () => {
    if (!stream) {
      toast({
        title: 'Error',
        description: 'No stream available for recording',
        variant: 'destructive',
      });
      return;
    }

    try {
      recordedChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        onRecordingComplete(blob);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: 'Recording started',
        description: 'Your call is now being recorded',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast({
        title: 'Recording stopped',
        description: 'Your call recording has been saved',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isRecording ? (
        <>
          <Button
            variant="destructive"
            onClick={stopRecording}
            className="flex items-center space-x-2"
          >
            <Square className="h-4 w-4" />
            <span>Stop Recording</span>
          </Button>
          <div className="text-sm text-red-600 font-medium">
            {formatTime(recordingTime)}
          </div>
        </>
      ) : (
        <Button
          variant="outline"
          onClick={startRecording}
          className="flex items-center space-x-2"
        >
          <Circle className="h-4 w-4 text-red-500 fill-red-500" />
          <span>Record Call</span>
        </Button>
      )}
    </div>
  );
}