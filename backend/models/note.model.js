import mongoose from "mongoose";

const noteSchema =  mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        content: { 
            type: String,
            required: true,
        },
        tags: { 
            type: [String],
            default: [], 
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        userId: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);

export const Note = mongoose.model('Note', noteSchema)