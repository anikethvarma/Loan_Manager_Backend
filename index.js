const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
var moment = require('moment');


const uri = "mongodb+srv://anikethvarma:abc1234@cluster0.aic6s.mongodb.net/";

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

app.post("/api/register", async (req, res) => {
  try {
    await client.connect();
    const { username, password, type } = req.body;
    
    const database = client.db("loan-manager");
    const collection = database.collection("users");
    const member = await database
      .collection("users")
      .findOne({ username: username });

    if (member == [] || member == null) {
      const hassedPassword = await bcrypt.hash(password, 6);
      const new_member = { username: username, password: hassedPassword, type: type };

      await collection.insertOne(new_member);
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      res.status(200).send({ jwtToken });
    } else {
      res.send(JSON.stringify("Username Already Exists. Please Login"));
    }
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

app.post("/api/login", async (req, res) => {
  try {
    await client.connect();
    const { username, password } = req.body;
    const database = client.db("loan-manager");
    const member = await database
      .collection("users")
      .findOne({ username: username });
    if (member == [] || member == null) {
      res.send(JSON.stringify("Username Not Found. Please Register"));
    } else {
      const isPasswordMatch = await bcrypt.compare(password, member.password);
      if (isPasswordMatch) {
        const memberType = member.type;
        const payload = { username: username};
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        res.status(200).send({ jwtToken });
      } else {
        res.send(JSON.stringify("Invalid Password"));
      }
    }
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send(JSON.stringify("JWT Token is missing"));
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send(JSON.stringify("JWT Token is invalid"));
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.get("/api/users/details", authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const { username } = req;
    const database = client.db("loan-manager");
    const collection = database.collection("users");
    const members = await collection.findOne({ username: username });
    res.send(JSON.stringify(members));
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

app.get("/api/users/detail", async (req, res) => {
  try {
    await client.connect();
    const { username } = req;
    const database = client.db("loan-manager");
    const collection = database.collection("users");
    const members = await collection.findOne({ username: username });
    res.send(JSON.stringify(members));
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

app.post("/api/new-loan", authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const {username} = req;
    moment().format('dd-mm-yyyy hh:mm');
    // const { fullName, amountNeeded, tenure, employeeStatus, reason, employeeAddress} = req.body;
    
    const database = client.db("loan-manager");
    const collection = database.collection("loans");
    await collection.insertOne({...req.body, username, status: "Pending", remark:"Initalized", remarkDateTime: moment, verifier: "John Okoh"});

    
  } catch (error) {
    res.status(500).send(error.message); 
  } finally {
    await client.close();
  }
});

app.get("/api/users/my-loans", authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const { username } = req;
    const database = client.db("loan-manager");
    const collection = database.collection("loans");
    const myLoans = await collection.find({ username: username });
    res.json(myLoans);
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});


app.get("/api/verifier/all-loans", authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const { username } = req;
    const database = client.db("loan-manager");
    const collection = database.collection("loans");
    const loans = await collection.find({ verifier: username });
    res.json(loans);
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

app.get("/api/admin/all-loans", authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const database = client.db("loan-manager");
    const collection = database.collection("loans");
    const loans = await collection.find();
    res.json(loans);
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
});

app.put("/api/loans/change-status/:loanId", authenticateToken, async(req, res)=>{
  try {
    await client.connect();
    const {loanId} = req.params;
    const database = client.db("loan-manager");
    const collection = database.collection("loans");
    const refferals = await collection.updateOne({ _id: loanId }, { $set: req.body });
    res.status(200).send(JSON.stringify("Details Added Successfully"));
  } catch (error) {
    res.status(500).send(error.message);
  } finally {
    await client.close();
  }
})
