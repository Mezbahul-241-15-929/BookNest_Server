const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000
app.use(express.json());

app.use(cors())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1jlx3rd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyToken = (req, res, next) => {

    // Normally decoded from JWT
    req.decoded_email = req.query.email;

    next();
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //Jobs api
        const userCollection = client.db('BookNest').collection('users');

        // User related APIs

        //send users singup data to the mongodb server
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.role = 'user';
            user.createdAt = new Date();
            const email = user.email;
            const userExists = await userCollection.findOne({ email })

            if (userExists) {
                return res.send({ message: 'user exists' })
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        })



        //get user singup data from mongodb server 
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        //api for Profile
        // GET profile by email
        // GET user by email
        app.get('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = await userCollection.findOne({ email });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.json(user);
            } catch (error) {
                res.status(500).json({ message: 'Server error' });
            }
        });



        //api for profile update:
        // UPDATE user

        app.put('/users/:email', async (req, res) => {
            try {

                const email = req.params.email;
                const updatedData = req.body;

                const filter = { email: email };

                const updateDoc = {
                    $set: {
                        displayName: updatedData.displayName,
                        photoURL: updatedData.photoURL
                    }
                };

                const result = await userCollection.updateOne(filter, updateDoc);

                res.send(result);

            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });




        //change passific data like lastSignInTime
        app.patch('/users', async (req, res) => {
            const { email, lastSignInTime } = req.body;
            const filter = { email: email }
            const updatedDoc = {
                $set: {
                    lastSignInTime: lastSignInTime
                }
            }

            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // Book collection..........................................................

        const bookCollection = client.db('BookNest').collection('books');


        //post api:
        app.post('/books', async (req, res) => {
            const book = req.body;
            const result = await bookCollection.insertOne(book);
            res.send(result);
        });

        //get api:
        app.get('/books', async (req, res) => {
            const result = await bookCollection.find().toArray();
            res.send(result);
        });

        //get api with id:
        // app.get('/book/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const book = await bookCollection.findOne({ _id: new ObjectId(id) });
        //     res.send(book);
        // });

        // // Upvote
        // app.patch('/books/upvote/:id', async (req, res) => {
        //     const id = req.params.id;

        //     const result = await bookCollection.updateOne(
        //         { _id: new ObjectId(id) },
        //         { $inc: { upvote: 1 } }
        //     );

        //     res.send(result);
        // });

        // //Add Review
        // app.post('/reviews', async (req, res) => {
        //     const review = req.body;
        //     const result = await reviewCollection.insertOne(review);
        //     res.send(result);
        // });

        // //Get Reviews
        // app.get('/reviews/:bookId', async (req, res) => {
        //     const bookId = req.params.bookId;
        //     const result = await reviewCollection.find({ bookId }).toArray();
        //     res.send(result);
        // });

        // //delete review
        // app.delete('/reviews/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
        //     res.send(result);
        // });

        // // One review per user per book
        // const existingReview = await reviewCollection.findOne({
        //     bookId: review.bookId,
        //     user_email: review.user_email
        // });

        // if (existingReview) {
        //     return res.send({ message: "You already reviewed this book" });
        // }



        // JWT middleware to verify token
        // const verifyToken = (req, res, next) => {
        //     const authHeader = req.headers.authorization;
        //     if (!authHeader) return res.status(401).send({ error: "Unauthorized" });

        //     const token = authHeader.split(" ")[1];
        //     jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
        //         if (err) return res.status(403).send({ error: "Forbidden" });
        //         req.decoded_email = decoded.email;
        //         next();
        //     });
        // };

        // MyBooks route



        // GET http://localhost:3000/mybooks?email=mm@gmail.com
        app.get('/mybooks', async (req, res) => {
            try {
                const email = req.query.email; // get email from query string
                const query = {};

                if (email) {
                    query.user_email = email; // match the correct field in your DB
                }

                const books = await bookCollection.find(query).toArray();

                // Always return an array, even if empty
                res.json(books);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Server error' });
            }
        });













        // Send a ping to confirm a successful connection
        //await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/data', (req, res) => {
    res.send('this is data')
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})