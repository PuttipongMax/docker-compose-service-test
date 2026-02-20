const express = require("express"); const app = express(); app.get("/", (req, res) => res.send("Gateway Ready")); app.listen(3000, () => console.log("Gateway running on 3000"));
