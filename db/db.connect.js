const mongoose = require("mongoose");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8","8.8.4.4"]);

const mongoUri = process.env.MONGODB;
console.log(process.env.MONGODB);
const initializeDatabase =async()=>{
    await mongoose.connect(mongoUri).then(()=>{
        console.log("Connected to Database");
    }).catch((error)=>console.log("Error Connecting to DataBase",error));
};

module.exports = {initializeDatabase};
