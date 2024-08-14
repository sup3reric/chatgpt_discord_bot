const { SlashCommandBuilder } = require("discord.js");
const { apikey } = require("../../config.json");
const { OpenAI } = require("openai");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("translate!")
    .addStringOption((option) =>
      option.setName("text").setDescription("the text to be translated")
    )
    .addStringOption((option) =>
      option.setName("language").setDescription("destination language")
    ),
  async execute(interaction) {
    const text = interaction.options.getString("text");
    const lang = interaction.options.getString("language");
    interaction.deferReply();
    const openai = new OpenAI({ apiKey: apikey });
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Translate this text "${text}" into this "${lang}"`,
        },
      ],
      model: "gpt-4o",
    });
    let data = chatCompletion.choices[0].message.content;
    for (i = 0; i < data.length; i += 2000)
      interaction.channel.send(data.substring(i, i + 2000));
    interaction.editReply(`Q: ${text}`);
  },
};
