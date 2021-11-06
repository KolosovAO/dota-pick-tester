// const mongoose = require("mongoose");

// module.exports = mongoose.model("User", {
//     username: {
//         type: String,
//         unique: true,
//         required: true
//     },
//     password: {
//         type: String,
//         required: true
//     }
// });

const USERS = [
    {
        _id: "TEMP_USER_ID",
        username: "temp_user",
        password: "temp_password",
    },
    {
        _id: "TEMP_USER_ID2",
        username: "temp_user1",
        password: "temp_user1",
    },
    {
        _id: "TEMP_USER_ASER",
        username: "aser",
        password: "aser",
    }
]


module.exports = {
    users: USERS,
    findOne({ username }, cb) {
        const user = USERS.find((u) => u.username === username);
        if (!user) {
            cb(null, null);
        }
        cb(null, user);
    },
    findById(id, cb) {
        const user = USERS.find((u) => u._id === id);
        if (!user) {
            cb(null, null);
        }
        cb(null, this);
    }
};