const socket = io();

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localVideo.srcObject = stream;
  })
  .catch((error) => {
    console.error('Error accessing media devices.', error);
  });

let peerConnection;
let dataChannel;

function createDataChannel() {
  dataChannel = peerConnection.createDataChannel('chat');

  dataChannel.onopen = () => console.log('Data channel is open');
  dataChannel.onmessage = (event) => console.log('Received message:', event.data);
}

// Modify createPeerConnection to optionally create a data channel for the offerer
function createPeerConnection(roomId, isOfferer = false) {
  const config = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302' // Google's public STUN server
      }
    ]
  };

  peerConnection = new RTCPeerConnection(config);

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice candidate', event.candidate, roomId);
    }
  };

  // Handle remote video stream
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Handle incoming data channel (for the answerer)
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onopen = () => console.log('Data channel is open');
    dataChannel.onmessage = (event) => console.log('Received message:', event.data);
  };

  // Add local stream to peer connection
  const localStream = localVideo.srcObject;
  for (const track of localStream.getTracks()) {
    peerConnection.addTrack(track, localStream);
  }

  // If this peer is the offerer, create the data channel
  if (isOfferer) {
    createDataChannel();
  }
}

const roomId = 'some_room_id'; // This should be dynamically generated or input by the user

// Emit an event to join a room
socket.emit('join room', roomId);

// Listen for offers
socket.on('offer', handleOffer);

// Listen for answers
socket.on('answer', handleAnswer);

// Listen for ICE candidates
socket.on('ice candidate', handleIceCandidate);

function handleOffer(offer) {
  console.log('Received offer:', offer);
  if (!peerConnection) {
    createPeerConnection(roomId, false); // Answerer does not create data channel
  }

  peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    .then(() => peerConnection.createAnswer())
    .then(answer => {
      return peerConnection.setLocalDescription(answer).then(() => answer);
    })
    .then(answer => {
      socket.emit('answer', answer, roomId);
    })
    .catch(error => {
      console.error('Error handling offer:', error);
    });
}

// Example: When you want to initiate a connection (be the offerer), call createPeerConnection(roomId, true);

function handleAnswer(answer) {
  console.log('Received answer:', answer);
  if (peerConnection) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      .catch(error => {
        console.error('Error handling answer:', error);
      });
  }
}

function handleIceCandidate(candidate) {
  console.log('Received ICE candidate:', candidate);
  if (peerConnection) {
    peerConnection.addIceCandidate(candidate)
      .catch(error => {
        console.error('Error adding received ice candidate', error);
      });
  }
}