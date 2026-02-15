const API = 'https://skullstack-backend.onrender.com/api';

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

// Auth check
(function init() {
  const token = getToken();
  const user = getUser();
  if (!token || !user || user.role === 'admin') {
    window.location.href = 'login.html';
    return;
  }
  loadOrders();
})();

async function loadOrders() {
  try {
    const res = await fetch(API + '/payment/my-orders', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const orders = await res.json();
    const container = document.getElementById('ordersContainer');
    const emptyState = document.getElementById('emptyState');

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    // Update stats
    document.getElementById('statTotal').textContent = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);
    document.getElementById('statSpent').textContent = '$' + totalSpent;
    document.getElementById('statRecent').textContent = new Date(orders[0].createdAt).toLocaleDateString();

    container.innerHTML = orders.map((o, i) => `
      <div class="order-row">
        <div class="order-row-left">
          <div class="order-number">#${orders.length - i}</div>
          <div class="order-details">
            <h4>${escapeHtml(o.serviceName)}</h4>
            <p class="order-date">${new Date(o.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
        <div class="order-row-right">
          <span class="order-status">Paid</span>
          <span class="order-price">$${o.amount}</span>
          <a href="chat.html?orderId=${o._id}" class="btn-chat">Chat</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load orders:', err);
    document.getElementById('ordersContainer').innerHTML = '<p style="color:#e74c3c;padding:20px;">Failed to load orders. Please try again.</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
