// js/chat.js - Client chat page with 3-second polling

const API_BASE = 'https://skullstack.onrender.com/api';

// Get orderId from URL
const params = new URLSearchParams(window.location.search);
const orderId = params.get('orderId');
const token = localStorage.getItem('aethex_token');

if (!orderId || !token) {
  alert('Invalid access. No order or session found.');
  window.location.href = 'index.html';
}

// Display order ID
document.getElementById('chatOrderInfo').textContent = `Order: ${orderId}`;

// Fetch messages
async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE}/chat/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      alert('Session expired or unauthorized. Please purchase a service again.');
      window.location.href = 'index.html';
      return;
    }

    const messages = await res.json();
    renderMessages(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
}

// Render messages in chat
function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.6; margin-top:40px;">No messages yet. Say hello!</p>';
    return;
  }

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender}`;

    const time = new Date(msg.createdAt).toLocaleString();
    bubble.innerHTML = `
      <div>${escapeHtml(msg.message)}</div>
      <div class="message-meta">${msg.sender === 'admin' ? 'AETHEX Team' : 'You'} · ${time}</div>
    `;

    container.appendChild(bubble);
  });

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Send message
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

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
      input.value = '';
      fetchMessages();
    } else {
      const data = await res.json();
      alert(data.message || 'Error sending message');
    }
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// Initial fetch + polling every 3 seconds
fetchMessages();
setInterval(fetchMessages, 3000);
