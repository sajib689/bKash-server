const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
require('dotenv').config()
const bcrypt = require('bcrypt');
app.use(express.json());
app.use(cors())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2m0rny5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const registerCollection = await client.db('bKash').collection('register')
    app.post('/register', async (req, res) => {
        const query = req.body;
        const filter = await registerCollection.findOne({ number: query?.number });
        if (filter) {
          return res.status(401).send({ message: 'User already registered' });
        }
        const hashedPassword = await bcrypt.hash(query.password, 5)
        query.password = hashedPassword
        const result = await registerCollection.insertOne(query);
        res.send(result);
      });
      app.post('/login', async (req, res) => {
        const { number, password } = req.body;
        const user = await registerCollection.findOne({ number: number });
        if (!user) {
          return res.status(401).send({ message: 'User not found' });
        }
  
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).send({ message: 'Invalid password' });
        }
  
       
  
        res.send({ message: 'Login successful' });
      });
  } finally {
   
  }
}
run().catch(console.dir);






app.get('/', async (req, res) => {
    res.send('Welcome to the bKash server')
})

app.listen(port, () => {
    console.log(`Listen on ${port}`)
} )