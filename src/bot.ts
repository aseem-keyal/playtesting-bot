import { Client, GatewayIntentBits, Partials, ChannelType, Interaction } from 'discord.js';
import { config } from "./config";
import handleTossupPlaytest from './handlers/tossupHandler';
import handleBonusPlaytest from './handlers/bonusHandler';
import handleNewQuestion from './handlers/newQuestionHandler';
import handleConfig from './handlers/configHandler';
import handleButtonClick from './handlers/buttonClickHandler';
import handleCategoryCommand from './handlers/categoryCommandHandler';
import { QuestionType } from './utils';
import handleAuthorCommand from './handlers/authorCommandHandler';

const userProgressMap = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ],
    allowedMentions: {
        parse: []
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
    try {
        if (message.author.id === config.DISCORD_APPLICATION_ID)
            return;

        if (message.content === '!config') {
            await handleConfig(message);
        } else if (message.content === '!category') {
            await handleCategoryCommand(message);
        } else if (message.content === '!author') {
            await handleAuthorCommand(message);            
        } else {
            let setUserProgress = userProgressMap.set.bind(userProgressMap);
            let deleteUserProgress = userProgressMap.delete.bind(userProgressMap);

            if (message.channel.type !== ChannelType.DM && message.content.includes('ANSWER:')) {
                await handleNewQuestion(message);
            } else if (message.channel.type === ChannelType.DM) {
                let userProgress = userProgressMap.get(message.author.id)

                if (userProgress?.type === QuestionType.Tossup) {
                    await handleTossupPlaytest(message, client, userProgress, setUserProgress, deleteUserProgress);
                } else if (userProgress?.type === QuestionType.Bonus) {
                    await handleBonusPlaytest(message, client, userProgress, setUserProgress, deleteUserProgress);
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    try {
        await handleButtonClick(interaction, userProgressMap.set.bind(userProgressMap));
    } catch (e) {
        console.log(e);
    }
});

client.login(config.DISCORD_TOKEN);