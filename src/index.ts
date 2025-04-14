import { createAudioStreamFromText } from "#utils/createAudioStreamFromText.js";
import { delay } from "#utils/promisedDelay.js";
import { uploadToDrive } from "#utils/uploadToDrive.js";
import ngrok from "@ngrok/ngrok";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import process from "process";

const app = express();
const port = process.env.PORT ?? "3001";

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.get("/api/v1", (req, res) => {
  res.status(200).json({ message: "API is working!" });
});

app.route("/api/v1/convert").post(async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const contentArr: { original: string; translation: string }[] = req.body;
    const result = [];

    for (const { original, translation } of contentArr) {
      try {
        const audioStream = await createAudioStreamFromText(translation);
        const response = await uploadToDrive(audioStream, original);
        result.push({ response, success: true });

        await delay(5000);
      } catch (err) {
        console.error(`Error processing "${original}":`, err);
        result.push({ error: err, success: false });
      }
    }

    const allSuccessful = result.every((result) => result.success);

    if (allSuccessful) {
      res.status(200).json({
        message: "Text to audio file conversion is successful!",
        result,
      });
    } else {
      res.status(400).json({
        error: "Some files were not successfully uploaded",
        result,
      });
    }
  } catch (err) {
    console.error(err);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    res.status(err.statusCode ?? 500).json({ err });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

ngrok
  .connect({ addr: port, authtoken_from_env: true })
  .then((listener) => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`Ingress established at: ${listener.url()}`);
  })
  .catch((error: unknown) => {
    console.error(error);
  });
