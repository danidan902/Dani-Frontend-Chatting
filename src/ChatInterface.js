import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Clean SVG icons (Telegram style - no emoji/solid icons)
const Icons = {
  Send: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  ),
  Back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2V10z" strokeLinejoin="round" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinejoin="round" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  ),
  Attach: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  More: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
      <path d="M2 12l5 5L20 4M8 12l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" strokeLinejoin="round" />
    </svg>
  ),
};

const socket = io('https://dani-chat.onrender.com');
const BASE_URL = 'https://dani-chat.onrender.com';

// Telegram-style avatar colors
const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-purple-500', 'bg-pink-500',
];
const getAvatarColor = (username = '') =>
  avatarColors[username.charCodeAt(0) % avatarColors.length];

function Avatar({ username, image, size = 'md', online, ring }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-24 h-24 text-3xl',
  };
  return (
    <div className="relative shrink-0">
      <div
        className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center text-white font-semibold
          ${image ? '' : getAvatarColor(username)}
          ${ring ? 'ring-2 ring-[#0088cc] ring-offset-2 ring-offset-white dark:ring-offset-[#17212b]' : ''}`}
      >
        {image ? (
          <img src={image} alt={username} className="w-full h-full object-cover" />
        ) : (
          username?.charAt(0).toUpperCase()
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#17212b]
            ${online ? 'bg-green-500' : 'bg-gray-400'}`}
        />
      )}
    </div>
  );
}

export default function ChatInterface({ currentUser, onLogout, onNavigateToHome }) {
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('chats');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  /* ---------- socket listeners ---------- */
  useEffect(() => {
    if (currentUser) socket.emit('join', currentUser.username);

    socket.on('newMessage', (message) => setMessages((prev) => [...prev, message]));
    socket.on('chatHistory', (history) => setMessages(history));
    socket.on('usersUpdate', (usersList) => {
      const others = usersList.filter((u) => u.username !== currentUser?.username);
      setUsers(others);
      loadUserProfileImages(others);
    });
    socket.on('userTyping', (data) => {
      if (data.sender === selectedUser?.username) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
      }
    });
    socket.on('profileImageUpdated', (data) => {
      setUserProfileImages((prev) => ({
        ...prev,
        [data.username]: `${BASE_URL}/uploads/${data.imageUrl}`,
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentUser) {
      loadCurrentUserProfileImage();
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMobile &&
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target) &&
        !e.target.closest('.menu-toggle')
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  /* ---------- data helpers ---------- */
  const loadUsers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/users`);
      const others = res.data.filter((u) => u.username !== currentUser?.username);
      setUsers(others);
      loadUserProfileImages(others);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCurrentUserProfileImage = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/profile-image/${currentUser.username}`);
      if (res.data.imageUrl) setProfileImage(`${BASE_URL}/uploads/${res.data.imageUrl}`);
    } catch {}
  };

  const loadUserProfileImages = async (list) => {
    const images = {};
    for (const user of list) {
      try {
        const res = await axios.get(`${BASE_URL}/api/profile-image/${user.username}`);
        if (res.data.imageUrl) images[user.username] = `${BASE_URL}/uploads/${res.data.imageUrl}`;
      } catch {}
    }
    setUserProfileImages((prev) => ({ ...prev, ...images }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select an image file');
    if (file.size > 5 * 1024 * 1024) return alert('Image must be less than 5MB');

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('username', currentUser.username);

    try {
      const res = await axios.post(`${BASE_URL}/api/upload-profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.imageUrl) {
        const full = `${BASE_URL}/uploads/${res.data.imageUrl}`;
        setProfileImage(full);
        setShowImageUpload(false);
        setUserProfileImages((prev) => ({ ...prev, [currentUser.username]: full }));
        socket.emit('updateProfileImage', {
          username: currentUser.username,
          imageUrl: res.data.imageUrl,
        });
      }
    } catch {
      alert('Error uploading profile image');
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);
    if (isMobile) setSidebarOpen(false);
    socket.emit('getChatHistory', { user1: currentUser.username, user2: user.username });
  };

  const handleTyping = () => {
    if (selectedUser) {
      socket.emit('typing', { sender: currentUser.username, receiver: selectedUser.username });
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedUser) {
      socket.emit('sendMessage', {
        sender: currentUser.username,
        receiver: selectedUser.username,
        content: newMessage.trim(),
      });
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMessages = messages.filter(
    (m) =>
      (m.sender === currentUser?.username && m.receiver === selectedUser?.username) ||
      (m.sender === selectedUser?.username && m.receiver === currentUser?.username)
  );

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ---------- telegram color tokens ---------- */
  const bg = darkMode ? 'bg-[#0e1621]' : 'bg-white';
  const sidebarBg = darkMode ? 'bg-[#17212b]' : 'bg-white';
  const border = darkMode ? 'border-[#101921]' : 'border-gray-200';
  const text = darkMode ? 'text-gray-100' : 'text-gray-900';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const hover = darkMode ? 'hover:bg-[#202b36]' : 'hover:bg-gray-100';
  const selected = darkMode ? 'bg-[#2b5278]' : 'bg-[#e7f3ff]';

  return (
    <div className={`${bg} ${text} h-screen w-full flex overflow-hidden`}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Image upload modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImageUpload(false)}>
          <div className={`${sidebarBg} rounded-xl p-6 w-full max-w-sm shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Update Profile Photo</h3>
            <p className={`text-sm ${muted} mb-5`}>Choose a new profile picture</p>
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[#0088cc] hover:bg-[#0077b3] text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
                <Icons.Camera /> Choose
              </button>
              <button onClick={() => setShowImageUpload(false)} className={`flex-1 ${darkMode ? 'bg-[#232e3c]' : 'bg-gray-100'} py-2.5 rounded-lg font-medium`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`${sidebarBg} border-r ${border} flex flex-col shrink-0 z-40
          ${isMobile ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] transition-transform duration-300 ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'w-96'}`}
      >
        {/* Sidebar header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
          {isMobile && (
            <button className="menu-toggle p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setSidebarOpen(false)}>
              <Icons.Close />
            </button>
          )}
          <div className="flex items-center gap-3">
            <Avatar username={currentUser.username} image={profileImage || userProfileImages[currentUser.username]} size="md" />
            <div>
              <div className="font-semibold text-sm">{currentUser.username}</div>
              <div className={`text-xs ${muted}`}>online</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowImageUpload(true)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" title="Edit photo">
              <Icons.Edit />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" title="Toggle theme">
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
            <button onClick={onLogout} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" title="Logout">
              <Icons.Logout />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={`px-3 py-3 border-b ${border}`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'bg-[#242f3d]' : 'bg-gray-100'} rounded-full px-3 py-2`}>
            <Icons.Search className="text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${border}`}>
          {['chats', 'calls', 'status'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize relative
                ${activeTab === t ? 'text-[#0088cc]' : muted}`}
            >
              {t}
              {activeTab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0088cc] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className={`text-center text-sm ${muted} py-8`}>No users found</p>
          )}
          {filteredUsers.map((user) => {
            const isSelected = selectedUser?.username === user.username;
            return (
              <button
                key={user.username}
                onClick={() => selectUser(user)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${isSelected ? selected : hover}`}
              >
                <Avatar username={user.username} image={userProfileImages[user.username]} online={user.online} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{user.username}</div>
                  <div className={`text-xs truncate ${muted}`}>
                    {user.online ? 'online' : 'last seen recently'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat area */}
      <main className={`flex-1 flex flex-col min-w-0 ${darkMode ? 'bg-[#0e1621]' : 'bg-[#e6ebee]'}`}>
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${darkMode ? 'bg-[#17212b]' : 'bg-white shadow'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-16 h-16 ${muted}`}>
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Select a chat to start messaging</h2>
            <p className={`text-sm max-w-sm ${muted}`}>
              Choose a contact from the list to begin a conversation.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="mt-6 bg-[#0088cc] hover:bg-[#0077b3] text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${border} ${darkMode ? 'bg-[#17212b]' : 'bg-white'}`}>
              {isMobile && (
                <button onClick={() => { setSelectedUser(null); setSidebarOpen(true); }} className="p-1.5 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                  <Icons.Back />
                </button>
              )}
              <Avatar
                username={selectedUser.username}
                image={userProfileImages[selectedUser.username]}
                online={selectedUser.online}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{selectedUser.username}</div>
                <div className={`text-xs truncate ${muted}`}>
                  {isTyping ? 'typing...' : selectedUser.online ? 'online' : 'offline'}
                </div>
              </div>
              <button className={`p-2 rounded-full ${hover}`} title="Call">
                <Icons.Phone />
              </button>
              <button className={`p-2 rounded-full ${hover}`} title="More">
                <Icons.More />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1">
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar username={selectedUser.username} image={userProfileImages[selectedUser.username]} size="xl" />
                  <h3 className="mt-4 font-semibold text-lg">{selectedUser.username}</h3>
                  <p className={`text-sm ${muted}`}>No messages yet. Say hi! 👋</p>
                </div>
              )}

              {filteredMessages.map((m, i) => {
                const mine = m.sender === currentUser.username;
                const showAvatar = !mine && (i === 0 || filteredMessages[i - 1]?.sender !== m.sender);
                return (
                  <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                    {!mine && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <Avatar username={m.sender} image={userProfileImages[m.sender]} size="sm" />
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] sm:max-w-[65%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap shadow-sm
                        ${mine
                          ? 'bg-[#effdde] text-gray-900 rounded-br-md dark:bg-[#2b5278] dark:text-white'
                          : darkMode ? 'bg-[#182533] text-gray-100 rounded-bl-md' : 'bg-white text-gray-900 rounded-bl-md'}`}
                    >
                      <div>{m.content}</div>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px]
                        ${mine ? (darkMode ? 'text-blue-200' : 'text-green-700') : muted}`}>
                        <span>{formatTime(m.timestamp)}</span>
                        {mine && <Icons.Check />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`border-t ${border} ${darkMode ? 'bg-[#17212b]' : 'bg-white'} px-3 py-2.5`}>
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <button className={`p-2 rounded-full ${hover} ${muted}`} title="Attach">
                  <Icons.Attach />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyPress={handleKeyPress}
                  className={`flex-1 bg-transparent outline-none text-sm py-2 px-1 placeholder-gray-400`}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-2.5 rounded-full text-white transition-colors
                    ${newMessage.trim() ? 'bg-[#0088cc] hover:bg-[#0077b3]' : 'bg-gray-300 dark:bg-[#2a3744] cursor-not-allowed'}`}
                  title="Send"
                >
                  <Icons.Send />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
