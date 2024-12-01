const express = require("express");
const propertiesReader = require("properties-reader");
const path = require("path");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const morgan = require('morgan');
const winston = require('winston');
const app = express();