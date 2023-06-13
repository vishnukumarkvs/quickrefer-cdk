import { driver } from "./neo4jClient.js";

exports.handler = async function (event) {
  const data = JSON.parse(event.body);

  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("event data:", data);

  const createJobQuery = `
      WITH $restData AS jobData, $skills AS skillsData, $experienceUnit AS expUnitValue, $salaryUnit AS salUnitValue, $locations AS locationsArray
      CREATE (job:Job {
          jobTitle: jobData.jobTitle,
          baseExp: jobData.baseExp,
          highExp: jobData.highExp,
          baseSalary: jobData.baseSalary,
          highSalary: jobData.highSalary,
          date: datetime(jobData.date),
          description: jobData.description,
          created_at: datetime(),
          updated_at: datetime()
      })
      WITH job, skillsData, expUnitValue, salUnitValue, locationsArray
      FOREACH (skillValue IN skillsData |
          MERGE (skill:Skill {value: skillValue})
          MERGE (job)-[:REQUIRES_SKILL]->(skill)
      )
      WITH job, expUnitValue, salUnitValue, locationsArray
      MERGE (expUnit:Unit {value: expUnitValue, type: "experience"})
      MERGE (job)-[:HAS_UNIT]->(expUnit)
      WITH job, salUnitValue, locationsArray
      MERGE (salUnit:Unit {value: salUnitValue, type: "salary"})
      MERGE (job)-[:HAS_UNIT]->(salUnit)
      WITH job, locationsArray
      UNWIND locationsArray as locationEntry
      MERGE (city:City {name: locationEntry.city})
      MERGE (country:Country {name: locationEntry.country})
      MERGE (city)-[:IN_COUNTRY]->(country)
      MERGE (job)-[:IN_CITY]->(city);
  `;

  const session = driver.session({ database: "neo4j" });

  try {
    const writeResult = await session.executeWrite((tx) =>
      tx.run(createJobQuery, {
        restData: data.restData,
        skills: data.skills,
        experienceUnit: data.experienceUnit,
        salaryUnit: data.salaryUnit,
        locations: data.locations,
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
