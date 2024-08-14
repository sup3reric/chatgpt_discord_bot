const { SlashCommandBuilder } = require("discord.js");
const { apikey } = require("../../config.json");
const { OpenAI } = require("openai");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .addStringOption((option) =>
      option.setName("target").setDescription("The input to echo back")
    ),
  async execute(interaction) {
    const target = interaction.options.getString("target");
    interaction.deferReply();
    const openai = new OpenAI({ apiKey: apikey });
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: target }],
      model: "gpt-4o",
    });
    let data = chatCompletion.choices[0].message.content;
    for (i = 0; i < data.length; i += 2000)
      interaction.channel.send(data.substring(i, i + 2000));
    interaction.editReply(`Q: ${target}`);
  },
};
