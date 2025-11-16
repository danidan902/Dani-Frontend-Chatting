import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

// Enhanced Icons
const Icons = {
  SEND: '🚀',
  ONLINE: '🟢',
  OFFLINE: '⚫',
  TYPING: '✍️',
  SEARCH: '🔍',
  ATTACHMENT: '📎',
  EMOJI: '😊',
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
  STORY: '🌈',
  ADD: '+',
  MORE: '⋯',
  HOME: '🏠',
  CHAT: '💬',
  PROFILE: '👤',
  NOTIFICATION: '🔔',
  SETTINGS: '⚙️',
  VOICE: '🎤',
  GIFT: '🎁',
  GAME: '🎮',
  MUSIC: '🎵',
  STAR: '⭐',
  FIRE: '🔥',
  LIKE: '👍',
  DISLIKE: '👎',
  PARTY: '🎉',
  MAGIC: '✨'
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
  const [darkMode, setDarkMode] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [userProfileImages, setUserProfileImages] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeNav, setActiveNav] = useState('chats');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [stories, setStories] = useState([]);
  const [showStories, setShowStories] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageEffects, setMessageEffects] = useState({});
  const [backgroundEffect, setBackgroundEffect] = useState('particles');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const backgroundRef = useRef(null);

  // Base URL for images
  const BASE_URL = 'https://dani-chat.onrender.com';

  // Enhanced mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize background animations
  useEffect(() => {
    if (backgroundRef.current) {
      initializeBackgroundEffects();
    }
  }, [backgroundEffect, darkMode]);

  const initializeBackgroundEffects = () => {
    const canvas = backgroundRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const particleCount = isMobile ? 50 : 100;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        color: darkMode 
          ? `hsl(${Math.random() * 360}, 70%, 60%)`
          : `hsl(${Math.random() * 360}, 100%, 70%)`
      });
    }

    const animate = () => {
      ctx.fillStyle = darkMode ? 'rgba(10, 10, 20, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x > canvas.width) particle.x = 0;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        if (particle.y < 0) particle.y = canvas.height;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();

        // Draw connections
        for (let j = index + 1; j < particles.length; j++) {
          const dx = particle.x - particles[j].x;
          const dy = particle.y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = darkMode 
              ? `rgba(255, 255, 255, ${0.2 * (1 - distance / 100)})`
              : `rgba(0, 0, 0, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => window.removeEventListener('resize', resizeCanvas);
  };

  // Enhanced socket listeners
  useEffect(() => {
    console.log('🔌 Setting up socket listeners...');
    
    socket.on('newMessage', (message) => {
      console.log('📩 New message received:', message);
      setMessages(prev => [...prev, message]);
      
      
      setMessageEffects(prev => ({
        ...prev,
        [message._id || Date.now()]: 'pop'
      }));

      if (message.sender !== currentUser?.username) {
        setUnreadCount(prev => prev + 1);
        addNotification('message', `${message.sender} sent you a message`);
      }
    });

    socket.on('chatHistory', (history) => {
      console.log('📚 Chat history loaded:', history.length, 'messages');
      setMessages(history);
    });

    socket.on('usersUpdate', (usersList) => {
      console.log('👥 Users list updated');
      const otherUsers = usersList.filter(user => user.username !== currentUser?.username);
      setUsers(otherUsers);
      loadUserProfileImages(otherUsers);
    });

    socket.on('userTyping', (data) => {
      if (data.sender === selectedUser?.username) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
      }
    });

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

  // Enhanced scroll handling
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
      initializeStories();
    }
  }, [currentUser]);

  const initializeStories = () => {
    const mockStories = [
      {
        id: 1,
        username: 'alex_johnson',
        avatar: null,
        stories: [{ id: 1, type: 'text', content: 'Exploring new horizons! 🌟', duration: 5000 }],
        seen: false
      },
      {
        id: 2,
        username: 'sarah_m',
        avatar: null,
        stories: [{ id: 1, type: 'text', content: 'Beautiful day! ☀️', duration: 5000 }],
        seen: false
      },
      {
        id: 3,
        username: 'mike_t',
        avatar: null,
        stories: [{ id: 1, type: 'text', content: 'Coding marathon! 💻', duration: 5000 }],
        seen: false
      }
    ];
    setStories(mockStories);
  };

  const addNotification = (type, message) => {
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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
        
        addNotification('success', 'Profile image updated successfully!');
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
    setActiveNav('chat');
    setUnreadCount(0);
    
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

  const handleBackToChats = () => {
    setSelectedUser(null);
    setActiveNav('chats');
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
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
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
  const renderContent = () => {
    switch (activeNav) {
      case 'chats':
        return renderChatsScreen();
      case 'status':
        return renderStatusScreen();
      case 'calls':
        return renderCallsScreen();
      case 'profile':
        return renderProfileScreen();
      case 'chat':
        return renderChatScreen();
      default:
        return renderChatsScreen();
    }
  };

  const renderChatsScreen = () => (
    <div className="chats-screen">
      {/* Animated Header */}
      <div className="screen-header animated-header">
        <div className="header-content">
          <h1 className="gradient-text">Messages</h1>
          <div className="header-actions">
            <button className="icon-btn magical-btn" onClick={() => setBackgroundEffect(
              backgroundEffect === 'particles' ? 'waves' : 'particles'
            )}>
              {Icons.MAGIC}
            </button>
            <button className="icon-btn magical-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

    
      <div className="stories-section magical-section">
        <div className="stories-container">
          <div className="your-story-item magical-card" onClick={() => openStories()}>
            <div className="story-avatar-wrapper">
              {getUserAvatar(currentUser.username, 'large', false)}
              <div className="add-story-icon magical-glow">+</div>
            </div>
            <div className="story-label">Your Story</div>
          </div>
          {stories.map((story, index) => (
            <div 
              key={story.id} 
              className="story-item magical-card"
              onClick={() => openStories(index)}
            >
              <div className="story-avatar-wrapper">
                {getUserAvatar(story.username, 'large', true)}
              </div>
              <div className="story-label">{story.username}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section magical-section">
        <div className="search-container magical-input">
          <span className="search-icon">{Icons.SEARCH}</span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Chats List */}
      <div className="chats-list">
        <div className="section-header">
          <h2 className="section-title">Recent Conversations</h2>
          <button className="icon-btn magical-btn">{Icons.EDIT}</button>
        </div>
        {filteredUsers.map(user => (
          <div
            key={user.username}
            className="chat-item magical-card hover-lift"
            onClick={() => selectUser(user)}
          >
            <div className="chat-avatar">
              {getUserAvatar(user.username, 'normal', true)}
            </div>
            <div className="chat-info">
              <div className="chat-header">
                <span className="chat-username">{user.username}</span>
                <span className="chat-time">12:30 PM</span>
              </div>
              <div className="chat-preview">
                <span className="last-message">Tap to start conversation...</span>
                {unreadCount > 0 && (
                  <span className="unread-badge magical-glow">{unreadCount}</span>
                )}
              </div>
            </div>
            <div className="chat-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatusScreen = () => (
    <div className="status-screen">
      <div className="screen-header">
        <h1>Status Updates</h1>
        <button className="icon-btn magical-btn">{Icons.CAMERA}</button>
      </div>
      <div className="status-list">
        {stories.map(story => (
          <div key={story.id} className="status-item magical-card">
            <div className="status-avatar">
              {getUserAvatar(story.username, 'normal', true)}
            </div>
            <div className="status-info">
              <span className="status-username">{story.username}</span>
              <span className="status-time">30 minutes ago</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCallsScreen = () => (
    <div className="calls-screen">
      <div className="screen-header">
        <h1>Recent Calls</h1>
      </div>
      <div className="calls-list">
        {users.slice(0, 5).map(user => (
          <div key={user.username} className="call-item magical-card">
            <div className="call-avatar">
              {getUserAvatar(user.username, 'normal')}
            </div>
            <div className="call-info">
              <span className="call-username">{user.username}</span>
              <span className="call-type">Outgoing • 5:30</span>
            </div>
            <button className="call-btn magical-btn">{Icons.CAMERA}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="profile-screen">
      <div className="profile-header magical-section">
        {getUserAvatar(currentUser.username, 'xlarge')}
        <h1 className="gradient-text">{currentUser.username}</h1>
        <p>Welcome to your magical profile! ✨</p>
      </div>
      
      <div className="profile-stats magical-section">
        <div className="stat-item magical-card">
          <strong>125</strong>
          <span>Posts</span>
        </div>
        <div className="stat-item magical-card">
          <strong>1.2K</strong>
          <span>Followers</span>
        </div>
        <div className="stat-item magical-card">
          <strong>356</strong>
          <span>Following</span>
        </div>
      </div>
      
      <div className="profile-actions">
        <button className="modern-btn primary magical-btn">Edit Profile</button>
        <button 
          className="modern-btn secondary magical-btn"
          onClick={() => setShowImageUpload(true)}
        >
          Change Photo
        </button>
        <button className="modern-btn secondary magical-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Theme Selector */}
      <div className="theme-selector magical-section">
        <h3>Background Effects</h3>
        <div className="theme-options">
          <button 
            className={`theme-option ${backgroundEffect === 'particles' ? 'active' : ''}`}
            onClick={() => setBackgroundEffect('particles')}
          >
            Particles
          </button>
          <button 
            className={`theme-option ${backgroundEffect === 'waves' ? 'active' : ''}`}
            onClick={() => setBackgroundEffect('waves')}
          >
            Waves
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatScreen = () => (
    <>
      {/* Chat Header */}
      <div className="chat-header magical-header">
        <button className="back-btn magical-btn" onClick={handleBackToChats}>
          {Icons.BACK}
        </button>
        <div className="chat-user-info">
          {getUserAvatar(selectedUser.username, 'normal')}
          <div className="user-details">
            <div className="username">{selectedUser.username}</div>
            <div className="user-status">
              {isTyping ? (
                <div className="typing-animation">
                  <span>typing</span>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              ) : selectedUser.online ? 'online' : 'offline'}
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <button className="icon-btn magical-btn">{Icons.CAMERA}</button>
          <button className="icon-btn magical-btn">{Icons.MORE}</button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container" ref={messagesContainerRef}>
        {filteredMessages.length === 0 ? (
          <div className="no-messages magical-section">
            <div className="welcome-illustration">
              {getUserAvatar(selectedUser.username, 'xlarge')}
            </div>
            <h2>Start a Conversation</h2>
            <p>Send your first message to {selectedUser.username}</p>
            <div className="welcome-effects">
              <span className="effect-dot magical-glow"></span>
              <span className="effect-dot magical-glow"></span>
              <span className="effect-dot magical-glow"></span>
            </div>
          </div>
        ) : (
          filteredMessages.map((message, index) => (
            <div
              key={message._id || index}
              className={`message ${message.sender === currentUser.username ? 'sent' : 'received'} ${
                messageEffects[message._id] || ''
              }`}
            >
              <div className="message-content magical-card">
                {message.content}
                {message.effect && <div className="message-effect">{message.effect}</div>}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{selectedUser.username} is typing</span>
          </div>
        )}
      </div>

      {/* Enhanced Message Input */}
      <div className="message-input-container  magical-section">
       
        <input
          type="text"
          placeholder="Type a magical message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={handleKeyPress}
          className="message-input magical-input"
        />
        <div className="send-actions">
          <button className="icon-btn magical-btn">{Icons.VOICE}</button>
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim()}
            className="send-btn magical-glow"
          >
            {Icons.SEND}
          </button>
        </div>
      </div>
    </>
  );

  if (!currentUser) {
    return (
      <div className="auth-container">
        <canvas ref={backgroundRef} className="background-canvas"></canvas>
        <div className="auth-box magical-card">
          <div className="auth-header">
            <h1 className="gradient-text">MagicChat</h1>
            <p>{isLogin ? 'Welcome back to the magic! ✨' : 'Join our magical community! 🌟'}</p>
          </div>
          
          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="✨ Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input magical-input"
                required
              />
            </div>
            
            <div className="input-group">
              <input
                type="password"
                placeholder="🔒 Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input magical-input"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button primary magical-btn"
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>
              {isLogin ? "New to magic? " : "Already have magic? "}
              <button 
                type="button"
                className="link-button magical-text"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Create Account' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'} ${isMobile ? 'mobile' : 'desktop'} ${selectedUser ? 'chat-active' : ''}`}>
      {/* Background Canvas */}
      <canvas ref={backgroundRef} className="background-canvas"></canvas>

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
          <div className="modal-content magical-card" onClick={(e) => e.stopPropagation()}>
            <h3>✨ Update Profile Image</h3>
            <p>Choose a magical new profile picture</p>
            <div className="modal-actions">
              <button 
                onClick={triggerFileInput}
                className="modern-btn primary magical-btn"
              >
                {Icons.CAMERA} Choose Image
              </button>
              <button 
                onClick={() => setShowImageUpload(false)}
                className="modern-btn secondary magical-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showStories && (
        <div className="stories-viewer">
          <div className="stories-header">
            <div className="story-progress">
              {stories[currentStoryIndex]?.stories.map((_, index) => (
                <div key={index} className="progress-bar">
                  <div className="progress-fill magical-glow"></div>
                </div>
              ))}
            </div>
            <div className="story-user-info">
              {getUserAvatar(stories[currentStoryIndex]?.username, 'small')}
              <span>{stories[currentStoryIndex]?.username}</span>
              <button className="close-story magical-btn" onClick={closeStories}>
                {Icons.CLOSE}
              </button>
            </div>
          </div>
          <div className="story-content magical-card">
            {stories[currentStoryIndex]?.stories[0]?.content}
          </div>
          <div className="story-nav">
            <button className="nav-btn prev" onClick={prevStory}></button>
            <button className="nav-btn next" onClick={nextStory}></button>
          </div>
        </div>
      )}

      {/* Main App Layout */}
      <div className="app-content">
        {selectedUser ? renderChatScreen() : renderContent()}
      </div>

      {/* Enhanced Bottom Navigation - Only show on mobile when not in chat */}
      {!selectedUser && isMobile && (
        <nav className="bottom-nav magical-section">
          <button 
            className={`nav-item ${activeNav === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveNav('chats')}
          >
            <span className="nav-icon magical-glow">{Icons.CHAT}</span>
            <span className="nav-label">Chats</span>
            {unreadCount > 0 && <span className="nav-badge magical-glow">{unreadCount}</span>}
          </button>
          
          <button 
            className={`nav-item ${activeNav === 'status' ? 'active' : ''}`}
            onClick={() => setActiveNav('status')}
          >
            <span className="nav-icon">{Icons.STORY}</span>
            <span className="nav-label">Status</span>
          </button>
          
          <button 
            className={`nav-item ${activeNav === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveNav('calls')}
          >
            <span className="nav-icon">{Icons.CAMERA}</span>
            <span className="nav-label">Calls</span>
          </button>
          
          <button 
            className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveNav('profile')}
          >
            <span className="nav-icon">{Icons.PROFILE}</span>
            <span className="nav-label">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
