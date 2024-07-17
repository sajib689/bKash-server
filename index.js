const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

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
    
        const registerCollection = client.db('bKash').collection('register');
        const transactionsCollection = client.db('bKash').collection('transactions');
        app.post('/register', async (req, res) => {
            const { name, number, balance, role, email, password } = req.body;
            const existingUser = await registerCollection.findOne({ number });
            if (existingUser) {
                return res.status(401).send({ message: 'User already registered' });
            }
            const hashedPassword = await bcrypt.hash(password, 5);
            const result = await registerCollection.insertOne({ name, number, balance, role, email, password: hashedPassword });
            res.send(result);
        });

        app.get('/register', async (req, res) => {
            const number = req.query.number;
            if (number) {
                const result = await registerCollection.findOne({ number });
                if (!result) {
                    return res.status(404).send({ message: 'User not found' });
                }
                res.send(result);
            } else {
                const result = await registerCollection.find().toArray();
                res.send(result);
            }
        });

        app.post('/login', async (req, res) => {
            const { number, password } = req.body;
            const user = await registerCollection.findOne({ number });
            if (!user) {
                return res.status(401).send({ message: 'User not found' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).send({ message: 'Invalid password' });
            }
            const token = jwt.sign({ id: user._id, number: user.number }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.send({ message: 'Login successful', token, user: { id: user._id, name: user.name, number: user.number, email: user.email, balance: user.balance, role: user.role } });
        });

        app.post('/update-balance', async (req, res) => {
            const { senderNumber, recipientNumber, sendAmount } = req.body;

            try {
                const sender = await registerCollection.findOne({ number: senderNumber });
                const recipient = await registerCollection.findOne({ number: recipientNumber });

                if (!sender) {
                    return res.status(404).send({ message: 'Sender not found' });
                }

                if (!recipient) {
                    return res.status(404).send({ message: 'Recipient not found' });
                }

                if (sender.balance < sendAmount) {
                    return res.status(400).send({ message: 'Insufficient balance' });
                }

                const newSenderBalance = sender.balance - sendAmount;
                const newRecipientBalance = parseFloat(recipient.balance) + parseFloat(sendAmount);

                await registerCollection.updateOne(
                    { number: senderNumber },
                    { $set: { balance: newSenderBalance } }
                );

                await registerCollection.updateOne(
                    { number: recipientNumber },
                    { $set: { balance: newRecipientBalance } }
                );

                res.send({ message: 'Transaction successful', newSenderBalance, newRecipientBalance });
            } catch (error) {
                console.error('Error updating balance:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        });
        app.post('/transactions', async (req, res) => {
            const query = req.body
            const result = await transactionsCollection.insertOne(query);
            res.send(result);
        })
        app.get('/transactions', async (req, res) => {
            const query = req.query.number
            if (query){
                const result = await transactionsCollection.findOne(query);
                res.send(result);
            } else {
                const result = await transactionsCollection.find().toArray();
                res.send(result);
            }
        })

    } finally {
        // Ensure client closes the connection
        // await client.close(); // Uncomment if you want to close the connection after the function run
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to the bKash server');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
