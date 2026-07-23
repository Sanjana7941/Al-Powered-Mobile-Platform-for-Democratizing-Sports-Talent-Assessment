const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'athletavision-ai-super-secret-key-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      sport TEXT,
      age INTEGER,
      bio TEXT,
      profile_pic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Assessments Table
    db.run(`CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      sport TEXT,
      drill_name TEXT,
      score INTEGER,
      technique_score INTEGER,
      speed_score INTEGER,
      power_score INTEGER,
      feedback TEXT,
      video_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Create Connections Table
    db.run(`CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scout_id INTEGER,
      athlete_id INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(scout_id, athlete_id)
    )`);

    // Seed mock data if database is brand new
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) return console.error('Seeding check failed:', err);
      if (row.count === 0) {
        seedMockData();
      }
    });
  });
}

function seedMockData() {
  console.log('Seeding mock data for athletes, scouts, and assessments...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPassword = bcrypt.hashSync('password123', salt);

  const mockUsers = [
    { username: 'athlete_kofi', password: defaultPassword, role: 'athlete', name: 'Kofi Mensah', sport: 'Football', age: 17, bio: 'Aspiring winger from Accra. Known for lightning speed and precise ball control.', profile_pic: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&auto=format&fit=crop&q=60' },
    { username: 'athlete_clara', password: defaultPassword, role: 'athlete', name: 'Clara Dubois', sport: 'Basketball', age: 18, bio: 'Point guard with high spatial awareness. Focus on high-percentage three-pointers.', profile_pic: 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=150&auto=format&fit=crop&q=60' },
    { username: 'athlete_marcus', password: defaultPassword, role: 'athlete', name: 'Marcus Johnson', sport: 'Athletics', age: 16, bio: '100m/200m sprinter. Working on block starts and arm drive dynamics.', profile_pic: 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=150&auto=format&fit=crop&q=60' },
    { username: 'scout_alex', password: defaultPassword, role: 'scout', name: 'Alex Carter', sport: 'Football', age: 42, bio: 'Senior Talent scout for Elite Football Academy. Focused on youth development.', profile_pic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=60' },
    { username: 'scout_sarah', password: defaultPassword, role: 'scout', name: 'Sarah Jenkins', sport: 'Basketball', age: 37, bio: 'Regional Scout for Global Hoops Recruiting. Spotting elite ball handlers.', profile_pic: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=60' }
  ];

  const stmtUser = db.prepare(`INSERT INTO users (username, password, role, name, sport, age, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  
  mockUsers.forEach((u) => {
    stmtUser.run(u.username, u.password, u.role, u.name, u.sport, u.age, u.bio, u.profile_pic, function(err) {
      if (err) return console.error('Error seeding user:', err);
      
      const userId = this.lastID;
      // Add assessments for athletes
      if (u.role === 'athlete') {
        if (u.sport === 'Football') {
          db.run(`INSERT INTO assessments (user_id, sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url) VALUES 
            (${userId}, 'Football', 'Shuttle Run & Dribbling', 88, 85, 92, 86, 'Exceptional pace. Center of gravity is well-balanced during quick turns. Needs minor adjustment in inside-foot control.', 'mock_football_1.mp4'),
            (${userId}, 'Football', 'Penalty Precision', 84, 88, 78, 85, 'Solid leg snap and follow-through. Hit the top-right bin consistently. Speed can be improved.', 'mock_football_2.mp4')
          `);
        } else if (u.sport === 'Basketball') {
          db.run(`INSERT INTO assessments (user_id, sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url) VALUES 
            (${userId}, 'Basketball', 'Free Throw Release', 92, 95, 85, 95, 'Flawless elbow alignment and wrist flick. Arc angle matches optimal trajectory (48 degrees). Release height is consistent.', 'mock_basketball_1.mp4'),
            (${userId}, 'Basketball', 'Agility Suicide Drills', 81, 80, 84, 80, 'Decent foot placement. Deceleration can be refined to reduce knee loading. Excellent lateral speed.', 'mock_basketball_2.mp4')
          `);
        } else if (u.sport === 'Athletics') {
          db.run(`INSERT INTO assessments (user_id, sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url) VALUES 
            (${userId}, 'Athletics', '100m Sprint Start', 90, 89, 94, 88, 'Reaction time is highly competitive. Great block clearance angle (approx 45 degrees). Stride frequency hits peak quickly.', 'mock_sprint_1.mp4')
          `);
        }
      }
    });
  });
  stmtUser.finalize();
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// API Routes

// 1. Auth Endpoint: Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, role, name, sport, age, bio, profilePic } = req.body;
  if (!username || !password || !role || !name) {
    return res.status(400).json({ message: 'All fields (username, password, role, name) are required.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const defaultPic = profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60';

  const query = `INSERT INTO users (username, password, role, name, sport, age, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [username, hash, role, name, sport || '', age || null, bio || '', defaultPic], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Username already exists.' });
      }
      return res.status(500).json({ message: 'Database error occurred.' });
    }
    const token = jwt.sign({ id: this.lastID, username, role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: this.lastID, username, role, name } });
  });
});

// 2. Auth Endpoint: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required.' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server database error' });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        sport: user.sport
      }
    });
  });
});

// 3. Auth Endpoint: Current User profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get("SELECT id, username, role, name, sport, age, bio, profile_pic FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ message: 'Database query error' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  });
});

// 4. Assessment: Submit new assessment
app.post('/api/assessments', authenticateToken, (req, res) => {
  const { sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url } = req.body;
  const userId = req.user.id;

  const query = `INSERT INTO assessments (user_id, sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [userId, sport, drill_name, score, technique_score, speed_score, power_score, feedback, video_url || 'camera_capture.mp4'], function(err) {
    if (err) return res.status(500).json({ message: 'Failed to record assessment.' });
    res.status(201).json({ message: 'Assessment recorded successfully', assessmentId: this.lastID });
  });
});

// 5. Assessment: Get user assessment history
app.get('/api/assessments/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all("SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC", [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database fetch failed' });
    res.json(rows);
  });
});

// 6. Scout: Get all athletes sorted by highest average score
app.get('/api/scout/athletes', authenticateToken, (req, res) => {
  const { sport } = req.query;
  let query = `
    SELECT u.id, u.name, u.sport, u.age, u.bio, u.profile_pic,
           AVG(a.score) as avg_score, COUNT(a.id) as drill_count
    FROM users u
    LEFT JOIN assessments a ON u.id = a.user_id
    WHERE u.role = 'athlete'
  `;
  const params = [];
  if (sport) {
    query += ` AND u.sport = ?`;
    params.push(sport);
  }
  query += ` GROUP BY u.id ORDER BY avg_score DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database fetch failed' });
    
    // Fetch individual drills for each athlete to provide rich scout views
    db.all("SELECT * FROM assessments", (err2, allDrills) => {
      if (err2) return res.status(500).json({ message: 'Database fetch failed for drill details' });
      
      const athletes = rows.map(athlete => {
        athlete.drills = allDrills.filter(d => d.user_id === athlete.id);
        athlete.avg_score = athlete.avg_score ? Math.round(athlete.avg_score) : 0;
        return athlete;
      });
      res.json(athletes);
    });
  });
});

// 7. Scout: Connect with an athlete
app.post('/api/scout/connect', authenticateToken, (req, res) => {
  if (req.user.role !== 'scout') {
    return res.status(403).json({ message: 'Only scouts can initiate contact.' });
  }
  const { athlete_id } = req.body;
  const scoutId = req.user.id;

  db.run("INSERT INTO connections (scout_id, athlete_id, status) VALUES (?, ?, 'pending')", [scoutId, athlete_id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Connection request already sent.' });
      }
      return res.status(500).json({ message: 'Failed to request contact.' });
    }
    res.status(201).json({ message: 'Connection request sent successfully!' });
  });
});

// 8. Scout: Get current connections
app.get('/api/scout/connections', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let query = '';
  if (role === 'scout') {
    query = `
      SELECT c.id, c.status, c.created_at, u.name, u.sport, u.age, u.profile_pic, u.bio
      FROM connections c
      JOIN users u ON c.athlete_id = u.id
      WHERE c.scout_id = ?
    `;
  } else {
    query = `
      SELECT c.id, c.status, c.created_at, u.name, u.bio, u.profile_pic
      FROM connections c
      JOIN users u ON c.scout_id = u.id
      WHERE c.athlete_id = ?
    `;
  }

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database fetch failed for connections.' });
    res.json(rows);
  });
});

// Serve frontend routing for SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
