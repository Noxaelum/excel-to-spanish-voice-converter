import { elevenLabsClient } from "#constants/elevenLabsClient.js";
import { Readable } from "stream";

export const createAudioStreamFromText = async (
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
