require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const axios = require("axios");

// Custom emoji IDs (Upload these to your bot's server)
const emojiSB = "1340310656439549972";
const emojiGold = "1340310634113405008";
const emojiUp = "📈";
const emojiDown = "📉";
const emojiNeutral = "➖";

const customJargon = {
  cc: "Condensed Creativity",
  cf: "Champion's Fire",
  dbc: "Dragonbane Charm",
  edbc: "Extreme Dragonbane Charm",
  esb: "Empowered SUPER|brie+",
  hat: "Magical Holiday Hat",
  rib: "Kalor'ignis Rib",
  sb: "SUPER|brie+",
  sdbc: "Super Dragonbane Charm",
  udbc: "Ultimate Dragonbane Charm",
  wt: "Wild Tonic",
};

const getItemName = (key) => (key in customJargon ? customJargon[key] : key);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Required for slash commands
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 🔹 Define the `/price` command
const commands = [
  new SlashCommandBuilder()
    .setName("price")
    .setDescription("Get the price of an item from MarketHunt API")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Name of the item")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// 🔹 Register the slash command
(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("✅ Slash commands registered!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();

// 🔹 Function to fetch price from API
async function fetchPrice(itemName) {
  try {
    const jargonName = getItemName(itemName);
    if (jargonName) itemName = jargonName;
    
    const url = `https://api.markethunt.win/items/search?query=${encodeURIComponent(
      itemName
    )}`;
    const response = await axios.get(url);

    if (Array.isArray(response.data) && response.data.length > 0) {
      const item = response.data.find(
        (data) => data.item_info.name.toLowerCase() === itemName.toLowerCase()
      );

      if (item) {
        return preparePrice(item);
      } else {
        const itemAlt = response.data[0];
        if (itemAlt && itemAlt.latest_market_data) return preparePrice(itemAlt);
        else return `No price available for **${itemName}**.`;
      }
    } else {
      return `Item **${itemName}** not found.`;
    }
  } catch (error) {
    console.error(error);
    return "Error fetching data from API.";
  }
}

async function preparePrice(item) {
  const latestPrice = item.latest_market_data.price;
  const formattedPrice = latestPrice.toLocaleString();
  const latestSBPrice = item.latest_market_data.sb_price.toFixed(2);
  const itemID = item.item_info.item_id;

  // Fetch item history
  const { data } = await axios.get(
    `https://api.markethunt.win/items/${itemID}`
  );
  const secondLatestMarketData = data.market_data.at(-2);

  // Calculate price change
  const calcChange = (newPrice, oldPrice) =>
    oldPrice ? (((newPrice - oldPrice) / oldPrice) * 100).toFixed(2) : "0.00";

  const priceChange = calcChange(latestPrice, secondLatestMarketData.price);
  const SBPriceChange = calcChange(
    latestSBPrice,
    secondLatestMarketData.sb_price
  );

  // Determine price trend emoji
  const getTrendEmoji = (change) =>
    change > 0 ? emojiUp : change < 0 ? emojiDown : emojiNeutral;

  return (
    `**${item.item_info.name}**\n` +
    `<:myemoji:${emojiGold}> ${formattedPrice} Gold ${getTrendEmoji(
      priceChange
    )}  (${priceChange}%)\n` +
    `<:myemoji:${emojiSB}> ${latestSBPrice} SB ${getTrendEmoji(
      SBPriceChange
    )}  (${SBPriceChange}%)\n` +
    `(as of ${item.latest_market_data.date})`
  );
}

// 🔹 Handle the `/price` command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "price") {
    try {
      // Defer the reply to avoid timeout
      await interaction.deferReply();

      const itemName = interaction.options.getString("item");

      if (itemName) {
        // Fetch price data and prepare the reply
        const priceMessage = await fetchPrice(itemName);

        // After fetching data, edit the initial deferred reply with the actual price message
        await interaction.editReply(priceMessage);
      } else {
        // If no item name was provided, edit the reply accordingly
        await interaction.editReply("Please enter the name of an item.");
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "There was an error processing your request."
      );
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}!`);
});

client.login(process.env.TOKEN);
