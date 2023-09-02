import ddbClient from "./ddbClient";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  const { receiverId, chatId } = body;
  if (!chatId && !receiverId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "chatId and receiverId is required" }),
    };
  }

  // use aws cli before testing it

  try {
    const params = {
      TableName: process.env.CHAT_MESSAGES,
      KeyConditionExpression: "chatId = :chatIdValue",
      ExpressionAttributeValues: {
        ":chatIdValue": { S: chatId },
      },
    };
    const data = await ddbClient.send(new QueryCommand(params));
    console.log("Queried data", data.Items);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data.Items),
    };
  } catch (error) {
    console.error("Unable to query. Error:", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
