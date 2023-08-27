import { DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import ddbClient from "./ddbClient";

exports.handler = async (event) => {
  console.log(event);
  const connectionId = event.requestContext.connectionId;

  // Query the GSI to get the userId for the given connectionId
  const queryParams = {
    TableName: "QrActiveConnections",
    IndexName: "connectionId-index", // The GSI name
    KeyConditionExpression: "connectionId = :connectionIdVal",
    ExpressionAttributeValues: {
      ":connectionIdVal": { S: connectionId }, // This describes a String type attribute
    },
  };

  try {
    const queryResult = await ddbClient.send(new QueryCommand(queryParams));

    console.log("query result", queryResult);

    // If no matching record is found, return an error response
    if (!queryResult.Items || queryResult.Items.length === 0) {
      return { statusCode: 404, body: "Connection not found." };
    }

    // Extract the userId from the query result
    const userId = queryResult.Items[0].userId;
    console.log("userId:", userId);
    console.log("connectionId:", connectionId);

    // Delete the item using userId and connectionId
    const deleteParams = {
      TableName: "QrActiveConnections",
      Key: {
        userId: userId, // Note: You're directly accessing the 'S' property here
        connectionId: { S: connectionId },
      },
    };

    await ddbClient.send(new DeleteItemCommand(deleteParams));
    return { statusCode: 200, body: "Disconnected." };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: "Failed to disconnect." };
  }
};
