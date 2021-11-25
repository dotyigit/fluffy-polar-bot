const dotenv = require('dotenv').config()
const _ = require('lodash')
const axios = require('axios')
const moment = require('moment')
const ethers = require('ethers')

// const Discord = require('discord.js')

// const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

const cache = require('./cache')
const tweet = require('./tweet')


/* client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
 */

console.log("Fluffy Polar Bears Sales Bot Started Working...");

const startTimeStamp = Math.trunc(moment(new Date).valueOf()/1000);

setInterval(() => {

    const lastSaleTime = cache.get('lastSaleTime', null) || startTimeStamp;

    axios.get('https://api.etherscan.io/api', {
        params: {
            module: 'account',
            action: 'tokennfttx',
            contractaddress: process.env.CONTRACT_ADRESS,
            page: 1,
            offset: 20,
            sort: 'desc',
            apikey: process.env.ETHERSCAN_API_KEY
        }
    }).then((response) => {
        let events = _.get(response, ['data', 'result']);

        events = _.orderBy(events, ['timestamp'],['asc'])

        _.each(events, (event) => {
            const created = _.get(event, 'timeStamp');
            if (created > lastSaleTime + 1) {
                const tokenID = _.get(event, 'tokenID')

                const transactionHash = _.get(event, 'hash')

                axios.get(`https://api.opensea.io/api/v1/asset/${process.env.CONTRACT_ADRESS}/${tokenID}`)
                .then((response) => {
                    const lastSale = _.get(response, ['data', 'last_sale'])

                    const lastSaleTransactionHash = _.get(lastSale, ['transaction', 'transaction_hash'])

                    // POST
                    /* const channel = client.channels.cache.find(channel => channel.name === 'general')
                    channel.send(`New Sale: ${tokenID} is sold for ${ethers.constants.EtherSymbol}${formattedEthPrice} (${formattedUsdPrice})`); */
                    if (transactionHash == lastSaleTransactionHash) {
                        const assetName = _.get(response, ['data','name']);
                        const openseaLink = _.get(response, ['data','permalink']);

                        const totalPrice = _.get(lastSale, 'total_price')

                        const tokenDecimals = _.get(lastSale, ['payment_token', 'decimals']);
                        const tokenUsdPrice = _.get(lastSale, ['payment_token', 'usd_price']);
                        const tokenEthPrice = _.get(lastSale, ['payment_token', 'eth_price']);

                        const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
                        const formattedEthPrice = formattedUnits * tokenEthPrice;
                        const formattedUsdPrice = formattedUnits * tokenUsdPrice;

                        const tweetText = `${assetName} just sold! Price: ${ethers.constants.EtherSymbol}${formattedEthPrice} ($${Number(formattedUsdPrice).toFixed(2)}) #NFT #FPBears ${openseaLink}`;
                        tweet.tweet(tweetText)
                        cache.set('lastSaleTime', Math.trunc(moment(new Date).valueOf()/1000))
                    }

                }).catch((error) => {
                    console.error(error)
                })
            }
        });
    }).catch((error) => {
        console.error(error);
    });
}, 60000);


// client.login(process.env.CLIENT_TOKEN);