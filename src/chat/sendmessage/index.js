import ddbClient from "./ddbClient";
import { PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const apiClient = new ApiGatewayManagementApiClient({
  endpoint: "https://1hsde5qkbk.execute-api.us-east-1.amazonaws.com/prod",
});

exports.handler = async (event) => {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);
  const body = JSON.parse(event.body);

  const { action, senderId, receiverId, chatId, content } = body;

  const messageParams = {
    TableName: "QrChatMessages1",
    Item: {
      chatId: { S: chatId },
      timestamp: { N: currentUnixTimestamp.toString() },
      senderId: { S: senderId },
      content: { S: content },
      seen: { BOOL: false },
    },
  };

  try {
    await ddbClient.send(new PutItemCommand(messageParams));
  } catch (error) {
    console.error("Error saving message:", error);
    return { statusCode: 500, body: "Failed to save the message." };
  }

  const postDataTemplate = {
    Data: JSON.stringify({
      senderId: senderId,
      content: content,
      timestamp: currentUnixTimestamp,
      chatId: chatId,
    }),
  };

  const getActiveConnectionParams = (userId) => ({
    TableName: "QrActiveConnections1",
    KeyConditionExpression: "userId = :userIdValue",
    ExpressionAttributeValues: {
      ":userIdValue": { S: userId },
    },
  });

  const sendNotification = async (userId) => {
    const connectionData = await ddbClient.send(
      new QueryCommand(getActiveConnectionParams(userId))
    );

    if (connectionData.Items && connectionData.Items.length > 0) {
      const connectionItem = connectionData.Items[0];
      if (connectionItem.chatId.S === chatId) {
        const postData = {
          ...postDataTemplate,
          ConnectionId: connectionItem.connectionId.S,
        };
        try {
          await apiClient.send(new PostToConnectionCommand(postData));
        } catch (error) {
          console.error(`Error sending message to ${userId}:`, error);
        }
      }
    }
  };

  await sendNotification(senderId);
  await sendNotification(receiverId);

  return { statusCode: 200, body: "Message sent." };
};
