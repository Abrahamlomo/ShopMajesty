// File: server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();

import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
// sw.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('shop-cache').then((cache) => cache.addAll(['/', '/styles.css', '/app.js']))
  );
});
// server.js
const express = require('express');
const app = express();
app.get('/api/products', (req, res) => {
  res.json([{ id: 1, name: "Product 1" }]);
});
app.listen(3000);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['seller', 'buyer'], default: 'buyer' },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String, default: 'box' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true },
  commission: { type: Number, required: true },
  earnings: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['completed', 'processing', 'cancelled'], 
    default: 'processing' 
  },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// Auth Middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const seller = (req, res, next) => {
  if (req.user && req.user.role === 'seller') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a seller' });
  }
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    user = new User({ name, email, password, role });
    await user.save();
    
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('seller', 'name');
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products/my', protect, seller, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/products', protect, seller, async (req, res) => {
  const { name, description, price, category } = req.body;
  
  try {
    const product = new Product({
      name,
      description,
      price,
      category,
      seller: req.user._id
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Order Routes
app.get('/api/orders', protect, seller, async (req, res) => {
  try {
    // Get seller's products
    const products = await Product.find({ seller: req.user._id });
    const productIds = products.map(p => p._id);
    
    // Get orders for seller's products
    const orders = await Order.find({ product: { $in: productIds } })
      .populate('product', 'name')
      .populate('customer', 'name');
      
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/orders', protect, async (req, res) => {
  const { productId } = req.body;
  
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Calculate commission (10%)
    const commission = product.price * 0.1;
    const earnings = product.price - commission;
    
    // Create order
    const order = new Order({
      product: productId,
      customer: req.user._id,
      price: product.price,
      commission,
      earnings,
      status: 'processing'
    });
    
    await order.save();
    
    // Update seller's balance
    const seller = await User.findById(product.seller);
    seller.balance += earnings;
    await seller.save();
    
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Routes
app.get('/api/users/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users/withdraw', protect, seller, async (req, res) => {
  const { amount } = req.body;
  
  try {
    const user = await User.findById(req.user._id);
    
    if (amount > user.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // In a real application, this would integrate with a payment gateway
    user.balance -= amount;
    await user.save();
    
    res.json({ message: `Withdrawal request for $${amount} submitted successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Stats Route
app.get('/api/stats', protect, seller, async (req, res) => {
  try {
    // Get seller's products
    const products = await Product.find({ seller: req.user._id });
    const productIds = products.map(p => p._id);
    
    // Get orders for seller's products
    const orders = await Order.find({ product: { $in: productIds } });
    
    // Calculate stats
    const totalSales = orders.reduce((sum, order) => sum + order.price, 0);
    const totalEarnings = orders.reduce((sum, order) => sum + order.earnings, 0);
    const productsListed = products.length;
    const ordersCompleted = orders.filter(o => o.status === 'completed').length;
    
    res.json({
      totalSales,
      totalEarnings,
      productsListed,
      ordersCompleted,
      availableEarnings: req.user.balance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));