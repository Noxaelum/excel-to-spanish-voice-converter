import express from "express";
const app = express();
const port = process.env.PORT ?? "3001";

app.get("/", (req, res) => {
  res.send("Hello world!");
  console.log("Response sent");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
