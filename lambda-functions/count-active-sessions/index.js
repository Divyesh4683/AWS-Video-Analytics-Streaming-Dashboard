const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamodb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        console.log('Counting active sessions...');
        
        // Scan ActiveSessions table
        const scanParams = {
            TableName: 'mediaqos-ActiveSessions',
            ProjectionExpression: 'sessionId'
        };
        
        const result = await dynamodb.send(new ScanCommand(scanParams));
        const activeCount = result.Items ? result.Items.length : 0;
        
        console.log(`Active sessions: ${activeCount}`);
        
        // Update ActiveUserTable with total count
        const putParams = {
            TableName: 'mediaqos-ActiveUserTable',
            Item: {
                id: 'current',
                count: activeCount,
                timestamp: Date.now()
            }
        };
        
        await dynamodb.send(new PutCommand(putParams));
        
        console.log(`✅ Updated active users to ${activeCount}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                activeUsers: activeCount,
                timestamp: Date.now()
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
