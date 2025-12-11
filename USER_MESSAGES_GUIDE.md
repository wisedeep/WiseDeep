# How Users Receive Messages from Counsellors

## Where to Find Messages

### Option 1: Direct URL
Navigate to: **`http://localhost:8083/messages`**

### Option 2: From User Dashboard
1. Login as a **user** (not counsellor or admin)
2. Look at the left sidebar navigation
3. Click on **"Messages"** (icon: 💬)

## Navigation Menu Location

The Messages option appears in the user's sidebar navigation:
- 📅 Dashboard
- 📚 Courses  
- 📅 My Sessions
- **💬 Messages** ← Click here!
- 🧠 AI Chat
- ⚙️ Profile

## What You'll See

### Conversations List (Left Side)
- All counsellors you have sessions with
- Latest message preview
- **Red badge** showing unread message count
- Click any counsellor to open the conversation

### Message Thread (Right Side)
- Full conversation history with selected counsellor
- Messages from counsellor appear on the **left** (gray background)
- Your messages appear on the **right** (blue background)
- Timestamps for each message
- Date separators (Today, Yesterday, etc.)

### Send Messages
- Type in the input box at the bottom
- Press **Enter** or click the **Send button** (📤)
- Toast notification confirms message sent

## Requirements

✅ Must be logged in as a **user**
✅ Must have at least one session booked with a counsellor
✅ Counsellor must have sent you a message OR you can start the conversation

## Troubleshooting

**"No conversations yet"** message?
- You need to book a session with a counsellor first
- Go to "My Sessions" or "Book Session" to schedule

**Can't see Messages option?**
- Make sure you're logged in as a **user** role
- Check you're not logged in as counsellor or admin
- The route is `/messages` (check URL)

## How It Works

1. **Counsellor sends message** → Saved to database
2. **User navigates to `/messages`** → Sees conversation list
3. **User clicks counsellor** → Loads all messages
4. **Messages marked as read** → Unread count clears
5. **User can reply** → Message sent to counsellor
