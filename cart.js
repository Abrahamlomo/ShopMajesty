const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

// Add or update item in cart
async function addToCart(productId, quantity) {
    const res = await fetch(`${API_URL}/cart`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ productId, quantity })
    });
    return res.json();
}

// Fetch current user's cart
async function fetchCart() {
    const res = await fetch(`${API_URL}/cart`, {
        headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    return res.json();
}

// Render cart into a container
async function renderCart(containerId) {
    const cart = await fetchCart();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!cart.items || cart.items.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }
    cart.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.product.name}</span>
            <span>Qty: ${item.quantity}</span>
            <span>Price: $${item.product.price.toFixed(2)}</span>
            <button class="btn remove-from-cart" data-id="${item.product._id}">Remove</button>
        `;
        container.appendChild(div);
    });
    // Add event listeners for remove
    container.querySelectorAll('.remove-from-cart').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = btn.getAttribute('data-id');
            await removeFromCart(productId);
            renderCart(containerId);
        });
    });
}

// Remove item from cart
async function removeFromCart(productId) {
    await fetch(`${API_URL}/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + getToken() }
    });
}

// Export addToCart for use in products.js
window.addToCart = addToCart; 