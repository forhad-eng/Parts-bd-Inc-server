const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const accessToken = authHeader.split(' ')[1]
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kqhr3.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

async function run() {
    try {
        await client.connect()
        const partsCollection = client.db('partsBd').collection('parts')
        const usersCollection = client.db('partsBd').collection('user')
        const ordersCollection = client.db('partsBd').collection('order')

        //USER
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email })
            res.send({ user })
        })

        app.patch('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email }
            const updatedDoc = { $set: { name: user.name } }
            const updatedUser = await usersCollection.updateOne(filter, updatedDoc)
            if (updatedUser.modifiedCount || updatedUser.modifiedCount) {
                res.send({ success: true, message: 'Profile updated!' })
            }
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email }
            const options = { upsert: true }
            const updatedDoc = { $set: user }
            const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET)
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            if (result) {
                res.send({ accessToken })
            }
        })

        //PARTS
        app.get('/parts', verifyJWT, async (req, res) => {
            const pageText = req.query.page
            const sizeText = req.query.size
            const page = parseInt(pageText)
            const size = parseInt(sizeText)
            const result = await partsCollection.find().skip(page).limit(size).toArray()
            res.send({ success: true, data: result })
        })

        app.get('/parts/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const item = await partsCollection.findOne(query)
            res.send(item)
        })

        //ORDERs
        app.get('/order/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const orders = await ordersCollection.find({ email }).toArray()
            res.send(orders)
        })

        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body
            const result = await ordersCollection.insertOne(order)
            if (result.insertedId) {
                res.send({ success: true, message: 'Order Confirmed! Pay Now' })
            }
        })

        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            if (result.deletedCount) {
                res.send({ success: true, message: 'Order canceled' })
            }
        })
    } finally {
    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Parts Inc Server Is Running!')
})

app.listen(port, () => {
    console.log('Listening to port', port)
})
