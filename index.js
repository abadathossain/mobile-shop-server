const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
// token verification
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No token" });
  }
  const token = authorization.split(" ")[1];
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.send({ message: "Invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};

// verify seller
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "seller") {
    return res.send({ message: "forbideen access" });
  }
  next();
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dxzduzz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db("mobile-shop").collection("users");
const mobileCollection = client.db("mobile-shop").collection("products");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // create user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get user with email
    app.get("/user/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.findOne(query);
      console.log("Token:", result);
      res.send(result);
    });

    // create product
    app.post("/add-products", verifyToken, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await mobileCollection.insertOne(product);
      res.send(result);
    });
    // get product
    app.get("/all-products", async (req, res) => {
      const { title, sort, category, brand } = req.body;
      const query = {};
      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      if (category) {
        query.category = category;
      }
      if (category) {
        query.brand = brand;
      }
      const sortOption = sort === "asc" ? 1 : -1;
      const products = await mobileCollection
        .find(query)
        .sort({ price: sortOption })
        .toArray();
      res.send(products);
    });

    // Get all sellers
    app.get("/users", async (req, res) => {
      try {
        const sellers = await userCollection.find().toArray();
        res.status(200).json(sellers);
      } catch (error) {
        res.status(500).json({ message: "Error retrieving sellers", error });
      }
    });

    // PUT route to update the seller status (approve/reject)
    app.put("/users/:id/:status", async (req, res) => {
      const { id, status } = req.params;
      try {
        if (!["approved", "rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        // console.log(seller);
        const seller = await userCollection.findOneAndUpdate({ id, status });

        if (!seller) {
          return res.status(404).json({ message: "Seller not found" });
        }

        // Update the seller status
        seller.status = status;
        await seller.save();

        res.status(200).json({ message: `Seller ${status}`, seller });
      } catch (error) {
        console.error("Error updating seller:", error);
        res
          .status(500)
          .json({ message: "Error updating seller", error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Mobile shop is running");
});

// for jwt
app.post("/jwt", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "10d",
  });
  res.send({ token });
  console.log("JWT email:", userEmail);
});
app.listen(port, () => {
  console.log(`Mobile shop is running on port:${port}`);
});
