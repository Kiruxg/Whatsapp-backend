const express = require("express");
const mongoose = require("mongoose");
const Pusher = require("pusher");
const Rooms = require("./dbRooms"); //Message collection
const { v4: uuidV4 } = require("uuid");
const app = express();
const port = process.env.PORT || 9000; //heroku dev env or local env

const pusher = new Pusher({
  appId: "1067930",
  key: "9c1476dabbd8085397d7",
  secret: "3b7bd3eca4ba9a648358",
  cluster: "us3",
  encrypted: true,
});

// pusher.trigger('my-channel', 'my-event', {
//   'message': 'hello world'
// });

//middlewares
app.use(express.json()); //parses incoming json objects
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"),
    res.setHeader("Access-Control-Allow-Headers", "*"),
    next();
});

//endpoints
app.get("/", (req, res) => {
  res.status(200).send("Hello weorddddddld");
});
// app.get("/v1/messages/sync", (req, res) => {
//   Messages.find((err, data) => {
//     if (err) {
//       res.status(500).send(err);
//     } else {
//       res.status(200).send(data);
//     }
//   });
// });
// app.post("/v1/messages/new", (req, res) => {
//   const dbMessage = req.body;
//   Messages.create(dbMessage, (err, data) => {
//     if (err) {
//       res.status(500).send(err);
//     } else {
//       res.status(201).send(data);
//     }
//   });
// });

//rooms
app.get("/rooms/:roomId/messages/sync", (req, res) => {
  Rooms.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});
app.post("/create-new-room", (req, res) => {
  const roomInfo = req.body;
  Rooms.create(roomInfo, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.redirect(`rooms/${uuidV4()}/messages/sync`);
      res.status(201).send(data);
    }
  });
});
app.post("/rooms/:roomId/messages/new", (req, res) => {
  const newMessage = req.body;
  //change messageContents in Rooms coollections
  Rooms.update(
    { messageContents: [...messageContents] },
    { $set: { messageContents: [...messageContents, newMessage] } }
  ).then((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//database
const connection_url =
  "mongodb+srv://admin:Boy123kg@cluster0.gwrie.mongodb.net/whatsappdb?retryWrites=true&w=majority";
mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once("open", () => {
  console.log("DB connected");
  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  //realtime db
  changeStream.on("change", (change) => {
    console.log(change);
    if (change.operationType == "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering Pusher");
    }
  });
});

//listen
app.listen(port, () => console.log(`Listening on localhost: ${port}`));
