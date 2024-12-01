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

// Middleware to log every request
app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    next();
  });
  
  const logger = winston.createLogger({
    // Set the logging level to 'info'
      level: 'info',  
    // Combine multiple log formats
      format: winston.format.combine(  
    // Add timestamp to each log entry
        winston.format.timestamp(),  
        winston.format.printf(({ timestamp, level, message }) => {
    // Format the log message with timestamp and log level
          return `${timestamp} [${level}]: ${message}`;  
        })
      ),
      transports: [
    // Log to the console
        new winston.transports.Console(),  
      ],
    });
  
  // Error-handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack
    res.status(500).json({ error: 'Something went wrong!' });
  });
  
  // Middleware to attach MongoDB client to requests
  app.use((req, res, next) => {
    req.dbClient = client; // Attach MongoDB client to the request object
    next();
  });
  
  // Static file middleware for images
  app.use('/images', express.static('images', {
    fallthrough: false, // Prevents moving to next middleware if file not found
  }));
  
  // Error handling for static files
  app.use((err, req, res, next) => {
    if (err) {
        if (err.code === 'ENOENT') {
            res.status(404).json({ error: 'Image not found' });
        } else {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        next();
    }
  })

  

