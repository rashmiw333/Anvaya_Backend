const express = require("express");
const app = express();
const cors = require("cors");
const {initializeDatabase} = require("./db/db.connect");
const SalesAgent = require("./models/salesAgent.model");
const Lead = require("./models/lead.model");
const Comment = require("./models/comment.model");
const Tag = require("./models/tag.model");

app.use(express.json());
app.use(cors());

initializeDatabase();

//create agent

async function createAgent(newAgent){
    try{
        const agent = new SalesAgent(newAgent);
        const savedAgent = await agent.save();
        return savedAgent;
    }catch(error){
        console.log("Failed to add Agent",error);
    }

}

//post api

app.post("/api/agents",async(req,res)=>{
    try{
      const savedAgent = await createAgent(req.body);
      res.status(201).json({message:"Agent added Successfully."});
       }catch(error){
        res.status(500).json({
            error:"Failed to add Agent."
        });
    }
});

//read agents data

async function readAllAgents() {
  try {
    const agents = await SalesAgent.find();
    return agents;
  } catch (error) {
    throw error;
  }
}

// call to get all receipe

app.get("/api/agents", async (req, res) => {
  try {
    const agents = await readAllAgents();

    if (agents.length !== 0) {
      res.json(agents);
    } else {
      res.status(404).json({error: "SalesAgent not found."});
    }
  } catch (error) {
    res.status(500).json({error: "Error occurred while fetching salesAgents."});
  }
});

// Methods and Apis for leads

// POST   /leads
// GET    /leads
// PATCH  /leads/:id
// DELETE /leads/:id

// {
//   "name": "Acme Corp",
//   "source": "Referral",
//   "salesAgent": "SALES_AGENT_ID",
//   "status": "New",
//   "tags": ["High Value", "Follow-up"],
//   "timeToClose": 30,
//   "priority": "High"
// }

//method to create lead

async function createLead(newLead){
    try{
        const lead = new Lead(newLead);
        const savedLead = await lead.save();
        return savedLead;
    }catch(error){
        console.log("Failed to add Lead",error);
    }

}

//post api

app.post("/api/leads",async(req,res)=>{
    try{
      const savedLead = await createLead(req.body);
      res.status(201).json({message:"Lead added Successfully."});
       }catch(error){
        res.status(500).json({
            error:"Failed to add Lead."
        });
    }
});

//read all leads

async function readAllLeads() {
  try {
    const leads = await Lead.find();
    return leads;
  } catch (error) {
    throw error;
  }
}

// call to get all receipe

app.get("/api/leads", async (req, res) => {
  try {
    const leads = await readAllLeads();

    if (leads.length !== 0) {
      res.json(leads);
    } else {
      res.status(404).json({error: "Leads not found."});
    }
  } catch (error) {
    res.status(500).json({error: "Error occurred while fetching Leads."});
  }
});

//update lead

async function updateLead(leadId, updatedData) {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );

    return updatedLead;
  } catch (error) {
    console.log("Failed to update Lead:", error);
    throw error;
  }
}

//put api

app.put("/leads/:id", async (req, res) => {
  try {
    const updatedLead = await updateLead(
      req.params.id,
      req.body
    );

    if (!updatedLead) {
      return res.status(404).json({
        error: "Lead not found",
      });
    }

    res.status(200).json({
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update Lead",
    });
  }
});

//delete

async function deleteLead(leadId) {
  try {
    const deletedLead = await Lead.findByIdAndDelete(leadId);

    return deletedLead;
  } catch (error) {
    console.log("Failed to delete lead:", error);
    throw error;
  }
}

//delete api
app.delete("/leads/:id", async (req, res) => {
  try {
    const deletedLead = await deleteLead(req.params.id);

    if (!deletedLead) {
      return res.status(404).json({
        error: "Lead not found",
      });
    }

    res.status(200).json({
      message: "Lead deleted successfully",
      lead: deletedLead,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete lead",
    });
  }
});

//comment api

async function createComment(leadId, newComment) {
  try {
    const comment = new Comment({
      lead: leadId,
      author: newComment.author,
      commentText: newComment.commentText
    });

    const savedComment = await comment.save();

    return savedComment;
  } catch (error) {
    throw error;
  }
}

//post api

app.post("/api/leads/:id/comments", async (req, res) => {
  try {
    const leadId = req.params.id;

    // Check whether lead exists
    const lead = await Lead.findById(leadId);

    if (!lead) {
      return res.status(404).json({
        error: `Lead with ID '${leadId}' not found.`
      });
    }

    const savedComment = await createComment(leadId, req.body);

    res.status(201).json({
      id: savedComment._id,
      commentText: savedComment.commentText,
      author: savedComment.author,
      createdAt: savedComment.createdAt
    });

  } catch (error) {
    console.log("Failed to add comment", error);

    res.status(500).json({
      error: "Failed to add comment."
    });
  }
});

//get comment method and api

async function getCommentsByLead(leadId) {
  try {
    const comments = await Comment.find({ lead: leadId })
      .populate("author", "name")
      .sort({ createdAt: 1 });

    return comments;
  } catch (error) {
    throw error;
  }
}

app.get("/api/leads/:id/comments", async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = await Lead.findById(leadId);

    if (!lead) {
      return res.status(404).json({
        error: `Lead with ID '${leadId}' not found.`
      });
    }

    const comments = await getCommentsByLead(leadId);

    const result = comments.map((comment) => ({
      id: comment._id,
      commentText: comment.commentText,
      author: comment.author.name,
      createdAt: comment.createdAt
    }));

    res.status(200).json(result);

  } catch (error) {
    console.log("Failed to fetch comments", error);

    res.status(500).json({
      error: "Failed to fetch comments."
    });
  }
});

const PORT= 3000;
app.listen(PORT,()=>{
    console.log(`Server Started on ${PORT}`);
});