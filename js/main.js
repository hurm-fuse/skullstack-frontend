const API_BASE = 'https://skullstack.onrender.com/api';

let selectedService = '';
let selectedAmount = 0;

// Helper: Check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem('skullstack_token');
}

// Open the customer info modal
function openBuyModal(serviceName, amount) {
    if (!isLoggedIn()) {
        alert("Please login first to make a purchase.");
        window.location.href = 'login.html';
        return;
    }
    selectedService = serviceName;
    selectedAmount = amount;
    document.getElementById('displayService').innerText = serviceName;
    document.getElementById('buyModal').classList.add('active');
}

// Close modal
if(document.getElementById('buyModal')) {
    document.getElementById('buyModal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('active');
    });
}

// Auth Forms Handling
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const res = await fetch(`${API_BASE}/admin/login`, { // Reusing admin route or auth route
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('skullstack_token', data.token);
            localStorage.setItem('user_email', email);
            window.location.href = 'index.html';
        } else {
            alert(data.message);
        }
    });
}

if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const res = await fetch(`${API_BASE}/admin/register`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Registration successful! Please login.");
            window.location.href = 'login.html';
        } else {
            alert(data.message);
        }
    });
}

// Initiate payment
async function initiatePayment() {
    const token = localStorage.getItem('skullstack_token');
    
    // 🎁 FREE OFFER FLOW
    if (selectedAmount === 0) {
        try {
            const res = await fetch(`${API_BASE}/payment/free-order`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ serviceName: selectedService })
            });
            const data = await res.json();
            if (res.ok) {
                window.location.href = `chat.html?orderId=${data.orderId}`;
            } else {
                alert(data.message);
            }
        } catch (err) { alert('Server error'); }
        return;
    }

    // 💳 PAID FLOW
    try {
        const res = await fetch(`${API_BASE}/payment/create-order`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ serviceName: selectedService, amount: selectedAmount })
        });
        const data = await res.json();
        if (!res.ok) return alert(data.message);

        const options = {
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            name: 'SkullStack',
            description: selectedService,
            order_id: data.razorpayOrderId,
            handler: async function (response) {
                const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...response, orderId: data.orderId })
                });
                const verifyData = await verifyRes.json();
                if (verifyRes.ok) window.location.href = `chat.html?orderId=${verifyData.orderId}`;
            },
            theme: { color: '#273EA5' }
        };
        new Razorpay(options).open();
    } catch (err) { alert('Error initiating payment'); }
}