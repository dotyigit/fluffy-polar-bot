const axios = require('axios');
const twit = require('twit');

const twitterConfig = {
    consumer_key: process.env.TW_API_KEY,
    consumer_secret: process.env.TW_API_SECRET,
    access_token: process.env.TW_AC,
    access_token_secret: process.env.TW_AC_SECRET,
};

const twitterClient = new twit(twitterConfig);

// Tweet a text-based status
async function tweet(tweetText) {
    const tweet = {
        status: tweetText,
    };

    twitterClient.post('statuses/update', tweet, (error, tweet, response) => {
        if (!error) {
            console.log(`Successfully tweeted: ${tweetText}`);
        } else {
            console.error(error);
        }
    });
}

// OPTIONAL - use this method if you want the tweet to include the full image file of the OpenSea item in the tweet.
async function tweetWithImage(tweetText, imageUrl) {
    // Format our image to base64
    const processedImage = await getBase64(imageUrl);

    // Upload the item's image from OpenSea to Twitter & retrieve a reference to it
    twitterClient.post('media/upload', { media_data: processedImage }, (error, media, response) => {
        if (!error) {
            const tweet = {
                status: tweetText,
                media_ids: [media.media_id_string]
            };

            twitterClient.post('statuses/update', tweet, (error, tweet, response) => {
                if (!error) {
                    console.log(`Successfully tweeted: ${tweetText}`);
                } else {
                    console.error(error);
                }
            });
        } else {
            console.error(error);
        }
    });
}

// Format a provided URL into it's base64 representation
function getBase64(url) {
    return axios.get(url, { responseType: 'arraybuffer'}).then(response => Buffer.from(response.data, 'binary').toString('base64'))
}

module.exports = {
    tweet: tweet,
    tweetWithImage: tweetWithImage
};