import express from 'express';
import cors from 'cors';
import config from './config.json' with { type: 'json' };
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'
import { authenticateToken } from './utilities.js';
import { User } from './models/user.model.js';
import { Note } from './models/note.model.js';


dotenv.config();


const app = express();

app.use(express.json());

app.use(
    cors({
        origin: '*',
    })
)

app.get('/', (req, res) => {
    res.json({ data: "hello" });
})

app.post('/create-account', async (req, res) => {
    const { fullName, email, password } = req.body;

    if(!fullName){
        return res
            .status(400)
            .json({ error: true, message: "Please enter your full name" });
    }
    if(!email){
        return res
            .status(400)
            .json({ error: true, message: "Please enter your email" });
    }
    if(!password){
        return res
            .status(400)
            .json({ error: true, message: "Please enter your Password" });
    }

    const isUser = await User.findOne({ email: email });

    if(isUser){
        return res.json({
            error: true,
            message: "Email already exists",
        })
    }

    const user = new User({
        fullName,
        email,
        password,
    })

    await user.save()

    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '3600m',
    })

    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful",
    })
})


app.post('/login', async (req, res) => {
    const { email, password} = req.body;

    if(!email){
        return res
            .status(400)
            .json({ error: true, message: "Please enter your email" });
    }
    if(!password){
        return res
            .status(400)
            .json({ error: true, message: "Please enter your Password" });
    }

    const userInfo = await User.findOne({ email: email});

    if(!userInfo){
        return res.status(400).json({ message: "User not found"});
    }

    if(userInfo.email === email && userInfo.password === password){
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '3600m',
        });

        return res.json({
            error: false,
            message: "Login Successful",
            email,
            accessToken,
        })
    }
    else{
        return res.status(400).json({ error: true, message: "Invalid Email or Password" });
    }

})

app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await User.findOne({ _id: user._id });

    if(!isUser){
        console.log("no login");
        
        return res.sendStatus(401);
    }

    return res.json({
        user: {fullName: isUser.fullName, email: isUser.email, "_id": isUser._id},
        message: "",
    });
})

app.post('/add-note', authenticateToken, async(req, res) => {
    const { title, content, tags} = req.body;
    const { user } = req.user;

    if(!title){
        return res
            .status(400)
            .json({ error: true, message: "Title is required"});
    }
    if(!content){
        return res
            .status(400)
            .json({ error: true, message: "Content is required"});
    }

    try {
        const note = new Note({
            title,
            content,
            tags: tags || [],
            userId: user._id,
        })

        await note.save()
        
        return res.json({
            error: false,
            note, 
            message: "Note added successfully",
        });
    } catch (error) {
        console.log(error);
        
        return res.json({
            error: true,
            message: "Internal Server Error",
        })
    }
})

app.put('/edit-note/:noteId', authenticateToken, async(req, res) => {
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned } = req.body;
    const { user } = req.user;

    if(!title && !content && !tags){
        return res
            .status(400)
            .json({ error: true, message: "No changes provided"});
    }

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if(!note){
            return res.status(404).json({error: true, message: "Note not found" });
        }

        if(title) note.title = title;
        if(content) note.content = content;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;

        await note.save();

        return res.json({
            error: false,
            note,
            message: "Note updated successfully",
        })

    } catch ( error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        })
    }
})

app.get('/get-all-notes', authenticateToken, async (req, res) => {
    const { user } = req.user;

    try {
        const notes = await Note.find({ userId: user._id }).sort({ isPinned: -1 });

        return res.json({
            error: false,
            notes,
            message: "Notes retrieved successfully",
        })
    } catch (error) {
        return res.json({
            error: true,
            message: "Internal Server Error",
        })
    }
})

app.delete('/delete-note/:noteId', authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if(!note){
            return res.status(404).json({ error: true, message: "Note not found"});
        }

        await Note.deleteOne({ _id: noteId, userId: user._id });

        return res.json({
            error: false,
            message: "Note deleted successfully",
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        })
    }
})

app.put('/update-note-pinned/:noteId', authenticateToken, async (req, res) => {
    const noteId = req.params.noteId;
    const { isPinned } = req.body;
    const { user } = req.user;

    try {
        const note = await Note.findOne({ _id: noteId, userId: user._id });

        if(!note){
            return res.status(404).json({error: true, message: "Note not found" });
        }
              
        note.isPinned = isPinned;
        
        await note.save();

        return res.json({
            error: false,
            note,
            message: "Note updated successfully",
        })

    } catch ( error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        })
    }
})

app.get('/search-notes/', authenticateToken, async (req, res) => {
    const { user } = req.user;
    const { query } = req.query;

    if(!query){
        return res
            .status(400)
            .json({
                error: true, 
                message: "Search Query is required"
            })
    }

    try {
        const matchingNotes = await Note.find({
            userId: user._id,
            $or: [
                { title: { $regex: new RegExp(query, "i") } },
                { content: { $regex: new RegExp(query, "i") } },
            ],
        })

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes found successfully"
        })
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
})

mongoose
    .connect(config.connectionString)
    .then(() => {
        console.log('App connected to database');
        app.listen(8000, () => {
            console.log(`App is listening to port: 8000`);
            
        })
        
    })
    .catch((error) => {
        console.log(error);
    })




export default app