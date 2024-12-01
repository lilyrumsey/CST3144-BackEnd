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



