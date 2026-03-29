import express from "express";
import router from "./routing";
import cors from "cors";

const app = express();
app.use(cors());

app.use("/api", router);

app.listen(3000, () => {
    console.log("Server running on port 3000");
});