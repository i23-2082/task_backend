const result = require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { Pool } = require('pg');
const connectPgSimple = require('connect-pg-simple')(session);
const { db, pgPool } = require('./db');
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const taskRoutes = require('./routes/tasks');
const usersRouter = require('./routes/users');
const rateLimit = require('express-rate-limit');

if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  process.exit(1);
}

const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set`);
    process.exit(1);
  }
}

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ['https://task-frontend-gf8v.vercel.app', 'http://localhost:3000'],
    credentials: true,
  })
);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new connectPgSimple({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: false, // We'll handle this manually if needed
});

const createSessionTable = async () => {
  try {
    const exists = await db.schema.hasTable('session');
    if (!exists) {
      await db.schema.createTable('session', (table) => {
        table.string('sid').primary();
        table.jsonb('sess').notNullable();
        table.timestamp('expire').notNullable();
      });
      console.log('Session table created');
    }
  } catch (err) {
    console.error('Error creating session table:', err);
    process.exit(1);
  }
};

createSessionTable().then(() => {
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
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
});
app.use('/auth', authLimiter);

app.use('/auth', authRoutes);
app.use('/teams', teamRoutes);
app.use('/tasks', taskRoutes);
app.use('/users', usersRouter);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

db.raw('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch((err) => {
    console.error('Database connection error:', err);
    // Do not exit here in serverless; let it fail gracefully
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
