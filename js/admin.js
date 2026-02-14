// js/admin.js - Admin panel: login, orders list, chat

const API_BASE = 'https://skullstack.onrender.com/api';

let adminToken = localStorage.getItem('aethex_admin_token');
let currentOrderId = null;
let pollInterval = null;

// Check if already logged in
if (adminToken) {
  showDashboard();
}

// Admin login
async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();

  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      adminToken = data.token;
      localStorage.setItem('aethex_admin_token', adminToken);
      showDashboard();
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (err) {
    alert('Login error. Is the server running?');
    console.error(err);
  }
}

// Show dashboard, hide login
function showDashboard() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  fetchOrders();
}

// Logout
function adminLogout() {
  localStorage.removeItem('aethex_admin_token');
  adminToken = null;
  if (pollInterval) clearInterval(pollInterval);
  document.getElementById('adminLogin').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
}

// Fetch all paid orders
async function fetchOrders() {
  try {
    const res = await fetch(`${API_BASE}/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 401 || res.status === 403) {
      alert('Session expired. Please login again.');
      adminLogout();
      return;
    }

    const orders = await res.json();
    renderOrders(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
  }
}

// Render orders list
function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  container.innerHTML = '';

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.6; margin-top:40px;">No paid orders yet.</p>';
    return;
  }

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.onclick = () => openOrderChat(order._id, order.serviceName);

    const date = new Date(order.createdAt).toLocaleDateString();
    const clientName = order.userId ? order.userId.name : 'Unknown';
    const clientEmail = order.userId ? order.userId.email : '';

    card.innerHTML = `
      <div class="order-info">
        <h4>${escapeHtml(order.serviceName)}</h4>
        <p>${escapeHtml(clientName)} · ${escapeHtml(clientEmail)} · ${date}</p>
      </div>
      <div class="order-amount">$${order.amount.toLocaleString()}</div>
    `;

    container.appendChild(card);
  });
}

// Open chat for a specific order
function openOrderChat(orderId, serviceName) {
  currentOrderId = orderId;
  document.getElementById('ordersList').style.display = 'none';
  document.getElementById('adminChatView').style.display = 'block';
  document.getElementById('adminChatTitle').textContent = `Chat – ${serviceName}`;
  document.querySelector('.admin-header').style.display = 'none';

  fetchAdminMessages();
  // Start polling
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchAdminMessages, 3000);
}

// Back to orders list
function backToOrders() {
  currentOrderId = null;
  if (pollInterval) clearInterval(pollInterval);
  document.getElementById('adminChatView').style.display = 'none';
  document.getElementById('ordersList').style.display = 'flex';
  document.querySelector('.admin-header').style.display = 'flex';
}

// Fetch messages for current order (admin)
async function fetchAdminMessages() {
  if (!currentOrderId) return;

  try {
    const res = await fetch(`${API_BASE}/chat/${currentOrderId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const messages = await res.json();
    renderAdminMessages(messages);
  } catch (err) {
    console.error('Error fetching admin messages:', err);
  }
}

// Render admin chat messages
function renderAdminMessages(messages) {
  const container = document.getElementById('adminChatMessages');
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.6; margin-top:40px;">No messages yet.</p>';
    return;
  }

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.sender}`;

    const time = new Date(msg.createdAt).toLocaleString();
    bubble.innerHTML = `
      <div>${escapeHtml(msg.message)}</div>
      <div class="message-meta">${msg.sender === 'admin' ? 'You (Admin)' : 'Client'} · ${time}</div>
    `;

    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

// Admin send message
async function adminSendMessage() {
  const input = document.getElementById('adminMessageInput');
  const message = input.value.trim();
  if (!message || !currentOrderId) return;

  try {
    const res = await fetch(`${API_BASE}/chat/${currentOrderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ message })
    });

    if (res.ok) {
      input.value = '';
      fetchAdminMessages();
    } else {
      const data = await res.json();
      alert(data.message || 'Error sending message');
    }
  } catch (err) {
    console.error('Error sending admin message:', err);
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}
