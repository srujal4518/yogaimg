const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// ✅ Serve Static Files (current directory, not public folder)
app.use(express.static(__dirname));

// ✅ Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log("Error: " + err));

// ✅ Define User Schema & Model
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});
const User = mongoose.model("User", userSchema);

// ✅ Define Checkout Schema & Model
const checkoutSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    age: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    membershipType: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Checkout = mongoose.model("Checkout", checkoutSchema);

// ✅ Serve index.html on root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Serve hello.html on /hello route (requires login)
app.get("/hello", (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Please login first!" });
    }
    res.sendFile(path.join(__dirname, "hello.html"));
});

// ✅ Handle Registration
app.post("/register", async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered!" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "Registration successful!", redirectUrl: "/index.html" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user." });
    }
});

// ✅ Handle Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Please register first!" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid password!" });
        }

        req.session.user = { name: user.name, email: user.email };
        res.status(200).json({ message: "Login successful!", redirectUrl: "/index.html" });
    } catch (err) {
        res.status(500).json({ message: "Error logging in." });
    }
});

// ✅ Handle Checkout Submission
app.post("/api/checkout", async (req, res) => {
    try {
        // Ensure user is logged in before checkout
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: "Please login to proceed with checkout!" });
        }

        const { fullName, email, age, paymentMethod, membershipType, totalPrice } = req.body;

        if (!fullName || !email || !age || !paymentMethod || !membershipType || !totalPrice) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const checkoutData = new Checkout({ fullName, email, age, paymentMethod, membershipType, totalPrice });
        await checkoutData.save();

        res.status(201).json({ message: "Order placed successfully!", redirectUrl: "success.html" });
    } catch (error) {
        console.error("Error in checkout:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
