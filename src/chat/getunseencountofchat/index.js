import ddbClient from "./ddbClient";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";

exports.handler = async (event) => {
  const chatId = event.queryStringParameters.chatId;
  const userId = event.queryStringParameters.userId;

  if (!userId && !chatId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "userId and chatId is required" }),
    };
  }

  try {
    const params = {
      TableName: process.env.CHAT_SUMMARY,
      Key: {
        userId: { S: userId },
        chatId: { S: chatId },
      },
      ProjectionExpression: "seenCount",
    };
    const getResult = await ddbClient.send(new GetItemCommand(params));
    console.log("GET data", getResult);
    const seenCount = getResult.Item?.seenCount?.N || 0;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ seenCount }),
    };
  } catch (error) {
    console.error("Error:", JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
};
