// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static("./public"))

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
var addedUser = false;

//  client emits 'new message'- this listens and executes
socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
    username: socket.username,
    department: socket.department,
    message: data
    });
});

// client emits 'add user'- this listens and executes
socket.on('add user', (username , department , currentUser) => {
    if (addedUser) return;

    //  store the username in the socket session for this client
    socket.username = username;
    socket.department = department
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
    numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
    username: socket.username,
    department: socket.department,
    numUsers: numUsers,
    currentUser: socket.currentUser
    });
});

//  client emits 'typing'-  we broadcast it to others
socket.on('typing', () => {
    socket.broadcast.emit('typing', {
    username: socket.username,
    department: socket.department
    });
});

//  client emits 'stop typing' - we broadcast it to others
socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
    username: socket.username,
    department: socket.department,

    });
});

// when the user disconnects
socket.on('disconnect', () => {
    if (addedUser) {
    --numUsers;

    // echo globally that this client has left
    socket.broadcast.emit('user left', {
        username: socket.username,
        department: socket.department,
        numUsers: numUsers
    });
    }
});
});