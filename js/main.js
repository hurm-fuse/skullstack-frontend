// js/main.js - Landing page: Buy flow + Razorpay integration

const API_BASE = 'https://skullstack.onrender.com/api';

let selectedService = '';
let selectedAmount = 0;

// Open the customer info modal
function openBuyModal(serviceName, amount) {
  selectedService = serviceName;
  selectedAmount = amount;
  document.getElementById('buyModal').classList.add('active');
}

// Close modal on overlay click
document.getElementById('buyModal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('active');
  }
});


// Initiate payment
async function initiatePayment() {

  // ✅ FIRST get name & email
  const name = document.getElementById('customerName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();

  if (!name || !email) {
    alert('Please enter your name and email.');
    return;
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  // =========================
  // 🎁 FREE OFFER FLOW
  // =========================
  if (selectedAmount === 0) {
    try {
      const res = await fetch(`${API_BASE}/payment/free-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: selectedService,
          name,
          email
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error claiming offer');
        return;
      }

      // Close modal
      document.getElementById('buyModal').classList.remove('active');

      // Save token & redirect
      localStorage.setItem('aethex_token', data.token);
      window.location.href = `chat.html?orderId=${data.orderId}`;

    } catch (err) {
      console.error("FREE ORDER ERROR:", err);
      alert('Server error. Please try again.');
    }

    return; // IMPORTANT
  }

  // =========================
  // 💳 PAID FLOW (RAZORPAY)
  // =========================
  try {

    const res = await fetch(`${API_BASE}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: selectedService,
        amount: selectedAmount,
        name,
        email
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Error creating order');
      return;
    }

    // Close modal
    document.getElementById('buyModal').classList.remove('active');

    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: 'AETHEX',
      description: selectedService,
      order_id: data.razorpayOrderId,
      handler: async function (response) {

        try {
          const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.orderId
            })
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok) {
            alert(verifyData.message || 'Payment verification failed');
            return;
          }

          localStorage.setItem('aethex_token', data.token);
          window.location.href = `chat.html?orderId=${verifyData.orderId}`;

        } catch (err) {
          console.error("VERIFY ERROR:", err);
          alert('Payment verification error.');
        }
      },
      prefill: {
        name: name,
        email: email
      },
      theme: {
        color: '#D2042D'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    alert('Something went wrong. Please try again.');
  }
}
