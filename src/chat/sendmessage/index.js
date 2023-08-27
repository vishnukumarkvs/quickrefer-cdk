import ddbClient from "./ddbClient";
import { PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi"; // ES Modules import

const apiClient = new ApiGatewayManagementApiClient({
  endpoint: "https://1hsde5qkbk.execute-api.us-east-1.amazonaws.com/prod", // This gets the WebSocket endpoint
});
exports.handler = async (event) => {
  const timestamp = Date.now();
  const senderId = event.body.senderId;
  const receiverId = event.body.receiverId;
  const chatId = event.body.chatId;

  // First, save the message to the ChatMessages DynamoDB table
  const messageParams = {
    TableName: "ChatAll",
    Item: {
      chatId: chatId,
      timestamp: timestamp,
      senderId: senderId,
      content: event.body.content,
      seen: false, // initially set to false
    },
  };

  try {
    await ddbClient.send(new PutItemCommand(messageParams));
  } catch (error) {
    console.error("Error saving message:", error);
    return { statusCode: 500, body: "Failed to save the message." };
  }

  // Check if the recipient is online and on the same chat page
  const recipientConnectionData = await ddbClient.send(
    new GetItemCommand({
      TableName: "ActiveConnections",
      Key: { userId: receiverId },
    })
  );

  // Check if the sender (current user) is still online (in case they navigated away immediately after sending)
  const senderConnectionData = await ddbClient.send(
    new GetItemCommand({
      TableName: "ActiveConnections",
      Key: { userId: senderId },
    })
  );

  // If both users are online and on the same chat page
  if (
    recipientConnectionData.Item &&
    senderConnectionData.Item &&
    recipientConnectionData.Item.chatId === chatId &&
    senderConnectionData.Item.chatId === chatId
  ) {
    const postData = {
      Data: JSON.stringify({
        senderId: senderId,
        content: event.body.content,
        timestamp: timestamp,
        chatId: chatId,
      }),
      ConnectionId: recipientConnectionData.Item.connectionId, // Send the message to the recipient
    };

    try {
      await apiClient.send(new PostToConnectionCommand(postData));
    } catch (error) {
      console.error("Error sending real-time message:", error);
      // If there's an error in sending via WebSocket, it may mean the connection no longer exists, so you might consider removing it from the ActiveConnections table
    }
  }

  return { statusCode: 200, body: "Message sent." };
};
