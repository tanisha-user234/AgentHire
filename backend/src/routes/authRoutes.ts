import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getDb } from '../config/database';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role = 'candidate' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  await db.prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, email, hash, role, firstName || '', lastName || '');

  if (role === 'candidate') {
    const candidateId = uuidv4();
    await db.prepare('INSERT INTO candidates (id, user_id) VALUES (?, ?)').run(candidateId, id);
  }

  const user = { id, email, role };
  const token = generateToken(user);
  res.status(201).json({ token, user: { id, email, role, firstName, lastName } });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name }
  });
}));

router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key') as any;
  const db = getDb();
  const user = await db.prepare('SELECT id, email, role, first_name, last_name FROM users WHERE id = ?').get(decoded.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name });
}));

export default router;
