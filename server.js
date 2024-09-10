const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const session = require('express-session');
const multer = require('multer');
const { check, validationResult } = require('express-validator')
const port = 3001;

const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const app = express();

app.use(express.static(path.join(__dirname )));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true}));
app.use(bodyParser.urlencoded({ extended: true}));
dotenv.config();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure files are saved to the 'uploads' directory within the project
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        // Save the file with a unique name
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const MySQLStore = require('express-mysql-session')(session);

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    store: new MySQLStore({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'social_environment'
    }),
    cookie: { secure: false } // Set secure: true if using HTTPS
}));


app.use(express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.status(401).send('Unauthorized: You need to log in.');
    }
}


const db=mysql.createConnection({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD
})

db.connect((err) => {
    if(err) return console.log("Error connecting to MySQL")
        console.log("Connected to MySQL as id:", db.threadId)
})
db.query('CREATE DATABASE IF NOT EXISTS social_environment',(err,result) => {
    if(err) return console.log('Database social_environment created/checked')
})
db.changeUser({database:'social_environment'}, (err) => {
    if(err) return console.log(err)
        console.log("changed to social_environment")
})

const createUsersTable = `
CREATE TABLE IF NOT EXISTS Users(
id INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(100)NOT NULL UNIQUE,
email VARCHAR(100)NOT NULL UNIQUE,
type ENUM('individual', 'organization')NOT NULL,
password VARCHAR(100)NOT NULL,
profile_image VARCHAR(255),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

db.query(createUsersTable,(err,result) => {
    if(err) return console.log(err)
        console.log("Users Table checked/created")
})

const createReportsTable = `
CREATE TABLE IF NOT EXISTS Reports(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    severity VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
`

db.query(createReportsTable, (err, result) => {
    if (err) return console.log(err);
    console.log("Reports Table checked/created");
});


db.query(createReportsTable,(err,result) => {
    if(err) return console.log(err)
        console.log("Reports Table checked/created")
})

app.post('/api/register', (req, res) => {
    const { username, password, email, type } = req.body; // Destructure the variables from the request body

    if (!username || !password || !email || !type) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash the password using bcrypt
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // SQL query to insert the new user
        const sql = `
            INSERT INTO Users (username, password, email, type) 
            VALUES (?, ?, ?, ?)
        `;

        // Execute the SQL query
        db.query(sql, [username, hash, email, type], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            console.log('User registered successfully:', result);
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});


app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM Users WHERE username = ?';
    db.query(query, [username], (err, result) => {
        if (err) throw err;
        if (result.length === 0) {
            return res.status(404).send(`User ${username} Not found`);
        }

        const user = result[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                req.session.user = {
                    id: user.id,
                    username: user.username
                };
                console.log('Session set:', req.session.user); // Debug line
                res.status(200).send("Login successful");
            } else {
                res.status(401).send("Wrong Password");
            }
        });
    });
});


app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }

        // Clear the session cookie
        res.clearCookie('connect.sid', { path: '/' });

        // Send a success message
        res.status(200).send('Logout successful');
    });
});


app.post('/api/report', upload.single('image'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized: Please log in.');
    }

    const { title, location, severity, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const userId = req.session.user.id;

    const query = `
        INSERT INTO Reports (user_id, title, description, location, severity, image_url) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [userId, title, description, location, severity, image_url], (err, result) => {
        if (err) {
            console.error('Error inserting report:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log('Report submitted successfully:', result);
        res.status(201).json({ message: 'Report submitted successfully' });
    });
});



app.get('/api/reports', (req, res) => {
    const query = `
        SELECT Reports.*, Users.username, Users.profile_image 
        FROM Reports 
        JOIN Users ON Reports.user_id = Users.id
    `;

    db.query(query, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});


// Add this route to handle profile image upload
app.post('/api/upload_profile_image', upload.single('profile_image'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized: Please log in.');
    }

    const userId = req.session.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Update the user's profile image in the database
    const query = 'UPDATE Users SET profile_image = ? WHERE id = ?';
    db.query(query, [imageUrl, userId], (err, result) => {
        if (err) {
            console.error('Error updating profile image:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        console.log('Profile image updated successfully:', result);
        res.status(200).json({ success: true, imageUrl });
    });
});


// Route to get the current user's profile image
app.get('/api/get_profile_image', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in.' });
    }

    const userId = req.session.user.id;

    const query = 'SELECT profile_image FROM Users WHERE id = ?';
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching profile image:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const imageUrl = result[0].profile_image || '/image/account.png'; // Fallback to a default image
        res.status(200).json({ success: true, imageUrl });
    });
});
app.get('/api/get_user_data', (req, res) => {
    // Check if the user is authenticated
    if (req.session && req.session.user) {
        const userId = req.session.user.id; // Get the user's ID from the session

        // Query to get the user data securely from the database
        const query = 'SELECT username, email, profile_image, type FROM Users WHERE id = ?';
        db.query(query, [userId], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }

            if (result.length > 0) {
                // Send back the user data
                const user = result[0];
                res.json({
                    success: true,
                    username: user.username,
                    email: user.email,
                    profileImage: user.profile_image || '/image/account.png',
                    type: user.type // Include the type field in the response
                });
            } else {
                // User not found in the database
                res.status(404).json({ success: false, message: 'User not found' });
            }
        });
    } else {
        // User is not authenticated
        res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
});

app.post('/api/comments', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized: Please log in.');
    }

    const { comment, discussionID } = req.body;
    const userID = req.session.user.id;

    if (!comment || !discussionID) {
        return res.status(400).json({ error: 'Comment and Discussion ID are required' });
    }

    // Insert the comment into the database
    const query = `
        INSERT INTO comments (userID, comment, discussionID)
        VALUES (?, ?, ?)
    `;
    db.query(query, [userID, comment, discussionID], (err, result) => {
        if (err) {
            console.error('Error inserting comment:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Get the updated comment count
        const countQuery = `
            SELECT COUNT(*) AS commentCount
            FROM comments
            WHERE discussionID = ?
        `;
        db.query(countQuery, [discussionID], (err, countResult) => {
            if (err) {
                console.error('Error fetching comment count:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.status(201).json({ message: 'Comment added', commentCount: countResult[0].commentCount });
        });
    });
});



// Route to get comments and comment count for a specific discussion
app.get('/api/comments/:discussionID', (req, res) => {
    const discussionID = req.params.discussionID;

// Query to get all comments with user info and like counts for the discussion
    const commentsQuery = `
        SELECT comments.comment, IFNULL(comments.likes, 0) AS likes, Users.profile_image
        FROM comments
        JOIN Users ON comments.userID = users.id
        WHERE comments.discussionID = ?
    `;


    // Query to count the number of comments
    const countQuery = `
        SELECT COUNT(*) AS commentCount
        FROM comments
        WHERE discussionID = ?
    `;

    // Fetch comments and comment count simultaneously
    db.query(commentsQuery, [discussionID], (err, commentsResult) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        db.query(countQuery, [discussionID], (err, countResult) => {
            if (err) {
                console.error('Error fetching comment count:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log(commentsResult)
            res.json({
                commentCount: countResult[0].commentCount,
                comments: commentsResult
            });
        });
    });
});





app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/report_pollution', (req, res) => {
    res.sendFile(path.join(__dirname, 'report_pollution.html'));
});
app.get('/community', (req, res) => {
    res.sendFile(path.join(__dirname, 'community.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port: ${port}`);
})

