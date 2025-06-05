const result = require('dotenv').config();
if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  process.exit(1);
}

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Pool } = require('pg');
const connectPgSimple = require('connect-pg-simple')(session);
const { db } = require('./db');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const taskRoutes = require('./routes/tasks');
const usersRouter = require('./routes/users');
const cors = require('cors');

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set');
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  console.error('Error: SESSION_SECRET is not set');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET is not set');
  process.exit(1);
}

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new connectPgSimple({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true,
});

db.raw('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/teams', teamRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', usersRouter);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));