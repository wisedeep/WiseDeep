interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
  socketIds: Set<string>;
  metadata?: Record<string, any>;
}

export class Presence {
  private users: Map<string, UserPresence> = new Map();

  // User comes online
  userConnected(userId: string, socketId: string, metadata?: any) {
    const existing = this.users.get(userId);

    if (existing) {
      // User already has presence, just add socket ID
      existing.socketIds.add(socketId);
      existing.status = 'online';
      existing.lastSeen = Date.now();
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
    } else {
      // New user presence
      this.users.set(userId, {
        userId,
        status: 'online',
        lastSeen: Date.now(),
        socketIds: new Set([socketId]),
        metadata
      });
    }

    return this.getUserPresence(userId);
  }

  // User disconnects
  userDisconnected(socketId: string) {
    for (const [userId, presence] of this.users.entries()) {
      if (presence.socketIds.has(socketId)) {
        presence.socketIds.delete(socketId);

        // If no more sockets for this user, mark as offline
        if (presence.socketIds.size === 0) {
          presence.status = 'offline';
          presence.lastSeen = Date.now();
        }

        return this.getUserPresence(userId);
      }
    }
    return null;
  }

  // Update user status
  updateStatus(userId: string, status: 'online' | 'away' | 'busy') {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      user.lastSeen = Date.now();
      return this.getUserPresence(userId);
    }
    return null;
  }

  // Get user presence
  getUserPresence(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      userId: user.userId,
      status: user.status,
      lastSeen: user.lastSeen,
      metadata: user.metadata
    };
  }

  // Get all online users
  getOnlineUsers() {
    const online: Array<ReturnType<Presence['getUserPresence']>> = [];

    for (const user of this.users.values()) {
      if (user.status !== 'offline') {
        online.push(this.getUserPresence(user.userId));
      }
    }

    return online;
  }
}