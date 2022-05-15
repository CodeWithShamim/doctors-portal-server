const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// _________use middleware__________
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6xpi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const treatmentsCollection = client.db('doctors_portal').collection('treatments');
        const bookingCollection = client.db('doctors_portal').collection('booking');

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

            const { treatmentName, date, slot, patientemail } = booking;
            const query = { treatmentName, date, slot, patientemail };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: "duplicate booking", booking: exists });
            };
            // console.log(query)
            const result = await bookingCollection.insertOne(booking);
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