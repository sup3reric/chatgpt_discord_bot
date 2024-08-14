// Require the necessary discord.js classes
const { token } = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
  EndBehaviorType,
} = require("@discordjs/voice");
const { apikey } = require("./config.json");
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: apikey });
const prism = require("prism-media");
const { pipeline } = require("stream");
const { createWriteStream } = require("node:fs");

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  // Check if the bot is already in a voice channel
  const botChannel = oldState.channel;

  // Check if the new state has a channel and if it's different from the old state
  if (newState.channel && newState.channel !== oldState.channel) {
    const activeVoiceChannel =
      newState.channel.members.size > 0 ? newState.channel : null;

    if (activeVoiceChannel) {
      if (!botChannel)
        console.log(`Joining voice channel: ${activeVoiceChannel.name}`);
      else console.log(`Switching voice channel: ${activeVoiceChannel.name}`);
      startTranscription(activeVoiceChannel);
    }
  }
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

async function startTranscription(voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const receiver = connection.receiver;
  receiver.speaking.on("start", (userId) => {
    console.log(`User ${userId} started speaking`);
    createListeningStream(receiver, userId, client, connection);
  });
}

function createListeningStream(receiver, userId, client, connection) {
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 100,
    },
  });

  const oggStream = new prism.opus.Decoder({
    frameSize: 960,
    channels: 2,
    rate: 48000,
  });

  const filename = `./recordings/${userId}-${Date.now()}.ogg`;
  const output = createWriteStream(filename);
  opusStream.pipe(oggStream);
  oggStream.pipe(output);

  // pipeline(opusStream, oggStream, output, async (err) => {
  //   if (err) {
  //     console.warn(`❌ Error recording file ${filename} - ${err.message}`);
  //     return;
  //   }

  //   console.log(`✅ Recorded ${filename}`);

  //   const transcription = await transcribeAudio(filename);
  //   if (transcription) {
  //     const user = await client.users.fetch(userId);
  //     const textChannel = connection.joinConfig.guild?.channels.cache.find(
  //       (channel) => channel.type === 0
  //     );

  //     if (textChannel) {
  //       await textChannel.send(
  //         `Transcription for ${user.username}: ${transcription}`
  //       );
  //     }
  //   }

  //   // Delete the audio file after transcription
  //   fs.unlinkSync(filename);
  // });
}

async function transcribeAudio(filename) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filename),
      model: "whisper-1",
    });

    console.log(transcription.text);
    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return undefined;
  }
}

// Log in to Discord with your client's token
client.login(token);
