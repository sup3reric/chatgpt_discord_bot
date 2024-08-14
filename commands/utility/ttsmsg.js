const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { apikey } = require("../../config.json");
const { OpenAI } = require("openai");
const { buffer } = require("stream/consumers");
// const speechFile = path.resolve("./speech.mp3");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("ttsmsg")
    .setDescription("Input text for speech!")
    .addStringOption((option) =>
      option.setName("text").setDescription("Text to Speech")
    ),
  async execute(interaction) {
    const text = interaction.options.getString("text");
    interaction.deferReply();
    const openai = new OpenAI({ apiKey: apikey });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    // console.log(speechFile);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const attachment = new AttachmentBuilder(buffer, {
      name: `${text}.mp3`,
    });
    console.log(attachment);
    interaction.channel.send({ files: [attachment] });
    // await fs.promises.writeFile(speechFile, buffer);
    interaction.editReply(`Q: ${text}`);
  },
};
