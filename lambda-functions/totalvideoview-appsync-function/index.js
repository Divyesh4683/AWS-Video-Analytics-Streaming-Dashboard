'use strict';

/**
 * This shows how to use standard Apollo client on Node.js
 */

require('es6-promise').polyfill();
require('isomorphic-fetch');
const URL = require('url');
const AWS = require('aws-sdk');

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://fls7q7tjf5c7bboecf242zatg4.appsync-api.us-east-1.amazonaws.com/graphql';
const API_KEY = process.env.API_KEY || 'da2-rysgducyh5em7ozsfx6jcu25we';

console.log('Loading function');

exports.handler = (event, context, callback) => {
    let success = 0;
    let failure = 0;
    
    console.log("Event :%j", event);

    const output = event.records.map((record) => {
        // Decode base64 payload from Kinesis
        const payload = Buffer.from(record.data, 'base64').toString('utf8');
        console.log('Decoded payload:', payload);
        
        try {
            const data = JSON.parse(payload);
            
            // Call AppSync mutation
            const mutation = `
                mutation UpdateVideo($id: ID!, $total_views: Int, $recent_views: Int) {
                    updateVideo(id: $id, total_views: $total_views, recent_views: $recent_views) {
                        id
                        total_views
                        recent_views
                    }
                }
            `;
            
            const variables = {
                id: data.video_id || data.id || 'unknown',
                total_views: data.total_views || 1,
                recent_views: data.recent_views || 1
            };
            
            // Make AppSync request
            fetch(GRAPHQL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    query: mutation,
                    variables: variables
                })
            })
            .then(response => response.json())
            .then(result => {
                console.log('AppSync response:', JSON.stringify(result));
                success++;
            })
            .catch(error => {
                console.error('AppSync error:', error);
                failure++;
            });
            
            return {
                recordId: record.recordId,
                result: 'Ok',
                data: record.data
            };
            
        } catch (err) {
            console.error('Processing error:', err);
            failure++;
            return {
                recordId: record.recordId,
                result: 'ProcessingFailed',
                data: record.data
            };
        }
    });

    console.log(`Processing completed. Successful records ${success}, Failed records ${failure}.`);
    callback(null, { records: output });
};
