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

// Check admin auth
(function init() {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role !== 'admin') {
    window.location.href = 'adminlogin.html';
    return;
  }
  loadOrders();
})();

async function loadOrders() {
  try {
    const res = await fetch(API + '/admin/orders', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.href = 'adminlogin.html';
        return;
      }
    }
    const orders = await res.json();
    const container = document.getElementById('ordersContainer');

    if (orders.length === 0) {
      container.innerHTML = '<p style="color:#666; padding:10px;">No paid orders yet.</p>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="order-card ${currentOrderId === o._id ? 'active' : ''}" onclick="openChat('${o._id}', '${escapeAttr(o.serviceName)}', '${o.userId ? escapeAttr(o.userId.name || 'Unknown') : 'Unknown'}', ${o.amount})">
        <div class="order-info">
          <h4>${escapeHtml(o.serviceName)}</h4>
          <p>${o.userId ? escapeHtml(o.userId.name) : 'Unknown'} &bull; ${new Date(o.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="order-amount">$${o.amount}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load orders');
  }
}

function openChat(orderId, serviceName, clientName, amount) {
  currentOrderId = orderId;
  document.getElementById('adminChat').style.display = 'flex';
  document.getElementById('chatTitle').textContent = serviceName || 'Order Chat';
  document.getElementById('chatSubtitle').textContent = `Client: ${clientName} | $${amount}`;

  // Update active state
  document.querySelectorAll('.order-card').forEach(c => c.classList.remove('active'));
  event.currentTarget.classList.add('active');

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
        <div class="sender">${m.sender === 'admin' ? 'You (Admin)' : 'Client'}</div>
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

function escapeAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
