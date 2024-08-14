const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { apikey } = require("../../config.json");
const { OpenAI } = require("openai");
const Canvas = require("@napi-rs/canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("image")
    .setDescription("Generate image!")
    .addStringOption((option) =>
      option.setName("prompt").setDescription("The prompt for image generation")
    ),
  async execute(interaction) {
    const prompt = interaction.options.getString("prompt");
    interaction.deferReply();
    const openai = new OpenAI({ apiKey: apikey });
    const image = await openai.images.generate({
      prompt: prompt,
      model: "dall-e-3",
    });
    let imageUrl = image.data[0].url;
    const canvas = Canvas.createCanvas(1024, 1024);
    const context = canvas.getContext("2d");
    const background = await Canvas.loadImage(imageUrl);
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    const attachment = new AttachmentBuilder(await canvas.encode("png"), {
      name: `${prompt}.png`,
    });
    // console.log(imageUrl);
    // interaction.reply({ files: [attachment] });
    interaction.channel.send({ files: [attachment] });
    interaction.editReply(`prompt: ${prompt}`);
  },
};
