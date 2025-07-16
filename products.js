const API_URL = 'http://localhost:5000/api';

async function fetchProducts() {
    const res = await fetch(`${API_URL}/products`);
    return res.json();
}

// Render products into a container (expects a div or section)
async function renderProducts(containerId) {
    const products = await fetchProducts();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/150'}" alt="${product.name}" style="width:100%;height:150px;object-fit:cover;">
            <h3>${product.name}</h3>
            <p>${product.description || ''}</p>
            <div class="price">$${product.price.toFixed(2)}</div>
            <button class="btn add-to-cart" data-id="${product._id}">Add to Cart</button>
        `;
        container.appendChild(div);
    });
    // Add event listeners for add to cart
    container.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            addToCart(productId, 1);
        });
    });
} 