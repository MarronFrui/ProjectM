// server/index.ts
import express from "express";
import cors from "cors";
import router from "./routing.ts";

const app = express();
app.use(cors());

// All availability info
app.use("/api", router);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});