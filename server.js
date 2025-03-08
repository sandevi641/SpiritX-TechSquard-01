const express = require("express");
const mysql = require("mysql2"); 
const bcrypt = require("bcrypt");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());


const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",     
    password: process.env.DB_PASSWORD || "", 
    database: process.env.DB_NAME || "secureconnect" 
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
        res.json({ available: results.length === 0 }); 
    });
});



app.post("/signup", async (req, res) => {
    console.log(req.body);  

    const { username, password, confirmPassword } = req.body;

    
    if (!username || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

   
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Error checking username" });

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: "Username already exists" });
        }

       
        try {
            const hashedPassword = await bcrypt.hash(password, 10);

           
            db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err) => { 
                if (err) return res.status(500).json({ success: false, message: "Error registering user" });

               
                res.json({ success: true, message: "Successfully signed up!" });
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "Error hashing password" });
        }
    });
});




app.post("/login", async (req, res) => {
    const { username, password } = req.body;

  
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
    }

   
    db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const user = results[0];

      
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
   
    res.sendFile(__dirname + 'dashboard.html');
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});


