import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookOpen, Calendar, MessageSquare, NotebookPen, TrendingUp, Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { default as api } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Note {
  _id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/user/notes');
      setNotes(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    // console.log('createNote called with title:', newNoteTitle, 'content:', newNoteContent, 'category:', newNoteCategory);
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.post('/user/notes', {
        title: newNoteTitle,
        content: newNoteContent,
        category: newNoteCategory || undefined,
      });
      // console.log('Note created:', response.data);

      setNotes([response.data, ...notes]);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteCategory("");

      toast({
        title: "Success",
        description: "Note created successfully",
      });
    } catch (error) {
      // console.error('Error creating note:', error);
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await api.delete(`/user/notes/${noteId}`);

      setNotes(notes.filter(note => note._id !== noteId));
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const startEditing = (note: Note) => {
    setEditingNoteId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category || "");
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
  };

  const updateNote = async (noteId: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await api.put(`/user/notes/${noteId}`, {
        title: editTitle,
        content: editContent,
        category: editCategory || undefined,
      });

      // Update the note in the list with the response from server
      setNotes(notes.map(note =>
        note._id === noteId ? response.data : note
      ));

      cancelEditing();
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { icon: <TrendingUp className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Courses", path: "/courses" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "AI Chat", path: "/ai-chat" },
    { icon: <Calendar className="w-5 h-5" />, label: "Book Session", path: "/book-session" },
    { icon: <NotebookPen className="w-5 h-5" />, label: "My Notes", path: "/notes" },
    { icon: <Calendar className="w-5 h-5" />, label: "My Sessions", path: "/my-sessions" },
  ];

  return (
    <DashboardLayout navItems={navItems} userRole="User">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Notes</h1>
            <p className="text-muted-foreground">Track your reflections and insights</p>
          </div>
          <Button className="bg-gradient-saffron hover:shadow-glow" onClick={() => {
            const newNoteCard = document.getElementById('new-note-card');
            newNoteCard?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* New Note Card */}
        <Card className="shadow-medium">
          <CardContent className="p-6 space-y-4">
            <Input
              placeholder="Note Title"
              className="text-lg font-semibold"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your thoughts, reflections, or insights here..."
              className="min-h-[150px] resize-none"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <Input
                placeholder="Category (optional)"
                className="w-48"
                value={newNoteCategory}
                onChange={(e) => setNewNoteCategory(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setNewNoteTitle("");
                  setNewNoteContent("");
                  setNewNoteCategory("");
                }}>Cancel</Button>
                <Button className="bg-gradient-saffron" onClick={createNote}>Save Note</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            <p>Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No notes yet. Create your first note above!</p>
          ) : (
            notes
              .filter(note => note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.category && note.category.toLowerCase().includes(searchTerm.toLowerCase())))
              .map((note) => (
                <Card key={note._id} className="hover-lift">
                  <CardContent className="p-6">
                    {editingNoteId === note._id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <Input
                          placeholder="Note Title"
                          className="text-lg font-semibold"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <Textarea
                          placeholder="Note content..."
                          className="min-h-[150px] resize-none"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Category (optional)"
                            className="w-48"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={cancelEditing}>
                              Cancel
                            </Button>
                            <Button
                              className="bg-gradient-saffron"
                              onClick={() => updateNote(note._id)}
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{note.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              {note.category && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary">{note.category}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(note)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteNote(note._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{note.content}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notes;
