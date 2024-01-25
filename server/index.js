const { WebSocket, WebSocketServer } = require("ws");
const http = require("http");
const uuidv4 = require("uuid").v4;

// Spinning the http server and the WebSocket server.
const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

// I'm maintaining all active connections in this object
const clients = {};
// I'm maintaining all active users in this object
const users = {};
// The current editor content is maintained here.
let editorContent = null;
// User activity history.
let userActivity = [];

// Event types
const typesDef = {
  USER_EVENT: "userevent",
  CONTENT_CHANGE: "contentchange",
};

function broadcastMessage(json, currentChannel) {
  // We are sending the current data to all connected clients
  const data = JSON.stringify(json);
  for (let userId in clients) {
    let connectionObj = clients[userId];
    let client = connectionObj.conn;
    if (
      currentChannel === connectionObj.channelName &&
      client.readyState === WebSocket.OPEN
    ) {
      client.send(data);
    }
  }
}

function handleMessage(message, userId) {
  const dataFromClient = JSON.parse(message.toString());
  const json = { type: dataFromClient.type };
  if (dataFromClient.type === typesDef.USER_EVENT) {
    users[userId] = dataFromClient;
    clients[userId].channelName = dataFromClient.channelName;
    userActivity.push(`${dataFromClient.username} joined to edit the document`);
    json.data = { users, userActivity };
  } else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
    editorContent = dataFromClient.content;
    userObj = dataFromClient.userObj;
    messageId = dataFromClient.messageId;
    json.data = { editorContent, userObj, messageId, userActivity };
    broadcastMessage(json, dataFromClient.channelName);
  }
}

function handleDisconnect(userId, channelName) {
  console.log(`${userId} disconnected.`);
  const json = { type: typesDef.USER_EVENT };
  const username = users[userId]?.username || userId;
  userActivity.push(`${username} left the document`);
  json.data = { users, userActivity };
  delete clients[userId];
  delete users[userId];
  broadcastMessage(json);
}

// A new client connection request received
wsServer.on("connection", function (connection) {
  // Generate a unique code for every user
  const userId = uuidv4();
  console.log("Recieved a new connection");

  // Store the new connection and handle messages
  clients[userId] = { conn: connection };
  console.log(`${userId} connected.`);
  connection.on("message", (message) => handleMessage(message, userId));
  // User disconnected
  connection.on("close", () => handleDisconnect(userId));
});
