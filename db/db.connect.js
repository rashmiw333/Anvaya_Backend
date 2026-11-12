
const mongoose = require("mongoose");
require("dotenv").config();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

const initializeDatabase = async () => {
  if (!process.env.MONGODB) {
    throw new Error("MONGODB environment variable is missing");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Retry if the previous connection is no longer active.
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB, {
      serverSelectionTimeoutMS: 10000,
    })
      .then((connection) => {
        console.log("Connected to Database");
        return connection;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;

        console.error("Database connection failed:", error.message);
        throw error;
      });
  }

  cached.conn = await cached.promise;

  return cached.conn;
};

module.exports = { initializeDatabase };
//===================================================================================






//const mongoose = require("mongoose");
// require("dotenv").config();

// const dns = require("dns");
// dns.setServers(["8.8.8.8","8.8.4.4"]);

// const mongoUri = process.env.MONGODB;
// console.log(process.env.MONGODB);
// const initializeDatabase =async()=>{
//     await mongoose.connect(mongoUri).then(()=>{
//         console.log("Connected to Database");
//     }).catch((error)=>console.log("Error Connecting to DataBase",error));
// };

// module.exports = {initializeDatabase};
