export interface RoomMetadata {
  name?: string;
  description?: string;
  maxParticipants?: number;
  isPrivate: boolean;
  password?: string;
  createdAt: number;
  createdBy: string;
  settings: {
    allowScreenSharing: boolean;
    allowChat: boolean;
    allowRecording: boolean;
    requireModeratorApproval: boolean;
  };
}

export interface Room extends RoomMetadata {
  id: string;
  participants: Set<string>; // User IDs
  moderators: Set<string>;   // User IDs who can moderate
  createdAt: number;
  updatedAt: number;
}

// Room management class
export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private roomExpiry: Map<string, NodeJS.Timeout> = new Map();
  private readonly ROOM_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

  createRoom(roomId: string, options: Partial<RoomMetadata> & { createdBy: string }): Room {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const defaultMetadata: RoomMetadata = {
      name: `Room ${roomId.slice(0, 8)}`,
      isPrivate: false,
      createdAt: Date.now(),
      createdBy: options.createdBy,
      settings: {
        allowScreenSharing: true,
        allowChat: true,
        allowRecording: true,
        requireModeratorApproval: false,
        ...options.settings
      },
      ...options
    };

    const room: Room = {
      id: roomId,
      ...defaultMetadata,
      participants: new Set([options.createdBy]),
      moderators: new Set([options.createdBy]), // Creator is a moderator by default
      updatedAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.resetRoomExpiry(roomId);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addParticipant(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.participants.add(userId);
    room.updatedAt = Date.now();
    this.resetRoomExpiry(roomId);
    return true;
  }

  removeParticipant(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.participants.delete(userId);
    room.moderators.delete(userId); // Remove from moderators if they were one
    room.updatedAt = Date.now();

    // If room is empty, schedule for cleanup
    if (room.participants.size === 0) {
      this.scheduleRoomCleanup(roomId);
    } else {
      this.resetRoomExpiry(roomId);
    }

    return true;
  }

  private resetRoomExpiry(roomId: string) {
    // Clear existing timeout if any
    const existingTimeout = this.roomExpiry.get(roomId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.cleanupRoom(roomId);
    }, this.ROOM_EXPIRY_TIME);

    this.roomExpiry.set(roomId, timeout);
  }

  private scheduleRoomCleanup(roomId: string) {
    // Give some time before cleaning up an empty room
    const timeout = setTimeout(() => {
      this.cleanupRoom(roomId);
    }, 5 * 60 * 1000); // 5 minutes

    this.roomExpiry.set(roomId, timeout);
  }

  private cleanupRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only clean up if room is empty
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      this.roomExpiry.delete(roomId);
      console.log(`Room ${roomId} has been cleaned up`);
    }
  }

  // Add other room management methods as needed...
}