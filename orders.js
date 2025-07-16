const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const axios = require('axios');

// Auth middleware
function auth(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid.' });
    }
}

// Place order (checkout)
router.post('/', auth, async (req, res) => {
    const { paymentMethod, paymentToken, paypalOrderId } = req.body;
    try {
        // Get user's cart
        const cart = await Cart.findOne({ user: req.user }).populate('items.product');
        if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty.' });
        // Calculate total
        const items = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price
        }));
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let paymentStatus = 'pending';
        let paymentDetails = {};
        // Stripe payment
        if (paymentMethod === 'card') {
            if (!paymentToken) return res.status(400).json({ message: 'Missing payment token.' });
            const charge = await stripe.paymentIntents.create({
                amount: Math.round(total * 100), // cents
                currency: 'usd',
                payment_method: paymentToken,
                confirm: true
            });
            paymentStatus = charge.status === 'succeeded' ? 'paid' : 'failed';
            paymentDetails = charge;
        }
        // PayPal payment
        else if (paymentMethod === 'paypal') {
            if (!paypalOrderId) return res.status(400).json({ message: 'Missing PayPal order ID.' });
            // Capture PayPal order (client should create order and send orderId)
            const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
            const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
            const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
            // Get access token
            const tokenRes = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token',
                'grant_type=client_credentials',
                { headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
            const accessToken = tokenRes.data.access_token;
            // Capture order
            const captureRes = await axios.post(
                `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
                {},
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            paymentStatus = 'paid';
            paymentDetails = captureRes.data;
        }
        // Save order
        const order = new Order({
            user: req.user,
            items,
            total,
            paymentMethod,
            paymentStatus,
            paymentDetails
        });
        await order.save();
        // Clear cart
        cart.items = [];
        await cart.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Order failed', error: err.message });
    }
});

// Get user's order history
router.get('/', auth, async (req, res) => {
    const orders = await Order.find({ user: req.user }).sort({ createdAt: -1 });
    res.json(orders);
});

// Get order details
router.get('/:id', auth, async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, user: req.user });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
});

module.exports = router; 