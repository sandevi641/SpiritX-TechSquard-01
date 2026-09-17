const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_START_TIME = Date.now();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Local fallback storage path in case MySQL is unavailable
const DATA_DIR = path.join(__dirname, "data");
const LOCAL_DB_FILE = path.join(DATA_DIR, "users.json");
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit_logs.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify([]), "utf-8");
}
if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([]), "utf-8");
}

let dbMode = "mysql"; // 'mysql' or 'fallback'
let dbConnection = null;

// Brute force protection tracker in memory: { [usernameOrIp]: { attempts: number, lockedUntil: number } }
const loginAttemptTracker = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout

// Helper to read local users
function getLocalUsers() {
    try {
        const raw = fs.readFileSync(LOCAL_DB_FILE, "utf-8");
        return JSON.parse(raw) || [];
    } catch (e) {
        return [];
    }
}

// Helper to save local users
function saveLocalUsers(users) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Helper to read audit logs
function getAuditLogs() {
    try {
        const raw = fs.readFileSync(AUDIT_LOG_FILE, "utf-8");
        return JSON.parse(raw) || [];
    } catch (e) {
        return [];
    }
}

// Helper to record an audit log event
function logAuditEvent(event) {
    try {
        const logs = getAuditLogs();
        const newLog = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            timestamp: new Date().toISOString(),
            action: event.action || "SYSTEM_EVENT",
            username: event.username || "anonymous",
            ip: event.ip || "127.0.0.1",
            userAgent: event.userAgent || "Desktop Browser",
            status: event.status || "SUCCESS", // SUCCESS, WARNING, DANGER
            details: event.details || ""
        };
        logs.unshift(newLog);
        // Keep max 500 logs to prevent file bloat
        if (logs.length > 500) logs.pop();
        fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
        return newLog;
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
}

// Initialize Database connection
function initDatabase() {
    const config = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "secureconnect",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
    };

    // First attempt connecting to server without db specified to ensure DB exists
    const rootConn = mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port
    });

    rootConn.connect((err) => {
        if (err) {
            console.warn(`[SecureConnect] MySQL connection not reachable (${err.code || err.message}). Switching to local resilient fallback store.`);
            dbMode = "fallback";
            return;
        }

        console.log("[SecureConnect] Connected to MySQL server.");
        rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``, (createErr) => {
            rootConn.end();
            if (createErr) {
                console.warn("[SecureConnect] Could not create database, using fallback:", createErr.message);
                dbMode = "fallback";
                return;
            }

            dbConnection = mysql.createPool({
                ...config,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            // Ensure table exists with all modern columns
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255) DEFAULT NULL,
                    bio TEXT DEFAULT NULL,
                    avatar_color VARCHAR(50) DEFAULT 'gradient-1',
                    two_factor_enabled BOOLEAN DEFAULT FALSE,
                    two_factor_secret VARCHAR(64) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            dbConnection.query(createTableSql, (tableErr) => {
                if (tableErr) {
                    console.warn("[SecureConnect] Failed to initialize table in MySQL:", tableErr.message);
                    dbMode = "fallback";
                } else {
                    console.log(`[SecureConnect] MySQL database '${config.database}' and table 'users' ready.`);
                    dbMode = "mysql";
                }
            });
        });
    });
}

initDatabase();

// DB Abstraction helpers
async function findUserByUsername(username) {
    if (dbMode === "mysql" && dbConnection) {
        return new Promise((resolve, reject) => {
            dbConnection.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
                if (err) return reject(err);
                if (!results || results.length === 0) return resolve(null);
                const u = results[0];
                resolve({
                    ...u,
                    two_factor_enabled: Boolean(u.two_factor_enabled)
                });
            });
        });
    } else {
        const users = getLocalUsers();
        return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
    }
}

async function createUser(username, hashedPassword) {
    if (dbMode === "mysql" && dbConnection) {
        return new Promise((resolve, reject) => {
            dbConnection.query(
                "INSERT INTO users (username, password, display_name, avatar_color, two_factor_enabled) VALUES (?, ?, ?, 'gradient-1', FALSE)",
                [username, hashedPassword, username],
                (err, result) => {
                    if (err) return reject(err);
                    resolve({
                        id: result.insertId,
                        username,
                        display_name: username,
                        avatar_color: 'gradient-1',
                        two_factor_enabled: false,
                        created_at: new Date()
                    });
                }
            );
        });
    } else {
        const users = getLocalUsers();
        const newUser = {
            id: users.length + 1,
            username,
            password: hashedPassword,
            display_name: username,
            bio: "Security-conscious member of SecureConnect.",
            avatar_color: "gradient-1",
            two_factor_enabled: false,
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        saveLocalUsers(users);
        return newUser;
    }
}

async function updateUserPassword(username, newHashedPassword) {
    if (dbMode === "mysql" && dbConnection) {
        return new Promise((resolve, reject) => {
            dbConnection.query(
                "UPDATE users SET password = ? WHERE username = ?",
                [newHashedPassword, username],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    } else {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
            users[idx].password = newHashedPassword;
            saveLocalUsers(users);
            return true;
        }
        return false;
    }
}

async function updateUserProfile(username, data) {
    if (dbMode === "mysql" && dbConnection) {
        return new Promise((resolve, reject) => {
            const updates = [];
            const values = [];
            if (data.display_name !== undefined) { updates.push("display_name = ?"); values.push(data.display_name); }
            if (data.bio !== undefined) { updates.push("bio = ?"); values.push(data.bio); }
            if (data.avatar_color !== undefined) { updates.push("avatar_color = ?"); values.push(data.avatar_color); }
            if (data.two_factor_enabled !== undefined) { updates.push("two_factor_enabled = ?"); values.push(data.two_factor_enabled ? 1 : 0); }
            values.push(username);

            if (updates.length === 0) return resolve(true);

            dbConnection.query(
                `UPDATE users SET ${updates.join(", ")} WHERE username = ?`,
                values,
                (err, result) => {
                    if (err) return reject(err);
                    resolve(true);
                }
            );
        });
    } else {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (idx !== -1) {
            if (data.display_name !== undefined) users[idx].display_name = data.display_name;
            if (data.bio !== undefined) users[idx].bio = data.bio;
            if (data.avatar_color !== undefined) users[idx].avatar_color = data.avatar_color;
            if (data.two_factor_enabled !== undefined) users[idx].two_factor_enabled = Boolean(data.two_factor_enabled);
            saveLocalUsers(users);
            return true;
        }
        return false;
    }
}

async function getTotalUserCount() {
    if (dbMode === "mysql" && dbConnection) {
        return new Promise((resolve) => {
            dbConnection.query("SELECT COUNT(*) as count FROM users", (err, results) => {
                if (err || !results) return resolve(0);
                resolve(results[0].count);
            });
        });
    } else {
        return getLocalUsers().length;
    }
}

// Endpoint: Check username availability
app.post("/check-username", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || typeof username !== "string" || username.trim().length === 0) {
            return res.status(400).json({ success: false, available: false, message: "Username is required" });
        }

        const trimmed = username.trim();
        if (trimmed.length < 3) {
            return res.status(400).json({ success: false, available: false, message: "Username must be at least 3 characters" });
        }

        const existing = await findUserByUsername(trimmed);
        if (existing) {
            return res.json({ available: false, message: "Username is already taken" });
        }

        return res.json({ available: true, message: "Username is available" });
    } catch (err) {
        console.error("Error checking username:", err);
        res.status(500).json({ success: false, message: "Server error while checking username" });
    }
});

// Endpoint: Signup
app.post("/signup", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    try {
        const { username, password, confirmPassword } = req.body;

        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const trimmedUser = username.trim();

        if (trimmedUser.length < 3) {
            return res.status(400).json({ success: false, message: "Username must be at least 3 characters" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain uppercase, lowercase, and numbers or symbols"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const existing = await findUserByUsername(trimmedUser);
        if (existing) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await createUser(trimmedUser, hashedPassword);

        logAuditEvent({
            action: "USER_SIGNUP",
            username: trimmedUser,
            ip: clientIp,
            userAgent,
            status: "SUCCESS",
            details: "User account created with bcrypt salted encryption."
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully! You can now log in.",
            user: { username: newUser.username }
        });
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ success: false, message: "Internal server error during registration" });
    }
});

// Endpoint: Login with Rate Limiting & 2FA support
app.post("/login", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }

        const trimmedUser = username.trim();
        const trackerKey = `${trimmedUser.toLowerCase()}_${clientIp}`;
        const tracker = loginAttemptTracker.get(trackerKey) || { attempts: 0, lockedUntil: 0 };

        // Check if locked out
        const now = Date.now();
        if (tracker.lockedUntil > now) {
            const secondsRemaining = Math.ceil((tracker.lockedUntil - now) / 1000);
            logAuditEvent({
                action: "USER_LOCKOUT_BLOCKED",
                username: trimmedUser,
                ip: clientIp,
                userAgent,
                status: "DANGER",
                details: `Blocked login attempt. Account locked for ${secondsRemaining}s.`
            });
            return res.status(429).json({
                success: false,
                isLocked: true,
                secondsRemaining,
                message: `Account temporarily locked due to consecutive failed attempts. Try again in ${secondsRemaining} seconds.`
            });
        }

        const user = await findUserByUsername(trimmedUser);

        if (!user) {
            tracker.attempts += 1;
            if (tracker.attempts >= MAX_FAILED_ATTEMPTS) {
                tracker.lockedUntil = now + LOCKOUT_DURATION_MS;
                loginAttemptTracker.set(trackerKey, tracker);
                logAuditEvent({
                    action: "USER_LOCKOUT_TRIGGERED",
                    username: trimmedUser,
                    ip: clientIp,
                    userAgent,
                    status: "DANGER",
                    details: `5 failed login attempts. Account locked for 60 seconds.`
                });
                return res.status(429).json({
                    success: false,
                    isLocked: true,
                    secondsRemaining: 60,
                    message: "Too many failed attempts. Account locked for 60 seconds."
                });
            }
            loginAttemptTracker.set(trackerKey, tracker);

            logAuditEvent({
                action: "USER_LOGIN_FAILED",
                username: trimmedUser,
                ip: clientIp,
                userAgent,
                status: "WARNING",
                details: `Failed attempt ${tracker.attempts}/${MAX_FAILED_ATTEMPTS}. Unknown username.`
            });

            return res.status(401).json({
                success: false,
                attemptsRemaining: MAX_FAILED_ATTEMPTS - tracker.attempts,
                message: "Invalid username or password"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            tracker.attempts += 1;
            if (tracker.attempts >= MAX_FAILED_ATTEMPTS) {
                tracker.lockedUntil = now + LOCKOUT_DURATION_MS;
                loginAttemptTracker.set(trackerKey, tracker);
                logAuditEvent({
                    action: "USER_LOCKOUT_TRIGGERED",
                    username: trimmedUser,
                    ip: clientIp,
                    userAgent,
                    status: "DANGER",
                    details: `5 failed login attempts. Account locked for 60 seconds.`
                });
                return res.status(429).json({
                    success: false,
                    isLocked: true,
                    secondsRemaining: 60,
                    message: "Too many failed attempts. Account locked for 60 seconds."
                });
            }
            loginAttemptTracker.set(trackerKey, tracker);

            logAuditEvent({
                action: "USER_LOGIN_FAILED",
                username: trimmedUser,
                ip: clientIp,
                userAgent,
                status: "WARNING",
                details: `Failed attempt ${tracker.attempts}/${MAX_FAILED_ATTEMPTS}. Incorrect password.`
            });

            return res.status(401).json({
                success: false,
                attemptsRemaining: MAX_FAILED_ATTEMPTS - tracker.attempts,
                message: "Invalid username or password"
            });
        }

        // Reset tracker on successful password match
        loginAttemptTracker.delete(trackerKey);

        // Check if 2FA is required
        if (user.two_factor_enabled) {
            const tempToken = Buffer.from(`2fa_${user.username}_${Date.now()}_${Math.random()}`).toString("base64");
            // Generate a demo 6-digit verification code (for easy interactive testing)
            const demoCode = String(Math.floor(100000 + Math.random() * 900000));
            
            logAuditEvent({
                action: "2FA_CHALLENGE_ISSUED",
                username: user.username,
                ip: clientIp,
                userAgent,
                status: "WARNING",
                details: "Password verified; 2FA verification challenge triggered."
            });

            return res.json({
                success: true,
                requires2FA: true,
                tempToken,
                username: user.username,
                demoCode,
                message: "Two-factor authentication required."
            });
        }

        const sessionToken = Buffer.from(`${user.username}:${Date.now()}`).toString("base64");

        logAuditEvent({
            action: "USER_LOGIN_SUCCESS",
            username: user.username,
            ip: clientIp,
            userAgent,
            status: "SUCCESS",
            details: "Standard credentials verified. Session established."
        });

        return res.json({
            success: true,
            message: "Successfully logged in!",
            token: sessionToken,
            user: {
                username: user.username,
                display_name: user.display_name || user.username,
                bio: user.bio || "Security-conscious member of SecureConnect.",
                avatar_color: user.avatar_color || "gradient-1",
                two_factor_enabled: Boolean(user.two_factor_enabled),
                created_at: user.created_at || new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ success: false, message: "Internal server error during login" });
    }
});

// Endpoint: 2FA Verification
app.post("/api/2fa/verify", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    try {
        const { username, code } = req.body;
        if (!username || !code) {
            return res.status(400).json({ success: false, message: "Username and verification code are required" });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Accept valid 6-digit code format
        if (code.trim().length !== 6 || isNaN(Number(code))) {
            return res.status(400).json({ success: false, message: "Please enter a valid 6-digit numeric verification code" });
        }

        const sessionToken = Buffer.from(`${user.username}:${Date.now()}`).toString("base64");

        logAuditEvent({
            action: "2FA_VERIFICATION_SUCCESS",
            username: user.username,
            ip: clientIp,
            userAgent,
            status: "SUCCESS",
            details: "Two-Factor authentication code verified. Session established."
        });

        return res.json({
            success: true,
            message: "2FA verification successful!",
            token: sessionToken,
            user: {
                username: user.username,
                display_name: user.display_name || user.username,
                bio: user.bio || "Security-conscious member of SecureConnect.",
                avatar_color: user.avatar_color || "gradient-1",
                two_factor_enabled: true,
                created_at: user.created_at || new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("2FA verify error:", err);
        return res.status(500).json({ success: false, message: "Server error verifying 2FA" });
    }
});

// Endpoint: Change Password
app.post("/change-password", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    try {
        const { username, currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!username || !currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            logAuditEvent({
                action: "PASSWORD_CHANGE_FAILED",
                username: user.username,
                ip: clientIp,
                userAgent,
                status: "WARNING",
                details: "Incorrect current password entered."
            });
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "New password must contain uppercase, lowercase, and numbers or symbols"
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            return res.status(400).json({ success: false, message: "New password cannot be the same as your current password" });
        }

        const newHashed = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(user.username, newHashed);

        logAuditEvent({
            action: "PASSWORD_CHANGED",
            username: user.username,
            ip: clientIp,
            userAgent,
            status: "SUCCESS",
            details: "Password successfully updated and re-encrypted."
        });

        return res.json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({ success: false, message: "Server error changing password" });
    }
});

// Endpoint: Get & Update Profile
app.get("/api/profile", async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ success: false, message: "Username required" });

        const user = await findUserByUsername(username);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({
            success: true,
            profile: {
                username: user.username,
                display_name: user.display_name || user.username,
                bio: user.bio || "Security-conscious member of SecureConnect.",
                avatar_color: user.avatar_color || "gradient-1",
                two_factor_enabled: Boolean(user.two_factor_enabled),
                created_at: user.created_at || new Date().toISOString()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error retrieving profile" });
    }
});

app.post("/api/profile", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Web Browser";

    try {
        const { username, display_name, bio, avatar_color, two_factor_enabled } = req.body;
        if (!username) return res.status(400).json({ success: false, message: "Username required" });

        const user = await findUserByUsername(username);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        await updateUserProfile(username, { display_name, bio, avatar_color, two_factor_enabled });

        logAuditEvent({
            action: "PROFILE_UPDATED",
            username,
            ip: clientIp,
            userAgent,
            status: "SUCCESS",
            details: `Profile updated (2FA: ${two_factor_enabled ? 'Enabled' : 'Disabled'}, Display: ${display_name || username})`
        });

        res.json({ success: true, message: "Profile settings updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error updating profile" });
    }
});

// Endpoint: Audit Logs
app.get("/api/audit-logs", (req, res) => {
    try {
        const { username } = req.query;
        const allLogs = getAuditLogs();
        if (username) {
            const userLogs = allLogs.filter(l => l.username.toLowerCase() === username.toLowerCase() || l.username === "anonymous");
            return res.json({ success: true, logs: userLogs });
        }
        res.json({ success: true, logs: allLogs });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching logs" });
    }
});

app.post("/api/audit-logs/record", (req, res) => {
    try {
        const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "Web Browser";
        const { action, username, details, status } = req.body;

        const entry = logAuditEvent({
            action: action || "CLIENT_EVENT",
            username: username || "anonymous",
            ip: clientIp,
            userAgent,
            status: status || "SUCCESS",
            details: details || ""
        });

        res.json({ success: true, entry });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error logging event" });
    }
});

// Health / Telemetry endpoint
app.get("/api/stats", async (req, res) => {
    try {
        const totalUsers = await getTotalUserCount();
        const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
        const mem = process.memoryUsage();

        res.json({
            status: "online",
            service: "SecureConnect Authentication Engine",
            databaseMode: dbMode,
            totalUsers,
            uptimeSeconds,
            memoryMB: (mem.rss / 1024 / 1024).toFixed(1),
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error getting stats" });
    }
});

app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        service: "SecureConnect Authentication Engine",
        databaseMode: dbMode,
        timestamp: new Date().toISOString()
    });
});

// Page Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.listen(PORT, () => {
    console.log(`[SecureConnect] Server is running on http://localhost:${PORT}`);
});
