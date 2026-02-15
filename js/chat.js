const API = 'https://skullstack-backend.onrender.com/api';
let currentOrderId = null;
let pollInterval = null;

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Check auth
(function init() {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role === 'admin') {
    window.location.href = 'login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (orderId) {
    openChat(orderId);
  } else {
    window.location.href = 'orders.html';
  }
})();

async function loadOrders() {
  document.querySelector('.chat-section').style.display = 'none';
  document.getElementById('ordersList').style.display = 'block';

  try {
    const res = await fetch(API + '/payment/my-orders', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const orders = await res.json();
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
      container.innerHTML = '<p style="color:#666; padding:20px;">No orders yet. <a href="index.html#services" style="text-decoration:underline;font-weight:bold;">Browse services</a></p>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="order-card" onclick="openChat('${o._id}')">
        <div class="order-info">
          <h4>${o.serviceName}</h4>
          <p>${new Date(o.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="order-amount">$${o.amount}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load orders');
  }
}

function openChat(orderId) {
  currentOrderId = orderId;
  document.querySelector('.chat-section').style.display = 'flex';
  document.getElementById('ordersList').style.display = 'none';
  document.getElementById('chatTitle').textContent = 'Order Chat';
  document.getElementById('chatSubtitle').textContent = 'Order: ' + orderId;

  loadMessages();
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadMessages, 3000);
}

async function loadMessages() {
  if (!currentOrderId) return;
  try {
    const res = await fetch(API + '/chat/' + currentOrderId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const messages = await res.json();
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = messages.map(m => `
      <div class="chat-bubble ${m.sender}">
        <div class="sender">${m.sender === 'client' ? 'You' : 'Admin'}</div>
        ${escapeHtml(m.message)}
        <div class="time">${new Date(m.createdAt).toLocaleTimeString()}</div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  } catch (err) {
    console.error('Failed to load messages');
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message || !currentOrderId) return;

  input.value = '';

  try {
    await fetch(API + '/chat/' + currentOrderId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({ message })
    });
    loadMessages();
  } catch (err) {
    console.error('Failed to send message');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
