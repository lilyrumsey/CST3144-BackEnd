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

  app.use(express.json());

 const dbName = 'webstore';
 const collectionName = 'lessons';
 let db = client.db(dbName);

//Retrieve all lessons
app.get("/lessons/", async (req, res) => {
  try {
    logger.info('Fetching all lessons');
      const lessons = await db.collection(collectionName).find().toArray();
     res.json(lessons.map(lesson => ({

      // Convert _id to string
      id: lesson._id.toString(),  
      subject: lesson.subject,
      location: lesson.location,
      price: lesson.price,
      spaces: lesson.spaces,
      image: lesson.image,
      availableInventory: lesson.availableInventory
    })));
  } catch (error) {
    // Logging for ourput errors
    logger.error('Error fetching lessons: ', err);  
// Send error response if something goes wrong
    res.status(500).send('Error fetching lessons');
     // console.error(error.message);

  }
});

//Get lesson via lesson id
app.get('/lessons/:id', async (req, res) => {
  let course = {}
  try {
      const courses = db.collection("lessons");
      const filter = { _id: new ObjectId(req.params.id) };
      course = await courses.findOne(filter)
  } catch (error) {
      console.log(error)
  }
  return res.status(200).json(course);
})

//search lessons route
app.get('/search/', async (req, res) => {
  const courses = await db.collection("lessons").find({
      subject: { $regex: `^${req.query.search_term}`, $options: "i" }
  }).toArray();
  const result = courses.map((item) => {
      return { ...item, id: item._id.toString() }
  })
  return res.json(result);
})

//alt new lesson

app.post("/lessons", async (req, res) => {
  try {
      console.log("Request body:", req.body); // Log the incoming data

      const { id, subject, location, price, spaces, image, availableInventory } = req.body;

      if (!id || !subject || !location || !price || !spaces || !image || !availableInventory) {
          return res.status(400).send("Lesson data is required");
      }

      const db = req.dbClient.db("webstore");
      const createCollection = db.collection("lessons");

      // Create the lesson
      const lesson = {
          id,
          subject,
          location,
          price,
          spaces,
          image,
          availableInventory
      };

      const result = await createCollection.insertOne(lesson);

      res.status(201).json({
          message: "Lesson created successfully",
          lessonId: result.insertedId,
      });
  } catch (error) {
      console.error("Error storing lesson:", error.message);
      res.status(500).send("Internal Server Error");
  }
});


//create lesson order
 app.post('/order/', async (req, res) => {
  if (req.body.hasOwnProperty('items') && req.body.items.length < 0 ) {
      return res.status(400).json('You cannot checkout an empty cart')
  }
  const lesson = db.collection("orders");
  req.body.items.map(async (item) => {
      try {
          const filter = { _id: new ObjectId(item.id) };

          let lesson = await lesson.findOne(filter)

          if (item.quantity > lesson.space) {
              return res.status(400).json('unable to process order as quantity specified for ${lesson.subject} beyond available stock!');
          }

      }
      /*if any error occurs in the try block the catch block will execute it*/
      catch (error) {
          //log error message on the console
          console.error(error.message);
          return res.status(400).json('Error occured creating the order.....')
      }
  })

  const order = db.collection("orders")

  result = await order.insertOne(req.body);
  try {
      req.body.items.map(async (item) => {
          const filter = { _id: new ObjectId(item.id) };
          let lesson = await lessons.findOne(filter)
          const updateDoc = {
              $set: {
                  space: lesson.space > 0 ? lesson.space - item.quantity : 0
              },
          };
          await lesson.updateOne(filter, updateDoc);
      });


  } catch (error) {
      console.error(error.message);
  }

  return res.json("Order completed succesfully");

});

app.post("/orders/", async (req, res) => {
  try {
      console.log("Request body:", req.body); // Log the incoming data

      const { orderDetails, cartItems } = req.body;

      if (!orderDetails || !cartItems) {
          return res.status(400).send("Order data is required");
      }

      const db = req.dbClient.db("webstore");
      const ordersCollection = db.collection("orders");

      // Create the order
      const order = {
          orderDetails,
          cartItems,
          orderDate: new Date(),
          status: "Pending",
      };

      const result = await ordersCollection.insertOne(order);

      res.status(201).json({
          message: "Order created successfully",
          orderId: result.insertedId,
      });
  } catch (error) {
      console.error("Error storing order:", error.message);
      res.status(500).send("Internal Server Error");
  }
});


// route using put to update an existing lesson by the lesson ID
app.put('/lessons/:id', async (req, res) => {
  // Extract the lesson ID from the input URL parameters
    const { id } = req.params;  
    // Extract the updated lesson payload from the body
    const { subject, location, price, spaces, image, availableInventory } = req.body;  
  
    // Validate that required fields are provided for the update
    if (!subject || !spaces) {
// Log warning if required fields are missing
      logger.warn('Lesson subject or spaces missing');  
// Return 400 with custom error message
      return res.status(400).send('lesson name and spaces are mandatory');  
    }
  
    try {
// Convert string ID to MongoDB ObjectId
      const objectId = new ObjectId(id);  
// Log the ID of the lesson being updated
      logger.info(`Updating lesson ID: ${id}`);  
  
      // Update the course with the new data
      const result = await db.collection(collectionName).updateOne(
        { _id: objectId },
        {
          $set: {
            subject,
            location,
            price,
            spaces,
            image,
            availableInventory
          },
        }
      );
  
      if (result.modifiedCount > 0) {
// Log success message if the lesson is updated
        logger.info(`lesson with ID: ${id} updated successfully`);  
// Send success response
        res.send('lesson updated successfully');  
      } else {
// Log warning if lesson was not found for update
        logger.warn(`lesson with ID: ${id} not found for update`);  
// Return 404 if lesson is not found
        res.status(404).send('lesson not found');  
      }
    } catch (err) {
// Log any errors during the update
      logger.error(`Error updating lesson with ID: ${id}`, err);  
// Return 500 if there is an error updating the course
      res.status(500).send('Error uable to update lesson!');  
    }
  });


//Delete lesson by id
app.delete('/lessons/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const objectId = new ObjectId(id);
      logger.info(`Deleting lesson with ID: ${id}`);
      const result = await db.collection(collectionName).deleteOne({ _id: objectId });
      if (result.deletedCount > 0) {
        // Log if lesson deletion is succesfull
        logger.info(`lesson with ID: ${id} deleted successfully`);  
        // Message for the client if detion is succesfull
        res.send('lesson deleted successfully');  
      } else {
        // Log warning when lesson was is found for deletion
        logger.warn(`lesson with ID: ${id} not found for deletion`);  
        // Display Error if lesson is not found
        res.status(404).send('Course not found');  
              }
  } catch (error) {
      console.log(error)
  }
})

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToMongoDB(); // Connect to MongoDB when server starts
});





