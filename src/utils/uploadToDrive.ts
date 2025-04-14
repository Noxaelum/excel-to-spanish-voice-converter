import { google } from "googleapis";
import { Readable } from "stream";

import { authorize } from "./googleInit.js";

export const uploadToDrive = async (
  audioStream: Readable | undefined,
  name: string,
) => {
  try {
    if (!audioStream) {
      throw new Error("Invalid audioStream");
    }
    const authClient = await authorize();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
