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


        app.get("/my-books/:email", async (req, res) => {
            const email = req.params.email;
            const result = await bookCollection.find({ user_email: email }).toArray();
            res.send(result);
        });

        // Book collection..........................................................

        const bookCollection = client.db('BookNest').collection('books');
        const reviewCollection = client.db('BookNest').collection('reviews');


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

        // get with id: for book details
        app.get("/books/:id", async (req, res) => {
            try {
                const id = req.params.id;

                const book = await bookCollection.findOne({
                    _id: new ObjectId(id)
                });

                res.send(book);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        //delete book
        // DELETE /books/:id
        app.delete("/books/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!id) {
                    return res.status(400).json({ message: "Book ID is required" });
                }

                const result = await bookCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Book not found" });
                }

                res.json({ deletedCount: result.deletedCount });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Server error" });
            }
        });

        // put or update book api:
        // PUT /books/:id
        app.put("/books/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updatedBook = req.body;

                // Remove _id from body if it exists
                delete updatedBook._id;

                // Find the existing book
                const existingBook = await bookCollection.findOne({ _id: new ObjectId(id) });
                if (!existingBook) {
                    return res.status(404).json({ message: "Book not found" });
                }

                // Only owner can update
                if (existingBook.user_email !== updatedBook.user_email) {
                    return res.status(403).json({ message: "Forbidden: You can only update your own book" });
                }

                // Update the book
                const result = await bookCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedBook }
                );

                res.json(result);
            } catch (error) {
                console.error("Update Book Error:", error);
                res.status(500).json({ message: "Server error" });
            }
        });

        // Upvote Book....................................................................................
        app.patch("/upvote/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { user_email } = req.body;

                const book = await bookCollection.findOne({
                    _id: new ObjectId(id)
                });

                if (book.user_email === user_email) {
                    return res.send({
                        message: "You cannot upvote your own book"
                    });
                }

                const result = await bookCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $inc: { upvote: 1 }
                    }
                );

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        // Add Review (One Review per User)...........................................................
        app.post("/reviews", async (req, res) => {
            try {
                const review = req.body;

                const existingReview = await reviewCollection.findOne({
                    bookId: review.bookId,
                    user_email: review.user_email
                });

                if (existingReview) {
                    return res.send({
                        message: "You already reviewed this book"
                    });
                }

                const result = await reviewCollection.insertOne(review);

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        // Get Reviews for Book
        app.get("/reviews/:bookId", async (req, res) => {
            try {
                const bookId = req.params.bookId;

                const reviews = await reviewCollection
                    .find({ bookId })
                    .toArray();

                res.send(reviews);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });

        // Delete Review
        app.delete("/reviews/:id", async (req, res) => {
            try {
                const id = req.params.id;

                const result = await reviewCollection.deleteOne({
                    _id: new ObjectId(id)
                });

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });


        // edit review
        app.patch("/reviews/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { review } = req.body;

                const result = await reviewCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: { review }
                    }
                );

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });


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

        app.get("/popular-books", async (req, res) => {

            const result = await bookCollection
                .find()
                .sort({ upvote: -1 }) // fixed here
                .limit(9)
                .toArray();

            res.send(result);

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