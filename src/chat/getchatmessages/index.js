import ddbClient from "./ddbClient";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const chatId = event.queryStringParameters.chatId;
  console.log("event object:", JSON.stringify(event, undefined, 2));
  console.log("chatId:", chatId);
  if (!chatId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "chatId is required" }),
    };
  }

  // use aws cli before testing it

  try {
    const params = {
      TableName: "QrChatMessages1",
      KeyConditionExpression: "chatId = :chatIdValue",
      ExpressionAttributeValues: {
        ":chatIdValue": { S: chatId },
      },
    };
    const data = await ddbClient.send(new QueryCommand(params));
    console.log("Queried data", data.Items);
    return {
      statusCode: 200,
      body: JSON.stringify(data.Items),
    };
  } catch (error) {
    console.error("Unable to query. Error:", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
