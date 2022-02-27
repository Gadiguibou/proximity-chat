const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let users = {};

const getDistanceInDegrees = (lat1, lon1, lat2, lon2) => {
  return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
};

const getDistanceInKmApprox = (lat1, lon1, lat2, lon2) => {
  return getDistanceInDegrees(lat1, lon1, lat2, lon2) * 111e3;
};

io.on("connection", (socket) => {
  console.log(
    `${new Date().toLocaleString()}: User with id ${socket.id} connected`
  );
  socket.on("disconnect", () => {
    console.log(
      `${new Date().toLocaleString()}: User with id ${socket.id} disconnected`
    );
  });

  socket.on("chat message", (msg) => {
    console.log(`message: ${msg}`);
    io.emit("chat message", msg);
  });

  socket.on("local message", async (name, msg, ack) => {
    console.log(`message sent ${name}`);
    const allSockets = await io.fetchSockets();
    const receivers = allSockets.map((s) => s.id);
    if (receivers.length > 0) {
      io.to(receivers).emit("local message", { id: name, message: msg });
      console.log(
        `${new Date().toLocaleString()}: ${name} sent the following message to [ ${receivers} ]: \n"${msg}"`
      );
      ack({
        status: "ok",
      });
    } else {
      console.log(
        `${new Date().toLocaleString()}: ${name} sent the following message but no one will receive it: \n"${msg}"`
      );
      ack({
        status: "czi",
      });
    }
  });

  socket.on("location", (name, { latitude, longitude }) => {
    console.log(name, latitude, longitude);
    users[name] = { latitude, longitude };
    console.log(
      `User with id ${name} reported position: ${latitude}, ${longitude}`
    );
  });
});

const interval = setInterval(async () => {
  const message = Object.keys(users).map((name) => ({
    id: name,
    location: users[name],
  }));
  io.emit("locations", message);
}, 10000);

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
