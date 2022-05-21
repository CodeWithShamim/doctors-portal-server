const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// _________use middleware_________
app.use(cors());
app.use(express.json());

// _____create middleware for verify jwt token_________
const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6xpi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const treatmentsCollection = client
      .db("doctors_portal")
      .collection("treatments");
    const bookingCollection = client.db("doctors_portal").collection("booking");
    const userCollection = client.db("doctors_portal").collection("users");
    const doctorCollection = client.db("doctors_portal").collection("doctors");

    // ______get treatment service______
    app.get("/treatment", async (req, res) => {
      const query = {};
      const cursor = treatmentsCollection.find(query);
      const treatments = await cursor.toArray();
      res.send(treatments);
    });

    // _________create booking api________
    app.post("/booking", async (req, res) => {
      const booking = req.body;

      const { treatmentName, date, slot, patientEmail } = booking;
      const query = { treatmentName, date, slot, patientEmail };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: "duplicate booking", booking: exists });
      }
      // console.log(query)
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // ______get available booking___
    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // get all services
      const services = await treatmentsCollection.find().toArray();

      // get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      console.log(bookings);

      // for each service, find booking for that service
      services.forEach((service) => {
        const serviceBookings = bookings.filter(
          (b) => b.treatmentName === service.name
        );
        const bookedSlots = serviceBookings.map(
          (serviceBook) => serviceBook.slot
        );
        const available = service.slots.filter((s) => !bookedSlots.includes(s));
        service.slots = available;
      });
      res.send(services);
    });

    // get per user booking
    app.get("/booking", verifyJwt, async (req, res) => {
      const patientEmail = req.query.email;
      const decodedEmail = req.decoded.email;
      // console.log(patientEmail)
      if (patientEmail === decodedEmail) {
        const query = { patientEmail: patientEmail };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });

    // put user info
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          email: user.email,
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);

      // generate jwt token
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // get all user
    app.get("/user", verifyJwt, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // create admin
    app.put("/user/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "Admin") {
        const updateDoc = {
          $set: {
            role: "Admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // delete user
    app.delete("/deleteUser/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // verify admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      const isAdmin = user?.role === "Admin";
      res.send(isAdmin);
    });

    // add new doctor
    app.post("/addDoctor", async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    });

    // get all doctor
    app.get("doctor", verifyJwt, async (req, res) => {
      const query = {};
      const doctors = await doctorCollection.find(query).toArray();
      res.send(doctors);
    });

    // delete doctor
    app.delete("/deleteDoctor/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await doctorCollection.deleteOne(query);
      res.send(result);
    });

    // _________________________
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctors portal server is running...");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
