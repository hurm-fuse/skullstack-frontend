/**
 * js/chat.js - Skull Stack Support Chat
 * Features: 3-second polling, flicker prevention, auto-scroll, and XSS protection.
 */

const API_BASE = 'https://skullstack.onrender.com/api';

// 1. SESSION & ROUTING CHECK
const params = new URLSearchParams(window.location.search);
const orderId = params.get('orderId');
const token = localStorage.getItem('aethex_token');

if (!orderId || !token) {
  alert('Invalid access. No order or session found.');
  window.location.href = 'index.html';
}

// Display shortened Order ID for cleaner UI
document.getElementById('chatOrderInfo').textContent = `Order: ${orderId.substring(0, 12)}...`;

// State management to prevent UI flickering during polling
let lastMessageCount = 0;

/**
 * Fetch messages from the server
 */
async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/chat/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      alert('Session expired. Please log in again.');
      window.location.href = 'index.html';
      return;
    }

    const messages = await res.json();
    
    // Only re-render if the number of messages has changed
    if (messages.length !== lastMessageCount) {
      renderMessages(messages);
      lastMessageCount = messages.length;
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
}

/**
 * Render messages into the chat container
 */
function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  
  // Flicker prevention: Only re-render if count changes
  if (messages.length === lastMessageCount) return;
  lastMessageCount = messages.length;

  container.innerHTML = '';

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    
    // Assign 'user' or 'admin' class based on the sender
    const isMe = msg.sender !== 'admin';
    bubble.className = `message-bubble ${isMe ? 'user' : 'admin'}`;

    const time = new Date(msg.createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    bubble.innerHTML = `
      <div class="message-content">${escapeHtml(msg.message)}</div>
      <div class="message-meta">
        ${isMe ? 'You' : 'Skull Stack Support'} • ${time}
      </div>
    `;

    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

/**
 * Send a new message to the server
 */
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;

  // Visual feedback: clear input immediately
  input.value = '';
  input.placeholder = "Sending...";

  try {
    const res = await fetch(`${API_BASE}/chat/${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    if (res.ok) {
      input.placeholder = "Type a message...";
      fetchMessages(); // Refresh immediately after sending
    } else {
      const data = await res.json();
      alert(data.message || 'Error sending message');
      input.placeholder = "Error occurred. Try again.";
    }
  } catch (err) {
    console.error('Error sending message:', err);
    input.placeholder = "Network error.";
  }
}

/**
 * Security: Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// Initial Load
fetchMessages();

// Set Polling: Check for new messages every 3 seconds
setInterval(fetchMessages, 3000);