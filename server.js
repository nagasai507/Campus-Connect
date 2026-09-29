const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect';

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    course: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'students' }
);

const Student = mongoose.model('Student', studentSchema);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rollNumber: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    branch: { type: String, default: '' },
    year: { type: String, default: '' },
    role: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'users' }
);

const User = mongoose.model('User', userSchema);

const portalRecordSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    recordKey: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { collection: 'portal_records', timestamps: true }
);

portalRecordSchema.index({ kind: 1, ownerEmail: 1, recordKey: 1 }, { unique: true });

const PortalRecord = mongoose.model('PortalRecord', portalRecordSchema);
const portalRecordKinds = new Set(['note', 'event', 'attendance', 'result', 'resume', 'application']);

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is not connected.' });
  }

  next();
}

function validateRecordKind(req, res, next) {
  if (!portalRecordKinds.has(req.params.kind)) {
    return res.status(400).json({ message: 'Unsupported portal record type.' });
  }

  next();
}

app.get('/api/records/:kind', requireDatabase, validateRecordKind, async (req, res) => {
  try {
    const query = { kind: req.params.kind };
    if (req.query.email && req.params.kind !== 'note') {
      query.ownerEmail = String(req.query.email).toLowerCase();
    }

    const records = await PortalRecord.find(query).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, records: records.map(record => ({
      id: record.recordKey,
      email: record.ownerEmail,
      payload: record.payload,
      updatedAt: record.updatedAt
    })) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch portal records', error: error.message });
  }
});

app.put('/api/records/:kind/:key', requireDatabase, validateRecordKind, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const key = String(req.params.key || '').trim();
  const payload = req.body.payload;

  if (!email || !key || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ message: 'Email, record key, and an object payload are required.' });
  }

  try {
    const record = await PortalRecord.findOneAndUpdate(
      { kind: req.params.kind, ownerEmail: email, recordKey: key },
      { $set: { payload } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, record: { id: record.recordKey, email: record.ownerEmail, payload: record.payload } });
  } catch (error) {
    res.status(500).json({ message: 'Unable to save portal record', error: error.message });
  }
});

app.delete('/api/records/:kind', requireDatabase, validateRecordKind, async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const result = await PortalRecord.deleteMany({ kind: req.params.kind, ownerEmail: email });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to clear portal records', error: error.message });
  }
});

app.delete('/api/records/:kind/:key', requireDatabase, validateRecordKind, async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const result = await PortalRecord.deleteOne({
      kind: req.params.kind,
      ownerEmail: email,
      recordKey: req.params.key
    });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete portal record', error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CampusConnect API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongoUri: mongoUri.replace(/\/\/.*@/, '//***@')
  });
});

app.get('/api/students', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB is not connected. Start MongoDB and set MONGODB_URI.'
    });
  }

  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch students', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, rollNumber, phone, branch, year, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'MongoDB is not connected. Please start MongoDB before registration.'
    });
  }

  try {
    const user = await User.create({
      name,
      rollNumber: rollNumber || '',
      email: email.toLowerCase(),
      phone: phone || '',
      branch: branch || '',
      year: year || '',
      role: role || 'Student',
      password
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is not connected. Please start MongoDB before login.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is not connected.' });
  }

  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year,
        phone: user.phone
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch users', error: error.message });
  }
});

app.get('/api/user', async (req, res) => {
  const email = (req.query.email || '').toLowerCase();

  if (!email) return res.status(400).json({ message: 'Email is required.' });
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is not connected.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch user', error: error.message });
  }
});

const staticPath = __dirname;
app.use(express.static(staticPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(staticPath, 'index.html'));
});

const connectMongo = async () => {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn('MongoDB connection failed. Server will still start, but database routes will be unavailable until MongoDB is running.');
    console.warn(error.message);
  }
};

connectMongo();

app.listen(PORT, () => {
  console.log(`CampusConnect server running on http://localhost:${PORT}`);
});