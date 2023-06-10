import { driver } from "./neo4jClient.js";

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  const session = driver.session({ database: "neo4j" });

  try {
    // To learn more about the Cypher syntax, see: https://neo4j.com/docs/cypher-manual/current/
    // The Reference Card is also a good resource for keywords: https://neo4j.com/docs/cypher-refcard/current/
    const writeQuery = `create (:ACTOR {name: "Prabhas"})`;

    // Write transactions allow the driver to handle retries and transient errors.
    const writeResult = await session.executeWrite((tx) => tx.run(writeQuery));
    console.log(`Write result:`, writeResult);
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
  } finally {
    // Close down the session if you're not using it anymore.
    await session.close();
  }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Successfully finished operation: "${event.httpMethod}"`,
    }),
  };
};
