require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Allows the bot to connect to servers
        GatewayIntentBits.GuildMessages, // Allows reading messages in channels
        GatewayIntentBits.MessageContent // Allows reading message content (needed for commands)
    ],
});

// Fetch price data from API
async function fetchPrice(itemName) {
    try {
        const url = `https://api.markethunt.win/items/search?query=${encodeURIComponent(itemName)}`;
        const response = await axios.get(url);

        if (Array.isArray(response.data) && response.data.length > 0) {
            const item = response.data.find((data) => data.item_info.name === itemName);

            if (item && item.latest_market_data) {
                const price = item.latest_market_data.price;

                // Format the price with commas (e.g., 1,000,000)
                const formattedPrice = price ? price.toLocaleString() : "No price available";
                const urlSB = 'https://api.markethunt.win/items/search?query=SUPER|brie+';
                const responseSB = await axios.get(urlSB);
                const SB = responseSB.data.find((data) => data.item_info.name === "SUPER|brie+");
                const SBPrice = (price/SB.latest_market_data.price).toFixed(2);

                return `**${itemName}** price: ${formattedPrice} Gold\nSB price: ${SBPrice}\n(as of ${item.latest_market_data.date})`;
            } else {
                return `No price available for **${itemName}**.`;
            }
        } else {
            return `Item **${itemName}** not found.`;
        }
    } catch (error) {
        console.error(error);
        return "Error fetching data from API.";
    }
}

// Bot listens for messages
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith("!price")) {
        const args = message.content.split(" ").slice(1);
        if (args.length === 0) {
            return message.reply("Please provide an item name. Example: `!price SUPER|brie+`");
        }

        const itemName = args.join(" ");
        const priceMessage = await fetchPrice(itemName);
        message.reply(priceMessage);
    }
});

client.once("ready", () => {
    console.log(`Bot is online!`);
});

client.login(process.env.TOKEN); // Load token from .env file
