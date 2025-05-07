import React, { useState, useEffect } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'http://localhost:8080/api';

const TeamMemberCard = ({ item, onAddNote, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(item.id, newNote);
      setNewNote('');
      setShowNoteInput(false);
    }
  };

  return (
    <div className="team-member-card" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="card-header">
        <div className="member-info">
          <h3>{item.name}</h3>
          <p className="role">{item.role}</p>
          <p className="email">{item.email}</p>
        </div>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">AI Ready</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="card-content" onClick={e => e.stopPropagation()}>
          <div className="notes-section">
            <h4>Performance Notes</h4>
            {item.notes && item.notes.length > 0 ? (
              <div className="notes-list">
                {item.notes.map(note => (
                  <div key={note.id} className="note">
                    <p>{note.text}</p>
                    <small>{new Date(note.timestamp).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-notes">No notes yet</p>
            )}
            
            <div className="notes-actions">
              {!showNoteInput ? (
                <button 
                  className="add-note-btn"
                  onClick={() => setShowNoteInput(true)}
                >
                  <i className="material-icons">add</i>
                  Add Note
                </button>
              ) : (
                <form onSubmit={handleAddNote} className="note-form">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter your note..."
                    rows="3"
                  />
                  <div className="note-form-actions">
                    <button type="submit" className="save-note-btn">
                      <i className="material-icons">check</i>
                      Save
                    </button>
                    <button 
                      type="button" 
                      className="cancel-note-btn"
                      onClick={() => {
                        setShowNoteInput(false);
                        setNewNote('');
                      }}
                    >
                      <i className="material-icons">close</i>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          
          <button 
            className="delete-btn"
            onClick={() => onDelete(item.id)}
          >
            <i className="material-icons">delete</i>
            Delete Member
          </button>
        </div>
      )}
    </div>
  );
};

const MeetingTranscriptionForm = ({ onProcessTranscription }) => {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcription.trim()) {
      setError('Please enter a meeting transcription');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const response = await fetch('http://localhost:8080/api/process-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcription }),
      });

      if (!response.ok) {
        throw new Error('Failed to process transcription');
      }

      const result = await response.json();
      setTranscription('');
      onProcessTranscription(result);
    } catch (error) {
      setError('Failed to process transcription. Please try again.');
      console.error('Error processing transcription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="transcription-form">
      <h2 className="form-title">
        <i className="material-icons">mic</i>
        Process Meeting Transcription
      </h2>
      
      {error && (
        <div className="error-message">
          <i className="material-icons">error</i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Meeting Transcription</label>
          <textarea
            className="input"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Paste the meeting transcription here..."
            rows="6"
          />
        </div>

        <button 
          className="submit-button"
          type="submit"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <i className="material-icons">sync</i>
              Processing...
            </>
          ) : (
            <>
              <i className="material-icons">send</i>
              Process Transcription
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const TeamDashboard = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    email: '',
    notes: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/team-members`);
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      // Ensure each member has a notes array
      const membersWithNotes = data.map(member => ({
        ...member,
        notes: member.notes || []
      }));
      setTeamMembers(membersWithNotes);
    } catch (error) {
      setError('Failed to load team members. Please try again later.');
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.role || !newMember.email) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError(null);
      const memberToAdd = {
        id: uuidv4(),
        ...newMember,
        notes: []
      };

      const response = await fetch(`${API_BASE_URL}/team-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberToAdd),
      });

      if (!response.ok) {
        throw new Error('Failed to add team member');
      }

      const addedMember = await response.json();
      setTeamMembers(prevMembers => [...prevMembers, addedMember]);
      setNewMember({ name: '', role: '', email: '', notes: [] });
      setShowForm(false);
    } catch (error) {
      setError('Failed to add team member. Please try again.');
      console.error('Error adding team member:', error);
    }
  };

  const handleAddNote = async (memberId, noteText) => {
    try {
      setError(null);
      const newNote = {
        id: uuidv4(),
        text: noteText,
        timestamp: new Date()
      };

      const response = await fetch(`${API_BASE_URL}/team-members/${memberId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        const updatedMember = await response.json();
        setTeamMembers(teamMembers.map(member => 
          member.id === memberId ? updatedMember : member
        ));
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      setError('Failed to add note. Please try again.');
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/team-members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTeamMembers(teamMembers.filter(member => member.id !== memberId));
      } else {
        throw new Error('Failed to delete team member');
      }
    } catch (error) {
      setError('Failed to delete team member. Please try again.');
      console.error('Error deleting team member:', error);
    }
  };

  const handleProcessTranscription = (result) => {
    // Refresh team members to show new notes
    fetchTeamMembers();
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">
            <i className="material-icons">psychology</i>
            AI-Powered Team Dashboard
          </h1>
          <p className="header-subtitle">Track and analyze team performance with AI insights</p>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <i className="material-icons">error</i>
          {error}
        </div>
      )}

      <MeetingTranscriptionForm onProcessTranscription={handleProcessTranscription} />

      {isLoading ? (
        <div className="loading">
          <i className="material-icons">sync</i>
          Loading team members...
        </div>
      ) : (
        <div className="list-container">
          {teamMembers.length > 0 ? (
            <>
              {teamMembers.map(item => (
                <TeamMemberCard 
                  key={item.id}
                  item={item} 
                  onAddNote={handleAddNote}
                  onDelete={handleDeleteMember}
                />
              ))}
              <div 
                className="add-member-card"
                onClick={() => setShowForm(true)}
              >
                <div className="add-member-content">
                  <i className="material-icons">add_circle</i>
                  <span>Add Team Member</span>
                </div>
              </div>
            </>
          ) : (
            <div 
              className="no-team-members"
              onClick={() => setShowForm(true)}
            >
              <i className="material-icons">group</i>
              <p>No team members yet. Click here to add your first team member.</p>
            </div>
          )}
        </div>
      )}
      
      {showForm && (
        <div className="form-container">
          <button 
            className="close-button"
            onClick={() => {
              setShowForm(false);
              setNewMember({ name: '', role: '', email: '', notes: [] });
              setError(null);
            }}
          >
            <i className="material-icons">close</i>
          </button>
          
          <h2 className="form-title">
            <i className="material-icons">person_add</i>
            Add New Team Member
          </h2>

          <div className="form-content">
            <div className="input-group">
              <label>Name</label>
              <input
                className="input"
                placeholder="Enter full name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Role</label>
              <input
                className="input"
                placeholder="Enter job role"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="Enter email address"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>

            <button 
              className="submit-button"
              onClick={handleAddMember}
            >
              <i className="material-icons">check</i>
              Add Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <div className="app">
      <TeamDashboard />
    </div>
  );
};

export default App;
