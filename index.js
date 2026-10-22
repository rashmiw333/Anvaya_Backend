const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const { initializeDatabase } = require("./db/db.connect");

const User = require("./models/user.model");
const Team = require("./models/team.model");
const Project = require("./models/project.model");
const Tag = require("./models/tag.model");
const Task = require("./models/task.model");

app.use(express.json());
app.use(cors());

// ==================== JWT====================

const verifyJWT = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token provided.",
    });
  }

  try {
    const decodedToken = jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET
    );

    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ==================== AUTHENTICATION ====================

// Signup
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Signup successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Signup error:", error);

    res.status(error.code === 11000 ? 409 : 500).json({
      message: error.code === 11000
        ? "Email already registered."
        : "Failed to create account.",
    });
  }
});

// Login and generate JWT
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).json({ message: "Failed to login." });
  }
});

// Get logged-in user
app.get("/auth/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user." });
  }
});

// ==================== TEAM APIs ====================

async function createTeam(newTeam) {
  const team = new Team(newTeam);
  return await team.save();
}

app.post("/teams", verifyJWT, async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ message: "Team name is required." });
    }

    const existingTeam = await Team.findOne({
      name: req.body.name.trim(),
    });

    if (existingTeam) {
      return res.status(409).json({ message: "Team already exists." });
    }

    const team = await createTeam(req.body);

    res.status(201).json({
      message: "Team created successfully.",
      team,
    });
  } catch (error) {
    console.log("Create team error:", error);
    res.status(500).json({ message: "Failed to create team." });
  }
});

async function readAllTeams() {
  return await Team.find().sort({ name: 1 });
}

app.get("/teams", verifyJWT, async (req, res) => {
  try {
    res.status(200).json(await readAllTeams());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams." });
  }
});

// ==================== PROJECT APIs ====================

async function createProject(newProject) {
  const project = new Project(newProject);
  return await project.save();
}

app.post("/projects", verifyJWT, async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({
        message: "Project name is required.",
      });
    }

    const project = await createProject(req.body);

    res.status(201).json({
      message: "Project created successfully.",
      project,
    });
  } catch (error) {
    console.log("Create project error:", error);
    res.status(500).json({ message: "Failed to create project." });
  }
});

async function readAllProjects() {
  return await Project.find().sort({ name: 1 });
}

app.get("/projects", verifyJWT, async (req, res) => {
  try {
    res.status(200).json(await readAllProjects());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects." });
  }
});



startServer();
