const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// _________use middleware__________
// 718E7BPU
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6xpi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const treatmentsCollection = client.db('doctors_portal').collection('treatments');
        const bookingCollection = client.db('doctors_portal').collection('booking');
        const userCollection = client.db('doctors_portal').collection('users');

        // ______get treatment service______
        app.get('/treatment', async(req, res) => {
            const query = {};
            const cursor = treatmentsCollection.find(query);
            const treatments = await cursor.toArray();
            res.send(treatments);
        })

        // _________create booking api________
        app.post('/booking', async(req, res) => {
            const booking = req.body;

            const { treatmentName, date, slot, patientEmail } = booking;
            const query = { treatmentName, date, slot, patientEmail };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: "duplicate booking", booking: exists });
            };
            // console.log(query)
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // ______get available booking___
        app.get('/available', async(req, res) => {
            const date = req.query.date;

            // get all services 
            const services = await treatmentsCollection.find().toArray();


            // get the booking of that day 
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            console.log(bookings)

            // for each service, find booking for that service 
            services.forEach(service => {
                const serviceBookings = bookings.filter(b => b.treatmentName === service.name)
                const bookedSlots = serviceBookings.map(serviceBook => serviceBook.slot);
                const available = service.slots.filter(s => !bookedSlots.includes(s));
                service.slots = available;

            })
            res.send(services)
        })

        // get per user booking 
        app.get('/booking', async(req, res) => {
            const patientEmail = req.query.email;
            // console.log(patientEmail)
            const query = { patientEmail: patientEmail };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        // put user info 
        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    user
                }
            };

            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("doctors portal server is running...")
})

app.listen(port, () => {
    console.log("Listening to port", port)
})