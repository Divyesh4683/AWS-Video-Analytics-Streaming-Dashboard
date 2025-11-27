'use strict';

/**
 * This shows how to use standard Apollo client on Node.js
 */

require('es6-promise').polyfill();
require('isomorphic-fetch');
const URL = require('url');
const AWS = require('aws-sdk');

const GRAPHQL_ENDPOINT = 'https://fls7q7tjf5c7bboecf242zatg4.appsync-api.us-east-1.amazonaws.com/graphql';
const API_KEY = 'da2-rysgducyh5em7ozsfx6jcu25we';

console.log('Loading function');

exports.handler = (event, context, callback) => {
    let success = 0;
    let failure = 0;
    console.log("Event: %j", event);

    const output = event.records.map((record) => {
        try {
            // Data is base64 encoded, so decode here
            console.log("Record: %j", record);
            const recordData = Buffer.from(record.data, 'base64');
            const jsonData = JSON.parse(recordData);
            console.log("Decoded data: %j", jsonData);

            // Extract video ID and recent views from the data
            const videoId = jsonData.VIDEOID || jsonData.video_id || 'unknown';
            const recentViews = jsonData.VIEWS || jsonData.recent_views || 1;

            // Prepare GraphQL mutation
            const mutationData = {
                id: videoId,
                recent_views: recentViews
            };

            const data = {
                variables: mutationData,
                query: `mutation UpdateVideo($id: ID!, $recent_views: Int) {
                    updateVideo(id: $id, recent_views: $recent_views) {
                        id
                        recent_views
                        total_views
                    }
                }`
            };

            console.log("Mutation data: %j", data);

            // Use API Key authentication (simpler than IAM signing)
            fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(res => {
                console.log("AppSync response: %j", res);
                if (res.errors) {
                    console.error("GraphQL errors:", res.errors);
                    failure++;
                } else {
                    console.log("Successfully updated video views:", res.data);
                    success++;
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                failure++;
            });

            return {
                recordId: record.recordId,
                result: 'Ok',
                data: record.data
            };

        } catch (err) {
            console.error("Processing error:", err);
            failure++;
            return {
                recordId: record.recordId,
                result: 'ProcessingFailed',
                data: record.data
            };
        }
    });

    console.log(`Processing completed. Successful: ${success}, Failed: ${failure}`);
    
    callback(null, {
        records: output
    });
};
