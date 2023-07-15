import { Client, EmbedBuilder, Message, TextChannel } from "discord.js";
import { ServerChannelType, getEmbeddedMessage, getServerChannels, removeBonusValue, removeSpoilers, saveBonusDirect, shortenAnswerline } from "src/utils";

export default async function handleBonusPlaytest(message:Message<boolean>, client:Client<boolean>, userProgress:any, setUserProgress:(key:any, value:any) => void, deleteUserProgres: (key:any) => void) {
    let validGradingResponse = userProgress.grade && (message.content.toLowerCase().startsWith('y') || message.content.toLowerCase().startsWith('n'));

    if (message.content.toLowerCase().startsWith('x')) {
        deleteUserProgres(message.author.id);
        message.author.send(getEmbeddedMessage("Ended bonus reading."));

        return;
    }

    if (!userProgress.grade && (message.content.toLowerCase().startsWith('d') || message.content.toLowerCase().startsWith('p'))) {
        message.author.send(`ANSWER: ${removeSpoilers(userProgress.answers[userProgress.index])}`);
    }

    if (!userProgress.grade && message.content.toLowerCase().startsWith('d')) {
            setUserProgress(message.author.id, {
                ...userProgress,
                grade: true
            });

            message.author.send({
                embeds: [
                    new EmbedBuilder().setDescription("Were you correct? Type `y`/`yes` or `n`/`no`. If you'd like to indicate your answer, you can put it in parenthesis at the end of your message, e.g. `y (foo)`")
                ]
            });
    }

    if (validGradingResponse || (!userProgress.grade && message.content.toLowerCase().startsWith('p'))) {
        const note = message.content.match(/\((.+)\)/);
        const results = [
            ...userProgress.results, {
                points: message.content.toLowerCase().startsWith('y') ? 10 : 0,
                note: note ? note[1] : null
            }
        ];
        const index = userProgress.index + 1;

        setUserProgress(message.author.id, {
            ...userProgress,
            grade: false,
            index,
            results
        });

        if (userProgress.parts.length > index) {
            message.author.send(removeBonusValue(removeSpoilers(userProgress.parts[index])));
        } else {
            const resultsChannels = getServerChannels(userProgress.serverId, ServerChannelType.Results);
            let resultMessage = `<@${message.author.id}> `;  
            let partMessages:string[] = [];
            let totalPoints = 0;

            results.forEach((r:any, i:number) => {
                let answer = shortenAnswerline(userProgress.answers[i]);
                let partMessage = '';

                if (r.points > 0) {
                    totalPoints += r.points;
                    partMessage += `got ||${answer}||`;
                } else {
                    partMessage += `missed ||${answer}||`;
                }

                partMessage += (r.note ? ` (answer given: "||${r.note}||")` : '')
                partMessages.push(partMessage);
                saveBonusDirect(userProgress.serverId, userProgress.questionId, userProgress.authorId, message.author.id, i + 1, r.points, r.note);
            });

            resultMessage += partMessages.join(', ') + ` for a total of ${totalPoints} points`;
            
            for (let resultChannel of resultsChannels) {
                const threadName = `Conversion data for ${userProgress.authorName}'s bonus beginning "${userProgress.leadin.slice(0, 30)}..."`;
                const channel = client.channels.cache.get(resultChannel.channel_id) as TextChannel;
                let thread = channel.threads.cache.find(x => x.name === threadName);
    
                if (!thread) {
                    thread = await channel.threads.create({
                        name: threadName,
                        autoArchiveDuration: 60
                    });
                }
    
                thread.send(resultMessage);
            }

            deleteUserProgres(message.author.id);

            message.author.send({
                embeds: [
                    new EmbedBuilder().setDescription(`Thanks, your result has been sent to ${resultsChannels.map(c => `<#${c.channel_id}>`).join(', ')}`)
                ]
            });
        }
    }
}