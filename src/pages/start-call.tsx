import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function StartCallPage() {
  const [counsellorEmail, setCounsellorEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleStartCall = async () => {
    if (!counsellorEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a counsellor email',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/video-call/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          counsellorEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const { roomId } = await response.json();
      navigate(`/video-call/${roomId}`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start video call. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Start a Video Call</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="counsellor-email" className="block text-sm font-medium mb-1">
            Counsellor Email
          </label>
          <Input
            id="counsellor-email"
            type="email"
            value={counsellorEmail}
            onChange={(e) => setCounsellorEmail(e.target.value)}
            placeholder="Enter counsellor's email"
          />
        </div>

        <Button
          onClick={handleStartCall}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Call...
            </>
          ) : (
            'Start Video Call'
          )}
        </Button>
      </div>
    </div>
  );
}