// js/main.js

const API_BASE = 'https://skullstack.onrender.com/api';

// Variables to hold current selection
let selectedService = '';
let selectedAmount = 0;

// Ensure functions are available globally for HTML onclick attributes
window.openBuyModal = function(serviceName, amount) {
  selectedService = serviceName;
  selectedAmount = amount;
  
  const modal = document.getElementById('buyModal');
  if (modal) {
    modal.classList.add('active');
  } else {
    console.error("Error: Modal with ID 'buyModal' not found in HTML.");
  }
};

window.initiatePayment = async function() {
  // 1. Get Input Values
  const nameInput = document.getElementById('customerName');
  const emailInput = document.getElementById('customerEmail');

  if (!nameInput || !emailInput) {
    alert("Error: Input fields not found.");
    return;
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();

  // 2. Validations
  if (!name || !email) {
    alert('Please enter your name and email.');
    return;
  }

  // Basic email regex validation
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

      // Save token & redirect to Chat
      localStorage.setItem('aethex_token', data.token);
      window.location.href = `chat.html?orderId=${data.orderId}`;

    } catch (err) {
      console.error("FREE ORDER ERROR:", err);
      alert('Server error. Please try again.');
    }
    return;
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

    // Close modal while payment processes
    document.getElementById('buyModal').classList.remove('active');

    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: 'AETHEX', // Or 'Skull Stack' if you prefer
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
};


// =========================
// EVENT LISTENERS (Run when HTML is loaded)
// =========================
document.addEventListener('DOMContentLoaded', () => {

  // 1. Close Modal Logic (Clicking outside the box)
  const modal = document.getElementById('buyModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      // If the user clicks the overlay (this), close it.
      // If they click the .modal-box, do nothing.
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  }

  // 2. Contact Form Logic (Replaces the inline script in your HTML)
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault(); // Stop page reload
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = "Sending...";
      submitBtn.disabled = true;

      const formData = new FormData(contactForm);

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          window.location.href = "thankyou.html";
        } else {
          alert("Error sending form. Try again!");
          submitBtn.innerText = originalText;
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        alert("Error sending form. Try again!");
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    });
  }
});