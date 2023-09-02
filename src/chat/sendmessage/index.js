import ddbClient from "./ddbClient";
import {
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
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

  const { senderId, receiverId, chatId, content } = body;

  const getActiveConnectionParams = (userId) => ({
    TableName: process.env.ACTIVE_CONNECTIONS,
    KeyConditionExpression: "userId = :userIdValue",
    ExpressionAttributeValues: {
      ":userIdValue": { S: userId },
    },
  });

  const checkUserConnection = async (userId) => {
    const connectionData = await ddbClient.send(
      new QueryCommand(getActiveConnectionParams(userId))
    );

    return (
      connectionData.Items &&
      connectionData.Items.length > 0 &&
      connectionData.Items[0].chatId.S === chatId
    );
  };

  const receiverIsActive = await checkUserConnection(receiverId);
  console.log("receiverIsActive", receiverIsActive);

  const messageParams = {
    TableName: process.env.CHAT_MESSAGES,
    Item: {
      chatId: { S: chatId },
      timestamp: { N: currentUnixTimestamp.toString() },
      senderId: { S: senderId },
      receiverId: { S: receiverId },
      content: { S: content },
    },
  };
  console.log("messageParams", messageParams);

  if (!receiverIsActive) {
    const updateParams = {
      TableName: process.env.CHAT_SUMMARY, // Replace with your table name
      Key: {
        userId: { S: receiverId },
        chatId: { S: chatId },
      },
      UpdateExpression:
        "SET seenCount = if_not_exists(seenCount, :start) + :increment",
      ExpressionAttributeValues: {
        ":start": { N: "0" },
        ":increment": { N: "1" },
      },
    };
    console.log("updateParams", updateParams);
    await ddbClient.send(new UpdateItemCommand(updateParams));
    console.log("Updated chat summary");
  }

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

  const sendNotification = async (userId) => {
    const connectionData = await ddbClient.send(
      new QueryCommand(getActiveConnectionParams(userId))
    );

    if (
      connectionData.Items &&
      connectionData.Items.length > 0 &&
      connectionData.Items[0].chatId.S === chatId
    ) {
      const postData = {
        ...postDataTemplate,
        ConnectionId: connectionData.Items[0].connectionId.S,
      };
      try {
        await apiClient.send(new PostToConnectionCommand(postData));
      } catch (error) {
        console.error(`Error sending message to ${userId}:`, error);
      }
    }
  };

  await sendNotification(senderId);
  await sendNotification(receiverId);

  return { statusCode: 200, body: "Message sent." };
};
