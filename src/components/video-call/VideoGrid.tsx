import { VideoTile } from './VideoTile';

interface VideoGridProps {
  participants: Array<{
    id: string;
    name: string;
    stream: MediaStream | null;
    isVideoOn: boolean;
    isAudioOn: boolean;
    isLocal?: boolean;
  }>;
  localParticipant: {
    id: string;
    name: string;
    stream: MediaStream | null;
    isVideoOn: boolean;
    isAudioOn: boolean;
    isLocal: boolean;
  };
  onPinParticipant: (id: string) => void;
  pinnedId: string | null;
  className?: string;
}

export function VideoGrid({
  participants,
  localParticipant,
  onPinParticipant,
  pinnedId,
  className = '',
}: VideoGridProps) {
  // Always include local participant if not already included
  const allParticipants = [localParticipant, ...participants.filter(p => p.id !== localParticipant.id)];

  // Find the pinned participant
  const pinnedParticipant = allParticipants.find(p => p.id === pinnedId) || allParticipants[0];

  // Get other participants (excluding pinned)
  const otherParticipants = allParticipants.filter(p => p.id !== pinnedParticipant?.id);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Main video area - pinned participant or local video */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4 relative">
        {pinnedParticipant ? (
          <VideoTile
            key={pinnedParticipant.id}
            participant={pinnedParticipant}
            isPinned={true}
            onClick={() => onPinParticipant(pinnedParticipant.id)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <p className="text-gray-400">Waiting for participants to join...</p>
          </div>
        )}
      </div>

      {/* Other participants grid */}
      {otherParticipants.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {otherParticipants.map((participant) => (
            <div key={participant.id} className="aspect-video">
              <VideoTile
                participant={participant}
                isPinned={false}
                onClick={() => onPinParticipant(participant.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}