// User Auth Frontend Logic
const API_URL = 'http://localhost:5000/api';

// Register
async function registerUser(name, email, password) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    return res.json();
}

// Login
async function loginUser(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
}

// Logout
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.reload();
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Get JWT token
function getToken() {
    return localStorage.getItem('token');
} 