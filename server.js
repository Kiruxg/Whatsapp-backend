const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const Pusher = require("pusher")
const Rooms = require("./dbRooms") //Message collection
const app = express()
// app.use(() => {
//   console.log("TESTTTTTTTTTTTT")
//   cors({ credentials: true, origin: true })
// })
const port = process.env.PORT || 9000 //heroku dev env or local env

const pusher = new Pusher({
  appId: "1067930",
  key: "9c1476dabbd8085397d7",
  secret: "3b7bd3eca4ba9a648358",
  cluster: "us3",
  encrypted: true
})
const corsOptions = {
  origin: "*",
  methods: "GET,POST,PUT,PATCH,DELETE"
}
// "http://localhost:3000"
// pusher.trigger('my-channel', 'my-event', {
//   'message': 'hello world'
// });

//middlewares
// app.use(function (req, res, next) {
//   // Website you wish to allow to connect
//   res.setHeader("Access-Control-Allow-Origin", "https://whatsapp-mern-b640a.web.app")

//   // Request methods you wish to allow
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")

//   // Request headers you wish to allow
//   res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type")

//   // Set to true if you need the website to include cookies in the requests sent
//   // to the API (e.g. in case you use sessions)
//   res.setHeader("Access-Control-Allow-Credentials", true)

//   // Pass to next layer of middleware
//   next()
// })
app.use((req, res, next) => {
  express.json()
  next()
}) //parses incoming json objects
app.options("/rooms", cors(corsOptions)) // enable pre-flight request
//endpoints
app.get("/", (req, res) => {
  res.status(200).send("Whatsappweb-backend")
})
//rooms
app.get("/rooms", (req, res) => {
  Rooms.find((err, data) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(200).send(data)
    }
  })
})
app.get("/rooms/:roomId/messages", (req, res) => {
  Rooms.find({ _id: req.params.roomId }, (err, data) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(200).send(data)
    }
  })
})

app.post("/rooms/new", (req, res) => {
  const roomInfo = req.body
  console.log(roomInfo)
  Rooms.create(roomInfo, (err, data) => {
    if (err) {
      res.status(500).send(err)
    } else {
      res.status(201).send(data)
    }
  })
})
app.post("/rooms/:roomId/messages/new", (req, res) => {
  const newMessage = req.body
  //change messageContents in Rooms coollections
  async function updateMessage() {
    try {
      const result = await Rooms.updateOne({ _id: req.params.roomId }, { $push: { messageContents: newMessage } })
      console.log("the real data: ", result)
      res.status(201).send(result)
    } catch (err) {
      console.log("my err", err)
    }
  }
  updateMessage()
})

//database
const connection_url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.gwrie.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`
mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
})
const db = mongoose.connection
db.once("open", () => {
  console.log("DB connected")
  // const msgCollection = db.collection("messagecontents")
  // const changeStream = msgCollection.watch()
  const roomCollection = db.collection("rooms")
  const changeStream = roomCollection.watch()

  //realtime db
  changeStream.on("change", change => {
    console.log("my change", change)
    if (change.operationType == "update") {
      const messageDetails = change.updateDescription.updatedFields[Object.keys(change.updateDescription.updatedFields).toString()]
      console.log("the main", Object.keys(change.updateDescription.updatedFields).toString())
      console.log("the message", messageDetails)
      console.log("the type", typeof messageDetails)
      console.log("the type2", Array.isArray(messageDetails))

      if (Array.isArray(messageDetails)) {
        pusher.trigger("messages", "inserted", {
          name: messageDetails[0].name,
          message: messageDetails[0].message,
          timestamp: messageDetails[0].timestamp,
          received: messageDetails[0].received,
          userId: messageDetails[0].userId,
          roomId: messageDetails[0].roomId
        })
      } else {
        pusher.trigger("messages", "inserted", {
          name: messageDetails.name,
          message: messageDetails.message,
          timestamp: messageDetails.timestamp,
          received: messageDetails.received,
          userId: messageDetails.userId,
          roomId: messageDetails.roomId
        })
      }
    }
  })
})

//listen
app.listen(port, () => console.log(`Listening on localhost: ${port}`))
