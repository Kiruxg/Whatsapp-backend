const mongoose = require("mongoose");

const whatsappSchema = mongoose.Schema({
  message: String,
  name: String,
  timestamp: String,
  received: Boolean,
  // rooms_id:
});

module.exports = mongoose.model("messagecontents", whatsappSchema);
