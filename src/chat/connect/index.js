import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import ddbClient from "./ddbClient";

exports.handler = async (event) => {
  console.log(event);
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters.userId;
  const chatId = event.queryStringParameters.chatId;
  console.log(connectionId, userId, chatId);

  const params = {
    TableName: "QrActiveConnections1",
    Item: {
      userId: { S: userId },
      connectionKey: { S: `CONNECTION#${connectionId}` },
      connectionId: { S: connectionId },
      chatId: { S: chatId },
    },
  };

  try {
    await ddbClient.send(new PutItemCommand(params));
    return { statusCode: 200, body: "Connected." };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: "Failed to connect." };
  }
};
