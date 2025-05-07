const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create or join', (room) => {
        const clientsInRoom = io.sockets.adapter.rooms[room];
        const numClients = clientsInRoom ? clientsInRoom.size : 0;

        if (numClients === 0) {
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients === 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
    });

    socket.on('join room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('offer', (offer, roomId) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (answer, roomId) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice candidate', (candidate, roomId) => {
        socket.to(roomId).emit('ice candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});