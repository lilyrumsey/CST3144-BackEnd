const express = require("express");
const propertiesReader = require("properties-reader");
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const morgan = require('morgan');
const winston = require('winston');
const app = express();

// CORS Middleware (to handle CORS issues)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allowed methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers
    next();
  });

  // Use Morgan as a logger middleware
app.use(morgan('tiny'));

// Load properties from db.properties (Database Configuration)
const propertiesPath = path.resolve(__dirname, "conf/db.properties");
const properties = propertiesReader(propertiesPath);

// Extract properties (Reads the database connection details )
const dbPrefix = properties.get("db.prefix");
const dbUser = encodeURIComponent(properties.get("db.user"));
const dbPassword = encodeURIComponent(properties.get("db.pwd"));
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");

// Construct MongoDB URI 
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbUrl}${dbParams}`;

// MongoDB Client Setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    deprecationErrors: true,
    strict: false, // Allow text index creation dynamically
  },
});


// Connects to MongoDB using the constructed URI.
async function connectToMongoDB() {
  try {
    await client.connect(); // Connect to MongoDB
    const db = client.db("webstore"); // Connect to your database

    await client.db("webstore").command({ ping: 1 }); // Ping to verify connection
    console.log("Connected to MongoDB successfully and text index created!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit if connection fails
  }
}

