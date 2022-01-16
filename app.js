const dotenv = require('dotenv').config()
const _ = require('lodash')
const axios = require('axios')
const moment = require('moment')
const ethers = require('ethers')

const Discord = require('discord.js')

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

const cache = require('./cache')
const tweet = require('./tweet')


client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


console.log("Fluffy Polar Bears Sales Bot Started Working...");


const query = `
query GetEventsQuery($pagination: PaginationInput, $filter: EventFilterInput) {
    events(pagination: $pagination, filter: $filter) {
      ...EventFragment
    }
  }
  
fragment EventFragment on Event {
  id
  from
  to
  type
  hash
  createdAt
  token {
    tokenId
    image
    name
  }
  collection {
    address
    name
    description
    totalSupply
    logo
    floorOrder {
      price
    }
  }
  order {
    isOrderAsk
    price
    endTime
    currency
    strategy
    status
    params
  }
}`




function formatAndSendTweetOpensea(event) {
    // Handle both individual items + bundle sales
    const assetName = _.get(event, ['asset', 'name'], _.get(event, ['asset_bundle', 'name']));
    const openseaLink = _.get(event, ['asset', 'permalink'], _.get(event, ['asset_bundle', 'permalink']));

    const totalPrice = _.get(event, 'total_price');

    const tokenDecimals = _.get(event, ['payment_token', 'decimals']);
    const tokenUsdPrice = _.get(event, ['payment_token', 'usd_price']);
    const tokenEthPrice = _.get(event, ['payment_token', 'eth_price']);

    const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
    const formattedEthPrice = formattedUnits * tokenEthPrice;
    const formattedUsdPrice = formattedUnits * tokenUsdPrice;

    const tweetText = `${assetName} bought on @OpenSea for ${ethers.constants.EtherSymbol}${formattedEthPrice} ($${Number(formattedUsdPrice).toFixed(2)}) #NFT #FPBears ${openseaLink}`;
    const channel = client.channels.cache.find(channel => channel.id === '921446553338658876')
    // TEST CHANNEL BELOW
    // const channel = client.channels.cache.find(channel => channel.id === '911572120721559572')
    console.log(tweetText);
    
    channel.send(tweetText);

    return tweet.tweet(tweetText);
}


function formatAndSendTweetLooksrare(event) {
    const assetName = _.get(event, ['token', 'name']);
    const looksRareLink = "https://looksrare.org/collections/" + _.get(event, ['collection', 'address']) + "/" +_.get(event, ['token', 'tokenId']);

    const price = _.get(event, ['order', 'price']);

    const formattedEthPrice = ethers.utils.formatEther(price);

    axios.get('https://api.coinbase.com/v2/prices/ETH-USD/spot').then((response) => {
        const ethResponse = response
    
        const ethUsdPrice = _.get(ethResponse, ['data', 'data', 'amount'], 0)
    
        if (ethUsdPrice) {
    
            const formattedUsdPrice = formattedEthPrice * ethUsdPrice
            
            const tweetText = `${assetName} bought on @LooksRareNFT for ${ethers.constants.EtherSymbol}${formattedEthPrice} ($${Number(formattedUsdPrice).toFixed(2)}) #NFT #FPBears ${looksRareLink}`;
            const channel = client.channels.cache.find(channel => channel.id === '921446553338658876')
            // TEST CHANNEL BELOW
            // const channel = client.channels.cache.find(channel => channel.id === '911572120721559572')
            console.log(tweetText);
            
            channel.send(tweetText);
        
        
            return tweet.tweet(tweetText);
        }
    })
    
}

const startTimeStamp = moment().startOf('minute').subtract(1, "seconds").unix()

setInterval(() => {
    const lastSaleTime = cache.get('lastSaleTime', null) || moment().startOf('minute').subtract(59, "seconds").unix();
    //console.log(`Last sale (in seconds since Unix epoch): ${cache.get('lastSaleTime', null)}`);

    axios.get('https://api.opensea.io/api/v1/events', {
        headers: {
            'X-API-KEY': process.env.OS_API
        },
        params: {
            collection_slug: process.env.OPENSEA_COLLECTION_SLUG,
            event_type: 'successful',
            occurred_after: lastSaleTime,
            only_opensea: 'false'
        }
    }).then((response) => {
        const events = _.get(response, ['data', 'asset_events']);

        const sortedEvents = _.sortBy(events, function(event) {
            const created = _.get(event, 'created_date');

            return new Date(created);
        })
        
        console.log(`Opensea: ${events.length} sales since the last one...`);

        _.each(sortedEvents, (event) => {
            const created = _.get(event, 'created_date');

            cache.set('lastSaleTime', moment(created).unix());

            return formatAndSendTweetOpensea(event);
        });
    }).catch((error) => {
        console.error(error);
    });


    // LOOKSRARE
    const lastSaleTimeAtLooksrare = cache.get('lastSaleTimeAtLooksrare', null) || startTimeStamp;

    axios.post('https://api.looksrare.org/graphql', {
        query: query,
        variables: {
            "filter": {
              "collection": "0xDebBC3691d42090d899Cafe0C4ED80897A7C9d6a",
              "type": "SALE"
            },
            "pagination": {
              "first": 20
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
    }).then((response) => {
        console.log(lastSaleTimeAtLooksrare);

        const events = _.get(response, ['data', 'data', 'events']);
    
        const filteredEvents = _.filter(events, function(event) {
            console.log(moment(event.createdAt).unix());
            return moment(event.createdAt).unix() >= lastSaleTimeAtLooksrare
        })
    
        console.log(`LooksRare: ${filteredEvents.length} sales since the last one...`);
    
        _.each(filteredEvents, (event) => {
            const created = _.get(event, 'createdAt');
    
            cache.set('lastSaleTimeAtLooksrare', moment(created).unix());

            return formatAndSendTweetLooksrare(event);
    
        });
    }).catch((err) => {
        console.error(err);
    })




}, 60000);


client.login(process.env.CLIENT_TOKEN);