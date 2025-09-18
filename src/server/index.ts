import express from "express";

const port = parseInt(process.env.PORT || "") || 3000;

const app = express();

app.use(express.static("dist/client"));

const router = express.Router();

router.use(express.json());

app.use("/api", router);

router.get("/hello", (req, res) => {
  res.send({ echo: req.body }).status(200);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
