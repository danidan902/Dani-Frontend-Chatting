import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

// Icons
const Icons = {
  SEND: '➤',
  ONLINE: '🟢',
  OFFLINE: '⚫',
  TYPING: '✍️',
  SEARCH: '🔍',
  ATTACHMENT: '+',
  EMOJI: '',
  MENU: '☰',
  CLOSE: '✕',
  CAMERA: '📷',
  EDIT: '✏️',
  LOGOUT: '🚪',
  BACK: '←',
  HEART: '❤️',
  COMMENT: '💬',
  SHARE: '📤',
  SAVE: '📥',
  STORY: '',
  ADD: '+',
  MORE: '⋯'
};

// Connect to server
const socket = io('https://dani-chat.onrender.com');

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [userProfileImages, setUserProfileImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('chats');
  const [stories, setStories] = useState([]);
  const [showStories, setShowStories] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const sidebarRef = useRef(null);

  // Base URL for images
  const BASE_URL = 'https://dani-chat.onrender.com';

  // Mock stories data
  useEffect(() => {
    const mockStories = users.map(user => ({
      id: user.username,
      username: user.username,
      avatar: userProfileImages[user.username] || null,
      stories: [
        {
          id: 1,
          type: 'text',
          content: `Hello from ${user.username}! 👋`,
          duration: 5000
        },
        {
          id: 2,
          type: 'text',
          content: 'Having a great day! 🌟',
          duration: 5000
        }
      ],
      seen: false
    }));
    setStories(mockStories);
  }, [users, userProfileImages]);

  // Detect mobile screen
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && 
          sidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          !event.target.closest('.menu-toggle')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    console.log('🔌 Setting up socket listeners...');
    
    // Listen for new messages
    socket.on('newMessage', (message) => {
      console.log('📩 New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    // Listen for chat history
    socket.on('chatHistory', (history) => {
      console.log('📚 Chat history loaded:', history.length, 'messages');
      setMessages(history);
    });

    // Listen for users updates
    socket.on('usersUpdate', (usersList) => {
      console.log('👥 Users list updated');
      const otherUsers = usersList.filter(user => user.username !== currentUser?.username);
      setUsers(otherUsers);
      loadUserProfileImages(otherUsers);
    });

    // Listen for typing indicators
    socket.on('userTyping', (data) => {
      if (data.sender === selectedUser?.username) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
      }
    });

    // Listen for profile image updates
    socket.on('profileImageUpdated', (data) => {
      console.log('🖼️ Profile image updated for:', data.username);
      const fullImageUrl = `${BASE_URL}/uploads/${data.imageUrl}`;
      setUserProfileImages(prev => ({
        ...prev,
        [data.username]: fullImageUrl
      }));
    });

    return () => {
      socket.off('newMessage');
      socket.off('chatHistory');
      socket.off('usersUpdate');
      socket.off('userTyping');
      socket.off('profileImageUpdated');
    };
  }, [currentUser, selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      loadCurrentUserProfileImage();
      loadUsers();
    }
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const payload = { username: username.trim(), password: password.trim() };

      const response = await axios.post(`${BASE_URL}${endpoint}`, payload);
      
      if (response.data.message) {
        setCurrentUser({ username: username.trim() });
        socket.emit('join', username.trim());
        console.log('✅ User authenticated:', username);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsers([]);
    setMessages([]);
    setSelectedUser(null);
    setUsername('');
    setPassword('');
    socket.disconnect();
    socket.connect();
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/users`);
      const otherUsers = response.data.filter(user => user.username !== currentUser?.username);
      setUsers(otherUsers);
      loadUserProfileImages(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCurrentUserProfileImage = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/profile-image/${currentUser.username}`);
      if (response.data.imageUrl) {
        setProfileImage(`${BASE_URL}/uploads/${response.data.imageUrl}`);
      }
    } catch (error) {
      console.log('No profile image found for current user');
    }
  };

  const loadUserProfileImages = async (usersList) => {
    const images = {};
    for (const user of usersList) {
      try {
        const response = await axios.get(`${BASE_URL}/api/profile-image/${user.username}`);
        if (response.data.imageUrl) {
          images[user.username] = `${BASE_URL}/uploads/${response.data.imageUrl}`;
        }
      } catch (error) {
        console.log(`No profile image found for ${user.username}`);
      }
    }
    setUserProfileImages(images);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('username', currentUser.username);

    try {
      const response = await axios.post(`${BASE_URL}/api/upload-profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.imageUrl) {
        const fullImageUrl = `${BASE_URL}/uploads/${response.data.imageUrl}`;
        setProfileImage(fullImageUrl);
        setShowImageUpload(false);
        
        setUserProfileImages(prev => ({
          ...prev,
          [currentUser.username]: fullImageUrl
        }));
        
        socket.emit('updateProfileImage', {
          username: currentUser.username,
          imageUrl: response.data.imageUrl
        });
        
        alert('Profile image updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Error uploading profile image');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const selectUser = (user) => {
    console.log('💬 Selected user:', user.username);
    setSelectedUser(user);
    setMessages([]);
    
    // Close sidebar on mobile when user is selected
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    socket.emit('getChatHistory', {
      user1: currentUser.username,
      user2: user.username
    });
  };

  const handleTyping = () => {
    if (selectedUser) {
      socket.emit('typing', {
        sender: currentUser.username,
        receiver: selectedUser.username
      });
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedUser) {
      console.log('📤 Sending message to:', selectedUser.username);
      
      const messageData = {
        sender: currentUser.username,
        receiver: selectedUser.username,
        content: newMessage.trim()
      };
      
      socket.emit('sendMessage', messageData);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleBackToChats = () => {
    setSelectedUser(null);
    if (isMobile) {
      setSidebarOpen(true);
    }
  };

  const openStories = (storyIndex = 0) => {
    setCurrentStoryIndex(storyIndex);
    setShowStories(true);
  };

  const closeStories = () => {
    setShowStories(false);
    setCurrentStoryIndex(0);
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      closeStories();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMessages = messages.filter(message => 
    (message.sender === currentUser?.username && message.receiver === selectedUser?.username) ||
    (message.sender === selectedUser?.username && message.receiver === currentUser?.username)
  );

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRandomGradient = (username) => {
    const gradients = [
      'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 100%)',
      'linear-gradient(45deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(45deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(45deg, #d4fc79 0%, #96e6a1 100%)',
      'linear-gradient(45deg, #a6c0fe 0%, #f68084 100%)'
    ];
    
    const index = username.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const getUserAvatar = (username, size = 'normal', hasStory = false) => {
    const imageUrl = userProfileImages[username];
    const gradient = getRandomGradient(username);
    
    const avatarClass = `user-avatar ${size} ${hasStory ? 'has-story' : ''} ${imageUrl ? 'with-image' : ''}`;

    if (imageUrl) {
      return (
        <div className={avatarClass}>
          <img 
            src={imageUrl} 
            alt={username}
            className="avatar-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div 
            className="avatar-fallback"
            style={{ background: gradient }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div className={`online-indicator ${users.find(u => u.username === username)?.online ? 'online' : 'offline'}`}></div>
        </div>
      );
    }

    return (
      <div 
        className={avatarClass}
        style={{ background: gradient }}
      >
        {username.charAt(0).toUpperCase()}
        <div className={`online-indicator ${users.find(u => u.username === username)?.online ? 'online' : 'offline'}`}></div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="animated-bg"></div>
        <div className="login-box glassmorphism">
          <div className="login-header">
            <h2 className="gradient-text">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Sign in to continue chatting' : 'Join our chat community'}</p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="modern-input"
                required
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modern-input"
                required
              />
            </div>

            <button 
              type="submit" 
              className="modern-btn primary"
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading ? '...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="link-btn"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setUsername('');
                  setPassword('');
                }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''} ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Profile Image Upload Modal */}
      {showImageUpload && (
        <div className="modal-overlay" onClick={() => setShowImageUpload(false)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <h3>Update Profile Image</h3>
            <p>Choose a new profile picture</p>
            <div className="modal-actions">
              <button 
                onClick={triggerFileInput}
                className="modern-btn primary"
              >
                {Icons.CAMERA} Choose Image
              </button>
              <button 
                onClick={() => setShowImageUpload(false)}
                className="modern-btn secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stories Viewer */}
      {showStories && stories[currentStoryIndex] && (
        <div className="stories-viewer">
          <div className="stories-viewer-header">
            <div className="story-progress-bars">
              {stories[currentStoryIndex].stories.map((story, index) => (
                <div key={story.id} className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              ))}
            </div>
            <div className="story-viewer-user-info">
              {getUserAvatar(stories[currentStoryIndex].username, 'small')}
              <span className="story-viewer-username">{stories[currentStoryIndex].username}</span>
              <span className="story-time">1h ago</span>
            </div>
            <button className="close-stories" onClick={closeStories}>
              {Icons.CLOSE}
            </button>
          </div>
          
          <div className="story-content">
            <div className="story-text">
              {stories[currentStoryIndex].stories[0]?.content}
            </div>
          </div>

          <div className="story-nav">
            <button className="story-nav-btn prev" onClick={prevStory}></button>
            <button className="story-nav-btn next" onClick={nextStory}></button>
          </div>
        </div>
      )}

      {/* Animated Background */}
      <div className="animated-bg"></div>
      
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header glassmorphism">
          <button 
            className="menu-toggle icon-btn"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? Icons.CLOSE : Icons.MENU}
          </button>
          
          {selectedUser ? (
            <div className="mobile-chat-header">
              <button 
                className="back-btn icon-btn"
                onClick={handleBackToChats}
              >
                {Icons.BACK}
              </button>
              <div className="chat-user-info mobile">
                {getUserAvatar(selectedUser.username, 'small')}
                <div className="user-details">
                  <div className="username">{selectedUser.username}</div>
                  <div className="typing-indicator">
                    {isTyping ? 'typing...' : selectedUser.online ? 'online' : 'offline'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mobile-title">
              <h3>ChatApp</h3>
            </div>
          )}
          
          <div className="mobile-actions">
            <button 
              className="icon-btn"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`sidebar glassmorphism ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isMobile ? 'mobile-sidebar' : ''}`}
      >
        <div className="sidebar-header">
          {!isMobile && (
            <>
              <div className="user-profile">
                <div className="user-avatar-wrapper">
                  {getUserAvatar(currentUser.username, 'large', true)}
                  <button 
                    className="add-story-btn"
                    title="Add to story"
                    onClick={() => openStories()}
                  >
                    {Icons.ADD}
                  </button>
                  <button 
                    className="edit-avatar-btn"
                    onClick={() => setShowImageUpload(true)}
                    title="Change profile picture"
                  >
                    {Icons.EDIT}
                  </button>
                </div>
                <div className="user-details">
                  <div className="username">{currentUser.username}</div>
                  <div className="status">Online • Add to your story</div>
                </div>
              </div>
              <div className="sidebar-actions">
                <button 
                  className="icon-btn"
                  onClick={() => setDarkMode(!darkMode)}
                  title="Toggle theme"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button 
                  className="icon-btn"
                  onClick={handleLogout}
                  title="Logout"
                >
                  {Icons.LOGOUT}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stories Section */}
        <div className="stories-section">
          <div className="stories-container">
            <h4 className="stories-title">Stories</h4>
            <button className="see-all-btn">See all</button>
          </div>
          <div className="stories-list">
            <div className="story-item your-story" onClick={() => openStories()}>
              <div className="story-avatar-wrapper">
                {getUserAvatar(currentUser.username, 'large', false)}
                <div className="add-story-icon">+</div>
              </div>
              <div className="story-username">Your story</div>
            </div>
            {stories.slice(0, 6).map((story, index) => (
              <div 
                key={story.id} 
                className={`story-item ${story.seen ? 'seen' : 'unseen'}`}
                onClick={() => openStories(index)}
              >
                <div className="story-avatar-wrapper">
                  {getUserAvatar(story.username, 'large', true)}
                </div>
                <div className="story-username">{story.username}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="search-box">
          <div className="search-icon">{Icons.SEARCH}</div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            Chats
          </button>
          <button 
            className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
          >
            Calls
          </button>
          <button 
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
        </div>

        <div className="users-list">
          {filteredUsers.map(user => (
            <div
              key={user.username}
              className={`user-item ${selectedUser?.username === user.username ? 'selected' : ''}`}
              onClick={() => selectUser(user)}
            >
              <div className="user-avatar-wrapper">
                {getUserAvatar(user.username, 'normal', true)}
              </div>
              <div className="user-info">
                <div className="username">{user.username}</div>
                <div className="last-seen">
                  {user.online ? 'Online now' : `Last seen ${new Date().toLocaleTimeString()}`}
                </div>
              </div>
              {user.online && <div className="online-pulse"></div>}
            </div>
          ))}
        </div>

        {/* Mobile sidebar footer */}
        {isMobile && (
          <div className="mobile-sidebar-footer">
            <button 
              className="mobile-logout-btn modern-btn secondary"
              onClick={handleLogout}
            >
              {Icons.LOGOUT} Logout
            </button>
          </div>
        )}
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className={`chat-area ${selectedUser ? 'chat-active' : 'no-chat'} ${isMobile ? 'mobile-chat' : ''}`}>
        {selectedUser ? (
          <>
            {/* Desktop Chat Header */}
            {!isMobile && (
              <div className="chat-header glassmorphism">
                <div className="chat-user-info">
                  {getUserAvatar(selectedUser.username, 'normal', true)}
                  <div className="user-details">
                    <div className="username">{selectedUser.username}</div>
                    <div className="typing-indicator">
                      {isTyping ? `${selectedUser.username} is typing...` : selectedUser.online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
                <div className="chat-actions">
                  
                  
                  <button className="icon-btn" title="More options">
                    {Icons.MORE}
                  </button>
                </div>
              </div>
            )}

            <div className="messages-container">
              {filteredMessages.length === 0 ? (
                <div className="no-messages">
                  <div className="welcome-illustration">
                    {getUserAvatar(selectedUser.username, 'xlarge', true)}
                  </div>
                  <h3>{selectedUser.username}</h3>
                  <p>Instagram • Active today</p>
                  <button className="modern-btn secondary">
                    View Profile
                  </button>
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <div
                    key={message._id || index}
                    className={`message ${message.sender === currentUser.username ? 'sent' : 'received'}`}
                  >
                    {message.sender !== currentUser.username && (
                      <div className="message-avatar">
                        {getUserAvatar(message.sender, 'small', true)}
                      </div>
                    )}
                    <div className="message-content-wrapper">
                      <div className="message-content">
                        {message.content}
                      </div>
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    {message.sender === currentUser.username && (
                      <div className="message-status">
                        {message.read ? '✓✓' : '✓✓'}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} className="scroll-anchor" />
            </div>

            {isTyping && (
              <div className="typing-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>{selectedUser.username} is typing</span>
              </div>
            )}

            <div className="message-input-container glassmorphism">
              <div className="input-actions">
                <button className="icon-btn" title="Add to story">
                  {Icons.STORY}
                </button>
                <button className="icon-btn" title="Attach file">
                  {Icons.ATTACHMENT}
                </button>
                {/* <button className="icon-btn" title="Emoji">
                  {Icons.EMOJI}
                </button> */}
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message ${selectedUser.username}...`}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                className="message-input"
              />
              <button 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                className="send-btn"
                title="Send message"
              >
                <span className="send-icon">{Icons.SEND}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-content">
              <div className="instagram-style-profile">
                {getUserAvatar(currentUser.username, 'xlarge', true)}
                <h2>{currentUser.username}</h2>
                <p>Welcome to your Instagram-style chat</p>
                <div className="profile-stats">
                  <div className="stat">
                    <strong>125</strong>
                    <span>Posts</span>
                  </div>
                  <div className="stat">
                    <strong>1.2K</strong>
                    <span>Followers</span>
                  </div>
                  <div className="stat">
                    <strong>356</strong>
                    <span>Following</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="modern-btn secondary">Edit Profile</button>
                  <button className="modern-btn secondary">Share Profile</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
