import { driver } from "./neo4jClient.js";

exports.handler = async function (event) {
  const data = JSON.parse(event.body);

  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("event data:", data);

  const createJobQuery = `
        WITH $restData AS jobData, $skills AS skillsData, $experienceUnit AS expUnitValue, $salaryUnit AS salUnitValue
        CREATE (job:Job {jobTitle: jobData.jobTitle, baseExp: jobData.baseExp, highExp: jobData.highExp, baseSalary: jobData.baseSalary, highSalary: jobData.highSalary, date: datetime(jobData.date), description: jobData.description})
        WITH job, skillsData, expUnitValue, salUnitValue
        FOREACH (skillValue IN skillsData |
            MERGE (skill:Skill {value: skillValue})
            CREATE (job)-[:REQUIRES]->(skill)
        )
        MERGE (expUnit:Unit {value: expUnitValue, type: "experience"})
        CREATE (job)-[:HAS_UNIT]->(expUnit)
        MERGE (salUnit:Unit {value: salUnitValue, type: "salary"})
        CREATE (job)-[:HAS_UNIT]->(salUnit)
    `;

  const session = driver.session({ database: "neo4j" });

  try {
    const writeResult = await session.executeWrite((tx) =>
      tx.run(createJobQuery, {
        restData: data.restData,
        skills: data.skills,
        experienceUnit: data.experienceUnit,
        salaryUnit: data.salaryUnit,
      })
    );
    console.log(`Write result:`, writeResult);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // You might want to restrict this in production
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
      body: JSON.stringify("Job data inserted successfully."),
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
      body: JSON.stringify(`Error inserting data: ${error}`),
    };
  } finally {
    await session.close();
  }
};
