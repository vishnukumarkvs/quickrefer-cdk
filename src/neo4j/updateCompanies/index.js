import { driver } from "./neo4jClient.js";
import ddbClient from "./ddbClient.js";
import { PutItemCommand } from "@aws-sdk/client-dynamodb"; // ES Modules import

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const getAllCompaniesQuery = `
  MATCH (n:Company)
  RETURN COLLECT(n.name) AS companyNames
`;

  const session = driver.session({ database: "neo4j" });

  try {
    const getResult = await session.executeRead((tx) =>
      tx.run(getAllCompaniesQuery, {})
    );

    console.log(`Write result:`, getResult);
    console.log(`Write 1:`, getResult.records[0]._fields[0]);
    const listt = getResult.records[0]._fields[0];
    console.log(`Write 2:`, listt);
    console.log(typeof listt);
    console.log(listt[0]);

    const params = {
      TableName: "Utils",
      Item: {
        pk: { S: "companies_in_database" }, // convert pk to attribute value
        company_names: {
          L: listt.map((value) => ({ S: value })), // convert listt to attribute value
        },
      },
    };
    await ddbClient.send(new PutItemCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify("Operation done successfully"),
    };
  } catch (error) {
    console.error(`Something went wrong: ${error}`);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(`Error fetching data: ${error}`),
    };
  } finally {
    await session.close();
  }
};
