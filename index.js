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

//===================================================
// Get all users for task 
app.get("/users", verifyJWT, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email")
      .sort({ name: 1 });

    res.status(200).json(users);
  } catch (error) {
    console.log("Fetch users error:", error);

    res.status(500).json({
      message: "Failed to fetch users.",
    });
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

// ==================== TAG APIs ====================

async function createTag(newTag) {
  const tag = new Tag(newTag);
  return await tag.save();
}

app.post("/tags", verifyJWT, async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ message: "Tag name is required." });
    }

    const existingTag = await Tag.findOne({
      name: req.body.name.trim(),
    });

    if (existingTag) {
      return res.status(409).json({ message: "Tag already exists." });
    }

    const tag = await createTag(req.body);

    res.status(201).json({
      message: "Tag created successfully.",
      tag,
    });
  } catch (error) {
    console.log("Create tag error:", error);
    res.status(500).json({ message: "Failed to create tag." });
  }
});

async function readAllTags() {
  return await Tag.find().sort({ name: 1 });
}

app.get("/tags", verifyJWT, async (req, res) => {
  try {
    res.status(200).json(await readAllTags());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tags." });
  }
});

// ==================== TASK APIs ====================

async function createTask(newTask) {
  const task = new Task(newTask);
  return await task.save();
}

app.post("/tasks", verifyJWT, async (req, res) => {
  try {
    const {
      name, project, team, owners = [], tags = [],
      timeToComplete, dueDate, status, priority,
    } = req.body;

    if (!name || !project || !team || timeToComplete == null) {
      return res.status(400).json({
        message: "Name, project, team and timeToComplete are required.",
      });
    }

    if (!Number.isFinite(Number(timeToComplete)) || Number(timeToComplete) < 1) {
      return res.status(400).json({
        message: "timeToComplete must be at least 1.",
      });
    }

    if (!mongoose.isValidObjectId(project) ||
        !mongoose.isValidObjectId(team)) {
      return res.status(400).json({
        message: "Invalid project or team ID.",
      });
    }

    const [projectExists, teamExists] = await Promise.all([
      Project.exists({ _id: project }),
      Team.exists({ _id: team }),
    ]);

    if (!projectExists || !teamExists) {
      return res.status(400).json({
        message: "Project or team does not exist.",
      });
    }

    const validOwners = owners.every(mongoose.isValidObjectId);
    const validTags = tags.every(mongoose.isValidObjectId);

    if (!validOwners || !validTags) {
      return res.status(400).json({
        message: "Invalid owner or tag ID.",
      });
    }

    const task = await createTask({
      name,
      project,
      team,
      owners,
      tags,
      timeToComplete: Number(timeToComplete),
      dueDate,
      status,
      priority,
      completedAt: status === "Completed" ? new Date() : null,
      createdBy: req.user.userId,
    });

    const savedTask = await Task.findById(task._id)
      .populate("project", "name")
      .populate("team", "name")
      .populate("owners", "name email")
      .populate("tags", "name");

    res.status(201).json({
      message: "Task created successfully.",
      task: savedTask,
    });
  } catch (error) {
    console.log("Create task error:", error);
    res.status(500).json({ message: "Failed to create task." });
  }
});

// Read tasks and filter using query parameters
async function readAllTasks(query, userId) {
  const filter = {};

  // Dashboard: show only tasks assigned to the logged-in user
  if (query.myTasks === "true") {
    filter.owners = userId;
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  if (query.team) {
    if (mongoose.isValidObjectId(query.team)) {
      filter.team = query.team;
    } else {
      const team = await Team.findOne({ name: query.team });
      filter.team = team ? team._id : null;
    }
  }

  if (query.project) {
    if (mongoose.isValidObjectId(query.project)) {
      filter.project = query.project;
    } else {
      const project = await Project.findOne({ name: query.project });
      filter.project = project ? project._id : null;
    }
  }

  if (query.owner) {
    if (mongoose.isValidObjectId(query.owner)) {
      filter.owners = query.owner;
    } else {
      const owner = await User.findOne({ name: query.owner });
      filter.owners = owner ? owner._id : null;
    }
  }

  if (query.tags) {
    const tagNames = query.tags.split(",").map((tag) => tag.trim());
    const tags = await Tag.find({ name: { $in: tagNames } });

    filter.tags = { $in: tags.map((tag) => tag._id) };
  }

  let sortOption = { createdAt: -1 };

  if (query.sort === "dueDate") sortOption = { dueDate: 1 };
  if (query.sort === "priority") sortOption = { priority: -1 };

  return await Task.find(filter)
    .populate("project", "name")
    .populate("team", "name")
    .populate("owners", "name email")
    .populate("tags", "name")
    .sort(sortOption);
}

app.get("/tasks", verifyJWT, async (req, res) => {
  try {
    const tasks = await readAllTasks(req.query, req.user.userId);

    res.status(200).json(tasks);
  } catch (error) {
    console.log("Fetch tasks error:", error);

    res.status(500).json({
      message: "Failed to fetch tasks.",
    });
  }
});

// Read task by ID
app.get("/tasks/:id", verifyJWT, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(req.params.id)
      .populate("project", "name")
      .populate("team", "name")
      .populate("owners", "name email")
      .populate("tags", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task." });
  }
});

// Update task
async function updateTask(taskId, updatedData) {
  const allowedFields = [
    "name", "project", "team", "owners", "tags",
    "timeToComplete", "dueDate", "status", "priority",
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (updatedData[field] !== undefined) {
      updates[field] = updatedData[field];
    }
  });

  if (updates.status === "Completed") {
    updates.completedAt = new Date();
  } else if (updates.status) {
    updates.completedAt = null;
  }

  return await Task.findByIdAndUpdate(taskId, updates, {
    new: true,
    runValidators: true,
  })
    .populate("project", "name")
    .populate("team", "name")
    .populate("owners", "name email")
    .populate("tags", "name");
}

app.put("/tasks/:id", verifyJWT, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await updateTask(req.params.id, req.body);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({ message: "Task updated successfully.", task });
  } catch (error) {
    console.log("Update task error:", error);
    res.status(500).json({ message: "Failed to update task." });
  }
});

// Delete task
async function deleteTask(taskId) {
  return await Task.findByIdAndDelete(taskId);
}

app.delete("/tasks/:id", verifyJWT, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await deleteTask(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({ message: "Task deleted successfully.", task });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task." });
  }
});

// ==================== REPORT APIs ====================

// Tasks completed during the last 7 days
async function getTasksCompletedLastWeek() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return await Task.find({
    status: "Completed",
    completedAt: { $gte: sevenDaysAgo },
  })
    .populate("team", "name")
    .populate("project", "name")
    .populate("owners", "name");
}

app.get("/report/last-week", verifyJWT, async (req, res) => {
  try {
    const tasks = await getTasksCompletedLastWeek();

    res.json({
      totalCompleted: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch last-week report.",
    });
  }
});

// Sum of estimated days for tasks not completed
async function getTotalPendingDays() {
  const result = await Task.aggregate([
    { $match: { status: { $ne: "Completed" } } },
    {
      $group: {
        _id: null,
        totalPendingDays: { $sum: "$timeToComplete" },
        totalPendingTasks: { $sum: 1 },
      },
    },
  ]);

  return result[0] || {
    totalPendingDays: 0,
    totalPendingTasks: 0,
  };
}

app.get("/report/pending", verifyJWT, async (req, res) => {
  try {
    res.json(await getTotalPendingDays());
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch pending report.",
    });
  }
});

// Completed tasks grouped by team, owner and project
async function getClosedTaskReport() {
  const tasks = await Task.find({ status: "Completed" })
    .populate("team", "name")
    .populate("project", "name")
    .populate("owners", "name");

  const result = {
    totalClosedTasks: tasks.length,
    byTeam: {},
    byOwner: {},
    byProject: {},
  };

  tasks.forEach((task) => {
    const teamName = task.team?.name || "Unknown";
    const projectName = task.project?.name || "Unknown";

    result.byTeam[teamName] = (result.byTeam[teamName] || 0) + 1;
    result.byProject[projectName] =
      (result.byProject[projectName] || 0) + 1;

    task.owners.forEach((owner) => {
      result.byOwner[owner.name] =
        (result.byOwner[owner.name] || 0) + 1;
    });
  });

  return result;
}

app.get("/report/closed-tasks", verifyJWT, async (req, res) => {
  try {
    res.json(await getClosedTaskReport());
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch closed-task report.",
    });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Workasana server running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
