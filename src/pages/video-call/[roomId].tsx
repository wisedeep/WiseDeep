import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { VideoCall } from '../../components/video-call/VideoCall';
import { useAuth } from '../../components/AuthContext';
import { Loader2 } from 'lucide-react';

export default function VideoCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    const verifyRoomAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/video-call/verify-room`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId,
          }),
        });

        if (!response.ok) {
          throw new Error('You do not have access to this call');
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsLoading(false);
      }
    };

    verifyRoomAccess();
  }, [roomId, user]);

  const handleEndCall = () => {
    // End the call via API
    const token = localStorage.getItem('token');
    fetch(`${process.env.REACT_APP_API_URL}/api/video-call/end-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        roomId,
      }),
    }).catch(console.error);

    navigate('/user/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Joining call...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate('/user/dashboard')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please sign in to join the call</p>
      </div>
    );
  }

  return (
    <VideoCall
      roomId={roomId as string}
      userId={user.id}
      onEndCall={handleEndCall}
    />
  );
}