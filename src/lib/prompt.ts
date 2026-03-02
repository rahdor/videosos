import type { VideoProject } from "@/data/schema";
import { fal } from "./fal";

type EnhancePromptOptions = {
  type: "image" | "video" | "music" | "voiceover";
  project?: VideoProject;
};

const SYSTEM_PROMPT = `
You're a video editor assistant. You will receive instruction to enhance the description of
images, audio-clips and video-clips in a video project. You will be given the name of project
and a brief description. Use that contextual information to come up with created and well-formed
description for the media assets. The description should be creative and engaging.

Important guidelines:

1. The description should be creative and engaging.
2. It should be concise, don't exceed 2-3 sentences.
3. The description should be relevant to the project.
4. The description should be well-formed and grammatically correct.
5. Last but not least, **always** return just the enhanced prompt, don't add
any extra content and/or explanation. **DO NOT ADD markdown** or quotes, return the
**PLAIN STRING**.
`;

const VOICEOVER_SYSTEM_PROMPT = `
You're a voice-over text editor. Your job is to improve text for text-to-speech synthesis
while PRESERVING the user's original message and meaning.

Important guidelines:

1. KEEP the user's core message intact - do NOT change what they want to say.
2. Improve readability and flow for speech synthesis.
3. Add natural pauses using commas or periods where appropriate.
4. Fix grammar and punctuation without changing meaning.
5. Remove filler words or awkward phrasing while preserving intent.
6. Keep the same tone and style as the original text.
7. **NEVER** generate completely different content.
8. If the text is already good, return it with minimal changes.
9. **Always** return just the improved text, no explanations.
10. **DO NOT ADD markdown** or quotes, return the **PLAIN STRING**.
`;

export async function enhancePrompt(
  prompt: string,
  options: EnhancePromptOptions = { type: "video" },
) {
  const { type, project } = options;
  const projectInfo = !project
    ? ""
    : `
    ## Project Info

    Title: ${project.title}
    Description: ${project.description}
  `.trim();

  // Handle voiceover differently - preserve user's message while improving for TTS
  if (type === "voiceover") {
    const { data } = await fal.subscribe("fal-ai/any-llm", {
      input: {
        system_prompt: VOICEOVER_SYSTEM_PROMPT,
        prompt: `
          Improve this voice-over text for speech synthesis while keeping the same message:
          ${projectInfo}

          Original text: "${prompt}"
        `.trim(),
        model: "meta-llama/llama-3.2-1b-instruct",
      },
    });
    return data.output.replace(/^"|"$/g, "");
  }

  // For image, video, music - create a creative prompt
  const promptInfo = !prompt.trim() ? "" : `User prompt: ${prompt}`;

  const { data } = await fal.subscribe("fal-ai/any-llm", {
    input: {
      system_prompt: SYSTEM_PROMPT,
      prompt: `
        Create a prompt for generating a ${type} via AI inference. Here's the context:
        ${projectInfo}
        ${promptInfo}
      `.trim(),
      model: "meta-llama/llama-3.2-1b-instruct",
    },
  });
  return data.output.replace(/^"|"$/g, "");
}
