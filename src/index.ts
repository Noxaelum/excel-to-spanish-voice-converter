/* eslint-disable */
import { authorize } from "#utils/googleInit.js";
import ngrok from "@ngrok/ngrok";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ElevenLabsClient } from "elevenlabs";
import express, { Request, Response } from "express";
import { google } from "googleapis";
import process from "process";
import { Readable } from "stream";

const app = express();
const port = process.env.PORT ?? "3001";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const elevenLabsClient = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
}

const uploadToDrive = async (
  audioStream: Readable | undefined,
  name: string,
) => {
  try {
    if (!audioStream) {
      throw new Error("Invalid audioStream");
    }
    const authClient: any = await authorize();
    const drive = google.drive({ auth: authClient, version: "v3" });

    const res = await drive.files.create({
      fields: "id, name",
      media: {
        body: audioStream,
        mimeType: "audio/mpeg",
      },
      requestBody: {
        name,
      },
    });

    return res;
  } catch (err) {
    console.error("Upload to drive error");
    throw err;
  }
};

const createAudioStreamFromText = async (
  text: string,
): Promise<Readable | undefined> => {
  try {
    if (!text) {
      throw new Error(`Invalid text for TTS: "${text}"`);
    }
    const audioStream = await elevenLabsClient.textToSpeech.convertAsStream(
      "JBFqnCBsd6RMkjVDRZzb",
      {
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
        text,
        voice_settings: {
          similarity_boost: 0,
          speed: 1.0,
          stability: 0,
          use_speaker_boost: true,
        },
      },
    );

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }

    const content = Buffer.concat(chunks);

    const stream = new Readable();
    stream.push(content);
    stream.push(null);
    return stream;
  } catch (err) {
    console.error("ElevenLabs API error for text:", text);
    throw err;
  }
};

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.get("/api/v1", (req, res) => {
  res.status(200).json({ message: "API is working!" });
});

app.route("/api/v1/convert").post(async (req: Request, res: Response) => {
  try {
    const contentArr: { original: string; translation: string }[] = req.body;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

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
  } catch (err: any) {
    console.error(err);
    res.status(err.statusCode ?? 500).json({ err });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

ngrok
  .connect({ addr: port, authtoken_from_env: true })
  .then((listener) => {
    console.log(`Ingress established at: ${listener.url()}`);
  })
  .catch((error: unknown) => {
    console.error(error);
  });
