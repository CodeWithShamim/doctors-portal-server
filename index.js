const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// use middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x6xpi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const treatmentsCollection = client.db('doctors_portal').collection('treatments');

        // ______get treatment service______
        app.get('/treatment', async(req, res) => {
            const query = {};
            const cursor = treatmentsCollection.find(query);
            const treatments = await cursor.toArray();
            res.send(treatments);
        })
    } finally {}
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("doctors portal server is running...")
})

app.listen(port, () => {
    console.log("Listening to port", port)
})