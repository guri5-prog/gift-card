import React, { useState, useEffect, useRef } from 'react';
import { Heart, Gift, BookHeart, PenLine, Book, Trash2 } from 'lucide-react';

export default function CouplesDiary() {
  const [visitor, setVisitor] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [action, setAction] = useState(null);
  const [letters, setLetters] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [letterTitle, setLetterTitle] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [ribbonPulled, setRibbonPulled] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [ribbonY, setRibbonY] = useState(0);
  const [fillPercentage, setFillPercentage] = useState(0);
  const [tapAnimations, setTapAnimations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const timerRef = useRef(null);
  const tapThreshold = 30;

  // Storage helper functions that work with both window.storage and localStorage
  const storage = {
    async get(key) {
      try {
        if (window.storage) {
          return await window.storage.get(key, true);
        } else {
          const value = localStorage.getItem(key);
          return value ? { key, value } : null;
        }
      } catch (error) {
        const value = localStorage.getItem(key);
        return value ? { key, value } : null;
      }
    },
    async set(key, value) {
      try {
        if (window.storage) {
          return await window.storage.set(key, value, true);
        } else {
          localStorage.setItem(key, value);
          return { key, value };
        }
      } catch (error) {
        localStorage.setItem(key, value);
        return { key, value };
      }
    },
    async delete(key) {
      try {
        if (window.storage) {
          return await window.storage.delete(key, true);
        } else {
          localStorage.removeItem(key);
          return { key, deleted: true };
        }
      } catch (error) {
        localStorage.removeItem(key);
        return { key, deleted: true };
      }
    },
    async list(prefix) {
      try {
        if (window.storage) {
          return await window.storage.list(prefix, true);
        } else {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keys.push(key);
            }
          }
          return { keys };
        }
      } catch (error) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keys.push(key);
          }
        }
        return { keys };
      }
    }
  };

  useEffect(() => {
    if (viewingProfile) {
      loadLetters();
    }
  }, [viewingProfile]);

  const loadLetters = async () => {
    setLoading(true);
    try {
      const result = await storage.list(`letters:${viewingProfile}:`);
      if (result && result.keys) {
        const letterPromises = result.keys.map(async (key) => {
          const data = await storage.get(key);
          if (data && data.value) {
            return JSON.parse(data.value);
          }
          return null;
        });
        const loadedLetters = (await Promise.all(letterPromises)).filter(Boolean);
        loadedLetters.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLetters(loadedLetters);
      } else {
        setLetters([]);
      }
    } catch (error) {
      console.log('No letters found yet');
      setLetters([]);
    }
    setLoading(false);
  };

  const showModal = (type, message) => {
    setModal({ type, message });
    setTimeout(() => setModal(null), 3000);
  };

  const saveLetter = async () => {
    if (!letterTitle.trim() || !letterContent.trim()) {
      setModal({
        type: 'error',
        message: 'Please fill in both title and message!',
        persistent: true
      });
      return;
    }

    const newLetter = {
      id: Date.now().toString(),
      title: letterTitle.trim(),
      content: letterContent.trim(),
      from: visitor,
      to: viewingProfile,
      date: new Date().toISOString(),
      read: false
    };

    try {
      setLoading(true);
      const result = await storage.set(`letters:${viewingProfile}:${newLetter.id}`, JSON.stringify(newLetter));
      
      if (result) {
        showModal('success', 'Letter saved successfully! 💌');
        setLetterTitle('');
        setLetterContent('');
        setTimeout(() => {
          setAction(null);
          loadLetters();
        }, 1500);
      } else {
        setModal({
          type: 'error',
          message: 'Failed to save letter. Please try again.',
          persistent: true
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      setModal({
        type: 'error',
        message: 'Failed to save letter. Please try again.',
        persistent: true
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteLetter = async (letterId) => {
    setModal({
      type: 'confirm',
      message: 'Are you sure you want to delete this letter?',
      persistent: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await storage.delete(`letters:${viewingProfile}:${letterId}`);
          showModal('success', 'Letter deleted successfully');
          loadLetters();
          if (selectedLetter && selectedLetter.id === letterId) {
            setSelectedLetter(null);
            setGameComplete(false);
          }
        } catch (error) {
          setModal({
            type: 'error',
            message: 'Failed to delete letter',
            persistent: true
          });
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => setModal(null)
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(timerRef.current);
            setGameComplete(true);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, timeLeft]);

  useEffect(() => {
    setFillPercentage(Math.min((taps / tapThreshold) * 100, 100));
  }, [taps]);

  const handleRibbonDrag = (e) => {
    if (ribbonPulled) return;
    const touch = e.touches ? e.touches[0] : e;
    const newY = Math.max(0, touch.clientY - 200);
    setRibbonY(newY);
    if (newY > 100) {
      setRibbonPulled(true);
      setTimeout(() => setGameStarted(true), 500);
    }
  };

  const handleHeartTap = (e) => {
    if (timeLeft <= 0 || taps >= tapThreshold) return;
    setTaps(prev => prev + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const id = Date.now() + Math.random();
    setTapAnimations(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setTapAnimations(prev => prev.filter(anim => anim.id !== id));
    }, 600);
    if (taps + 1 >= tapThreshold) {
      clearInterval(timerRef.current);
      setTimeout(() => setGameComplete(true), 300);
    }
  };

  const resetAll = () => {
    setVisitor(null);
    setViewingProfile(null);
    setAction(null);
    setSelectedLetter(null);
    setRibbonPulled(false);
    setGameStarted(false);
    setGameComplete(false);
    setTaps(0);
    setTimeLeft(5);
    setRibbonY(0);
    setFillPercentage(0);
    setModal(null);
    clearInterval(timerRef.current);
  };

  // Custom Modal Component
  const CustomModal = () => {
    if (!modal) return null;

    const isError = modal.type === 'error';
    const isSuccess = modal.type === 'success';
    const isConfirm = modal.type === 'confirm';

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          textAlign: 'center',
          animation: 'modalSlideIn 0.3s ease-out'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {isError && '❌'}
            {isSuccess && '✅'}
            {isConfirm && '❓'}
          </div>
          
          <p style={{ 
            fontSize: '18px', 
            color: '#374151', 
            marginBottom: isConfirm ? '24px' : '0',
            lineHeight: '1.6'
          }}>
            {modal.message}
          </p>
          
          {isConfirm && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={modal.onCancel}
                style={{ 
                  ...secondaryButtonStyle, 
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setModal(null);
                  modal.onConfirm();
                }}
                style={{ 
                  ...primaryButtonStyle, 
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '14px',
                  background: '#dc2626'
                }}
              >
                Delete
              </button>
            </div>
          )}
          
          {modal.persistent && !isConfirm && (
            <button
              onClick={() => setModal(null)}
              style={{ 
                ...primaryButtonStyle,
                marginTop: '16px',
                padding: '12px 32px',
                fontSize: '14px'
              }}
            >
              OK
            </button>
          )}
        </div>
        
        <style>{`
          @keyframes modalSlideIn {
            from {
              transform: scale(0.9) translateY(-20px);
              opacity: 0;
            }
            to {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #fce7f3, #e9d5ff, #dbeafe)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%'
  };

  const buttonStyle = {
    padding: '15px 30px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: '#ec4899',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#e5e7eb',
    color: '#374151'
  };

  // Visitor Selection
  if (!visitor) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <BookHeart size={96} color="#ec4899" style={{ margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
            Our Love Diary
          </h1>
          <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '48px' }}>Who are you?</p>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['boyfriend', 'girlfriend'].map(type => (
              <button
                key={type}
                onClick={() => setVisitor(type)}
                style={{
                  ...cardStyle,
                  width: '250px',
                  cursor: 'pointer',
                  border: '4px solid transparent',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = type === 'boyfriend' ? '#60a5fa' : '#ec4899';
                  e.currentTarget.style.background = type === 'boyfriend' ? '#eff6ff' : '#fdf2f8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {type === 'boyfriend' ? '👨' : '👩'}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', textTransform: 'capitalize' }}>
                  {type}
                </h2>
                <p style={{ color: '#6b7280' }}>Click here to continue</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Profile Selection
  if (visitor && !viewingProfile) {
    const visitorEmoji = visitor === 'boyfriend' ? '👨' : '👩';
    
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{visitorEmoji}</div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' }}>
            {getGreeting()}, {visitor === 'boyfriend' ? 'Handsome' : 'Beautiful'}!
          </h1>
          <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '48px' }}>
            Whose diary would you like to access?
          </p>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
            {['boyfriend', 'girlfriend'].map(type => (
              <button
                key={type}
                onClick={() => setViewingProfile(type)}
                style={{
                  ...cardStyle,
                  width: '250px',
                  cursor: 'pointer',
                  border: '4px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = type === 'boyfriend' ? '#60a5fa' : '#ec4899';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  {type === 'boyfriend' ? '👨' : '👩'}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px', textTransform: 'capitalize' }}>
                  {type}'s Diary
                </h2>
                <p style={{ color: '#6b7280' }}>Read or write letters</p>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setVisitor(null)}
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Action Selection
  if (viewingProfile && !action) {
    const profileColor = viewingProfile === 'boyfriend' ? '#60a5fa' : '#ec4899';
    const profileEmoji = viewingProfile === 'boyfriend' ? '👨' : '👩';
    
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{profileEmoji}</div>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px', textTransform: 'capitalize' }}>
            {viewingProfile}'s Diary
          </h1>
          <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '48px' }}>
            What would you like to do?
          </p>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
            <button
              onClick={() => setAction('read')}
              style={{
                ...cardStyle,
                width: '250px',
                cursor: 'pointer',
                border: '4px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = profileColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <Book size={64} color={profileColor} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                Read Letters
              </h2>
              <p style={{ color: '#6b7280' }}>View all love letters</p>
            </button>
            
            <button
              onClick={() => setAction('write')}
              style={{
                ...cardStyle,
                width: '250px',
                cursor: 'pointer',
                border: '4px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = profileColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <PenLine size={64} color={profileColor} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                Write Letter
              </h2>
              <p style={{ color: '#6b7280' }}>Write a new love letter</p>
            </button>
          </div>
          
          <button
            onClick={() => setViewingProfile(null)}
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Write Letter
  if (action === 'write') {
    return (
      <div style={containerStyle}>
        <CustomModal />
        <div style={{ ...cardStyle, maxWidth: '600px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            Write a Love Letter
          </h1>
          
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
              Letter Title:
            </label>
            <input
              type="text"
              value={letterTitle}
              onChange={(e) => setLetterTitle(e.target.value)}
              placeholder="e.g., Missing You Today"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #d1d5db',
                fontSize: '16px',
                outline: 'none'
              }}
              disabled={loading}
            />
          </div>
          
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ display: 'block', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>
              Your Message:
            </label>
            <textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder="Write your heartfelt message here..."
              rows="10"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #d1d5db',
                fontSize: '16px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              disabled={loading}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={saveLetter} 
              style={{ 
                ...primaryButtonStyle, 
                flex: 1,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Letter 💌'}
            </button>
            <button 
              onClick={() => setAction(null)} 
              style={{ ...secondaryButtonStyle, flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Letters List
  if (action === 'read' && !selectedLetter) {
    return (
      <div style={containerStyle}>
        <CustomModal />
        <div style={{ ...cardStyle, maxWidth: '700px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            Love Letters
          </h1>
          
          {loading ? (
            <p style={{ color: '#6b7280', padding: '40px' }}>Loading letters...</p>
          ) : letters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <BookHeart size={64} color="#ec4899" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '18px' }}>
                No letters yet. Write the first one!
              </p>
              <button
                onClick={() => setAction('write')}
                style={primaryButtonStyle}
              >
                Write First Letter ✍️
              </button>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '24px' }}>
              {letters.map((letter) => (
                <div
                  key={letter.id}
                  style={{
                    background: '#fdf2f8',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px',
                    border: '2px solid #fbcfe8',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => setSelectedLetter(letter)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                        {letter.title}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
                        From: {letter.from === 'boyfriend' ? '👨 Boyfriend' : '👩 Girlfriend'}
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                        {new Date(letter.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLetter(letter.id);
                      }}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                      }}
                    >
                      <Trash2 size={18} color="#dc2626" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setAction(null)}
            style={{ ...secondaryButtonStyle, width: '100%' }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Ribbon Pull
  if (selectedLetter && !ribbonPulled) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
            A Little Surprise
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>
            Pull the ribbon to start — a small game before you read the letter.
          </p>
          
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={cardStyle}>
              <Gift size={80} color="#ec4899" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                The letter is sealed. Pull the ribbon first.
              </p>
            </div>
            
            <div
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: `${20 + ribbonY}px`,
                cursor: 'grab'
              }}
              onMouseDown={(e) => {
                const handleMove = (e) => handleRibbonDrag(e);
                const handleUp = () => {
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                };
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
              onTouchStart={(e) => {
                const handleMove = (e) => handleRibbonDrag(e);
                const handleEnd = () => {
                  document.removeEventListener('touchmove', handleMove);
                  document.removeEventListener('touchend', handleEnd);
                };
                document.addEventListener('touchmove', handleMove);
                document.addEventListener('touchend', handleEnd);
              }}
            >
              <div style={{
                width: '8px',
                height: '128px',
                background: 'linear-gradient(to bottom, #f9a8d4, #ec4899)',
                borderRadius: '50px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }} />
              <div style={{
                width: '32px',
                height: '32px',
                background: '#ec4899',
                borderRadius: '50%',
                border: '4px solid white',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                marginTop: '-8px',
                marginLeft: '-12px'
              }} />
            </div>
          </div>
          
          <button
            style={{ ...primaryButtonStyle, marginTop: '32px' }}
            onClick={() => {
              setRibbonY(150);
              setTimeout(() => {
                setRibbonPulled(true);
                setTimeout(() => setGameStarted(true), 500);
              }, 300);
            }}
          >
            PULL
          </button>
          
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => {
                setSelectedLetter(null);
                setRibbonPulled(false);
              }}
              style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Letters
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Heart Game
  if (gameStarted && !gameComplete) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            Tap the Heart — Show your love
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Tap the big heart as fast as you can for 5 seconds.
          </p>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#ec4899', marginBottom: '8px' }}>
              {timeLeft.toFixed(1)}s
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#374151' }}>
              Taps: {taps}
            </div>
          </div>
          
          <div
            style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '24px', cursor: 'pointer', userSelect: 'none' }}
            onClick={handleHeartTap}
            onTouchStart={handleHeartTap}
          >
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <clipPath id="heartClip">
                  <path d="M100,170 C100,170 30,120 30,80 C30,50 50,30 75,30 C85,30 95,35 100,45 C105,35 115,30 125,30 C150,30 170,50 170,80 C170,120 100,170 100,170 Z" />
                </clipPath>
              </defs>
              
              <path
                d="M100,170 C100,170 30,120 30,80 C30,50 50,30 75,30 C85,30 95,35 100,45 C105,35 115,30 125,30 C150,30 170,50 170,80 C170,120 100,170 100,170 Z"
                fill="#fce7f3"
                stroke="#ec4899"
                strokeWidth="3"
              />
              
              <rect
                x="0"
                y={200 - (fillPercentage * 2)}
                width="200"
                height={fillPercentage * 2}
                fill="#ec4899"
                clipPath="url(#heartClip)"
                style={{ transition: 'all 0.1s' }}
              />
            </svg>
            
            {tapAnimations.map(anim => (
              <div
                key={anim.id}
                style={{
                  position: 'absolute',
                  left: `${anim.x}px`,
                  top: `${anim.y}px`,
                  color: '#ec4899',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  pointerEvents: 'none',
                  animation: 'tapPulse 0.6s ease-out'
                }}
              >
                +1
              </div>
            ))}
          </div>
          
          <div style={{
            width: '100%',
            height: '12px',
            background: '#e5e7eb',
            borderRadius: '50px',
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <div style={{
              width: `${fillPercentage}%`,
              height: '100%',
              background: 'linear-gradient(to right, #f9a8d4, #ec4899)',
              borderRadius: '50px',
              transition: 'width 0.2s'
            }} />
          </div>
          
          <button 
            onClick={() => {
              setGameStarted(false);
              setGameComplete(false);
              setTaps(0);
              setTimeLeft(5);
              setFillPercentage(0);
              setRibbonPulled(false);
              setSelectedLetter(null);
              clearInterval(timerRef.current);
            }}
            style={{ ...secondaryButtonStyle, width: '100%' }}
          >
            Cancel
          </button>
        </div>
        
        <style>{`
          @keyframes tapPulse {
            0% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
            100% {
              transform: scale(1.5) translateY(-30px);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  // Letter Reveal
  if (gameComplete && selectedLetter) {
    const success = taps >= tapThreshold;
    
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, maxWidth: '700px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            {success ? (
              <>
                <Heart size={80} color="#ec4899" fill="#ec4899" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                  Amazing! 💝
                </h2>
                <p style={{ fontSize: '20px', color: '#6b7280' }}>
                  You tapped {taps} times! Here's your letter:
                </p>
              </>
            ) : (
              <>
                <Heart size={80} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                  Nice Try! 💕
                </h2>
                <p style={{ fontSize: '20px', color: '#6b7280' }}>
                  You tapped {taps} times! Here's your letter anyway:
                </p>
              </>
            )}
          </div>
          
          <div style={{
            background: '#fdf2f8',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #fbcfe8',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              {selectedLetter.title}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
              From: {selectedLetter.from === 'boyfriend' ? '👨 Boyfriend' : '👩 Girlfriend'}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '20px' }}>
              {new Date(selectedLetter.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p style={{ color: '#374151', fontSize: '18px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {selectedLetter.content}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => {
                setSelectedLetter(null);
                setRibbonPulled(false);
                setGameStarted(false);
                setGameComplete(false);
                setTaps(0);
                setTimeLeft(5);
                setRibbonY(0);
                setFillPercentage(0);
              }}
              style={{ ...secondaryButtonStyle, flex: 1 }}
            >
              Back to Letters
            </button>
            <button 
              onClick={() => {
                setRibbonPulled(false);
                setGameStarted(false);
                setGameComplete(false);
                setTaps(0);
                setTimeLeft(5);
                setRibbonY(0);
                setFillPercentage(0);
              }}
              style={{ ...primaryButtonStyle, flex: 1, background: '#a855f7' }}
            >
              Read Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}