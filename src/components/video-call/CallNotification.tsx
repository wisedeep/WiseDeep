import { useEffect } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import { Phone, PhoneOff } from 'lucide-react';

interface CallNotificationProps {
  onAccept: () => void;
  onReject: () => void;
  callerName: string;
  roomId: string;
}

export function CallNotification({ onAccept, onReject, callerName, roomId }: CallNotificationProps) {
  const { toast } = useToast();

  useEffect(() => {
    // Auto-reject after 30 seconds
    const timer = setTimeout(() => {
      onReject();
      toast({
        title: 'Missed Call',
        description: `You missed a call from ${callerName}`,
      });
    }, 30000); // 30 seconds to answer

    return () => clearTimeout(timer);
  }, [callerName, onReject, toast]);

  const handleAccept = () => {
    onAccept();
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg z-50 overflow-hidden border">
      <div className="bg-primary p-4 text-white">
        <div className="flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Incoming Video Call</h3>
            <p className="text-sm opacity-90">{callerName} is calling...</p>
          </div>
        </div>
      </div>
      <div className="p-4 flex justify-between space-x-2">
        <Button
          variant="outline"
          onClick={onReject}
          className="flex-1 bg-red-500 text-white hover:bg-red-600"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          Reject
        </Button>
        <Button
          onClick={handleAccept}
          className="flex-1 bg-green-500 text-white hover:bg-green-600"
        >
          <Phone className="h-4 w-4 mr-2" />
          Accept
        </Button>
      </div>
    </div>
  );
}