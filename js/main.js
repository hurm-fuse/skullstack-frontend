const API = 'https://skullstack-backend.onrender.com/api';
const RAZORPAY_KEY = 'rzp_live_SFdeeqswIPt7lX'; // Replace with your actual key if needed

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

// Update nav based on auth state
(function updateNav() {
  const user = getUser();
  const navLinks = document.querySelector('.nav-links');
  if (user && navLinks) {
    navLinks.innerHTML = `
      <a href="orders.html">My Orders</a>
      <a href="#" onclick="logoutUser()">Logout</a>
    `;
  }
})();

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function openModal(title, message) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
  document.getElementById('modalClose').style.display = 'none';
  document.getElementById('paymentModal').classList.add('active');
}

function closeModal() {
  document.getElementById('paymentModal').classList.remove('active');
}

async function buyService(serviceName, amount) {
  const token = getToken();
  if (!token) {
    // If not logged in, redirect to login
    window.location.href = 'login.html';
    return;
  }

  openModal('Processing', 'Creating your order...');

  try {
    // Call the API for ALL orders (even free ones)
    const res = await fetch(API + '/payment/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ serviceName, amount })
    });

    const data = await res.json();

    if (!res.ok) {
      openModal('Error', data.error || 'Failed to create order');
      document.getElementById('modalClose').style.display = 'block';
      return;
    }

    // --- FIX: Check for Free Order Response ---
    if (data.free) {
      openModal('Success!', 'Service claimed! Redirecting...');
      setTimeout(() => {
        window.location.href = 'chat.html?orderId=' + data.orderId;
      }, 1500);
      return; // Stop here, no Razorpay needed
    }
    // ------------------------------------------

    closeModal();

    // Proceed with Razorpay for paid orders
    const options = {
      key: RAZORPAY_KEY,
      amount: data.amount,
      currency: 'INR',
      name: 'Skull Stack',
      description: serviceName,
      order_id: data.razorpayOrderId,
      handler: async function (response) {
        openModal('Verifying', 'Verifying your payment...');
        try {
          const verifyRes = await fetch(API + '/payment/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            openModal('Success!', 'Payment successful! Redirecting to chat...');
            setTimeout(() => {
              window.location.href = 'chat.html?orderId=' + verifyData.orderId;
            }, 1500);
          } else {
            openModal('Error', verifyData.error || 'Verification failed');
            document.getElementById('modalClose').style.display = 'block';
          }
        } catch (err) {
          openModal('Error', 'Verification failed. Please contact support.');
          document.getElementById('modalClose').style.display = 'block';
        }
      },
      prefill: {
        name: getUser()?.name || '',
        email: ''
      },
      theme: {
        color: '#273EA5'
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function () {
      openModal('Payment Failed', 'Your payment could not be processed. Please try again.');
      document.getElementById('modalClose').style.display = 'block';
    });
    rzp.open();

  } catch (err) {
    console.error(err);
    openModal('Error', 'Something went wrong. Please try again.');
    document.getElementById('modalClose').style.display = 'block';
  }
}