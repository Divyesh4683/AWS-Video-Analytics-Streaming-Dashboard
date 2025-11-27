'use strict';

const https = require('https');

const GRAPHQL_ENDPOINT = 'fls7q7tjf5c7bboecf242zatg4.appsync-api.us-east-1.amazonaws.com';
const API_KEY = 'da2-rysgducyh5em7ozsfx6jcu25we';

exports.handler = async (event) => {
    console.log("Event received:", JSON.stringify(event));

    const processRecord = async (record) => {
        try {
            const recordData = Buffer.from(record.data, 'base64').toString('utf-8');
            const jsonData = JSON.parse(recordData);
            console.log("Decoded data:", jsonData);

            const activeUserCount = jsonData.USER_COUNT || jsonData.count || 1;

            const mutation = {
                query: `mutation UpdateActiveUsers($count: Int!) {
                    updateActiveUsers(count: $count) {
                        id
                        count
                    }
                }`,
                variables: { count: activeUserCount }
            };

            const postData = JSON.stringify(mutation);

            const options = {
                hostname: GRAPHQL_ENDPOINT,
                path: '/graphql',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const result = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        console.log("AppSync response:", data);
                        resolve(JSON.parse(data));
                    });
                });

                req.on('error', (error) => {
                    console.error("Request error:", error);
                    reject(error);
                });

                req.write(postData);
                req.end();
            });

            if (result.errors) {
                console.error("GraphQL errors:", result.errors);
                return {
                    recordId: record.recordId,
                    result: 'ProcessingFailed',
                    data: record.data
                };
            }

            console.log("Success! Updated active users:", result.data);
            return {
                recordId: record.recordId,
                result: 'Ok',
                data: record.data
            };

        } catch (error) {
            console.error("Error processing record:", error);
            return {
                recordId: record.recordId,
                result: 'ProcessingFailed',
                data: record.data
            };
        }
    };

    const results = await Promise.all(event.records.map(processRecord));
    console.log("All records processed:", results);

    return { records: results };
};
