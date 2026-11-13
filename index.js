import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';


const app = express();
const PORT = 8000;
app.use(cors());
app.use(express.json())



const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("wanderlust")
const destinationCollection = db.collection("destination")
const bookingCollection = db.collection("bookings")


app.post('/add-destination', async (req, res) => {
    const data = req.body

    const result = await destinationCollection.insertOne(data)

    console.log(result)
    res.send(result)
})

app.get('/destinations', async (req, res) => {
    const result = await destinationCollection.find().toArray()
    res.send(result)
})

app.get('/destination/:id', async (req, res) => {
    const { id } = req.params
    const result = await destinationCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.patch('/destination/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
    );
    res.send(result);
});

app.delete('/destination/:id', async (req, res) => {
    const { id } = req.params
    const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) })
    res.json(result)
})

app.post('/booking', async (req, res, next) => {
    try {
        // Never trust a client-supplied `_id`: reusing the destination's id
        // here made the second booking of a destination fail with E11000.
        const data = { ...req.body }
        delete data._id

        const result = await bookingCollection.insertOne(data)
        res.send(result)
    } catch (err) {
        next(err)
    }
})

app.get('/my-bookings/:email', async (req, res) => {
    const { email } = req.params
    const result = await bookingCollection.find({ email: email }).toArray()
    res.send(result)
})


app.delete('/mybookings/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        // Bookings created by the old flow have a string `_id` (the destination's
        // id); bookings created after the Book Now fix get a Mongo-generated
        // ObjectId. Match both types, otherwise newer bookings report
        // deletedCount: 0 and never actually get removed.
        const candidates = [{ _id: id }]
        if (ObjectId.isValid(id)) {
            candidates.push({ _id: new ObjectId(id) })
        }

        const result = await bookingCollection.deleteOne({ $or: candidates })
        res.send(result)
    } catch (err) {
        next(err)
    }
})

app.get('/', (req, res) => {
    res.send({ message: 'Server is running fine!' })
})

// JSON error responses. Express' default error handler replies with an HTML
// page, which breaks clients that read the body with res.json().
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ message: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});