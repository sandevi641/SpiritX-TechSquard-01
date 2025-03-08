const express = require("express");
const mysql = require("mysql2"); // Using mysql2 instead of mysql for better compatibility
const bcrypt = require("bcrypt");
const cors = require("cors");
require('dotenv').config(); // To use environment variables

const app = express();
app.use(express.json());
app.use(cors());

// Use environment variables for credentials (create a .env file with these variables)
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost", // Default to localhost
    user: process.env.DB_USER || "root",     // Default to root (adjust for your setup)
    password: process.env.DB_PASSWORD || "", // Password from environment variable
    database: process.env.DB_NAME || "secureconnect" // Default database name
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database.");
    }
});

app.post("/check-username", (req, res) => {
    const { username } = req.body;

    db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json({ available: results.length === 0 }); // True if username is available
    });
});



app.post("/signup", async (req, res) => {
    console.log(req.body);  // Log the incoming request data for debugging

    const { username, password, confirmPassword } = req.body; // ✅ Fixed

    // Validate password and confirm password match
    if (!username || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // Check if username exists
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Error checking username" });

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }

        // Hash the password using bcrypt
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into the database
            db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err) => { // ✅ Fixed column name
                if (err) return res.status(500).json({ success: false, message: "Error registering user" });

                // ✅ Send success response after user is successfully registered
                res.json({ success: true, message: "Successfully signed up!" });
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "Error hashing password" });
        }
    });
});




app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Validate that the username and password fields are provided
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    // Check if the username exists
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const user = results[0];

        // Compare the password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            res.json({ success: true, message: "Successfully logged in!" });
            console.log("Succ")
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
            
        }
    });
});
app.get('/dashboard', (req, res) => {
    // Render the dashboard page if the user is logged in
    res.sendFile(__dirname + 'dashboard.html');
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});


