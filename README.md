# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

MATCH p=(j:Job)-[:REQUIRES_SKILL]->() WHERE j.jobTitle="Tokito Engineer" RETURN p LIMIT 25; -> returns record for every skill
MATCH p=()-[:POSTED_JOB]->(j:Job) Where j.jobTitle="ddb developer" RETURN p LIMIT 25;

Returns only list of skills for job
MATCH (j:Job)-[:REQUIRES_SKILL]->(s:Skill)
WHERE j.jobTitle = "Tokito Engineer"
RETURN COLLECT(s.value) AS requiredSkills
LIMIT 1;

Returns id, email, username of poster
MATCH (u:User)-[:POSTED_JOB]->(j:Job)
WHERE j.jobTitle = "ddb developer"
RETURN DISTINCT u.id, u.email, u.username
LIMIT 1;

returns nodes
MATCH p=(j:Job)-[:IN_CITY]->() WHERE j.jobTitle="Tokito Engineer" RETURN p LIMIT 25;
array?
MATCH (j:Job)-[:IN_CITY]->(c:City)
WHERE j.jobTitle = "Tokito Engineer"
RETURN COLLECT(c.name) AS eligibleLocations
LIMIT 1;

almost final 1

```
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
WHERE (coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle)
AND (coalesce($skillValue, "") = "" OR skill.value = $skillValue)
AND (coalesce($companyName, "") = "" OR company.name = $companyName)
MATCH (u:User)-[:POSTED_JOB]->(job)
MATCH (j:Job)-[:IN_CITY]->(c:City)
MATCH (j:Job)-[:REQUIRES_SKILL]->(s:Skill)
RETURN job, u,COLLECT(c.name) AS eligibleLocations, COLLECT(s.value) AS requiredSkills
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
```

almost final 2

```
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
WHERE (coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle)
AND (coalesce($skillValue, "") = "" OR skill.value = $skillValue)
AND (coalesce($companyName, "") = "" OR company.name = $companyName)
MATCH (u:User)-[:POSTED_JOB]->(job)
WITH job, u
MATCH (job)-[:IN_CITY]->(c:City)
WITH job, u, COLLECT(DISTINCT c.name) AS eligibleLocations
MATCH (job)-[:REQUIRES_SKILL]->(s:Skill)
RETURN job, u, eligibleLocations, COLLECT(DISTINCT s.value) AS requiredSkills
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
```

almost final 3

```
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
MATCH (u:User)-[:POSTED_JOB]->(job)
WITH job, u, collect(skill.value) as skills, company
WITH job, u, skills,
     CASE WHEN coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle THEN 1 ELSE 0 END as jobTitleScore,
     CASE WHEN coalesce($skillValue, "") = "" OR $skillValue IN skills THEN 1 ELSE 0 END as skillScore,
     CASE WHEN coalesce($companyName, "") = "" OR company.name = $companyName THEN 1 ELSE 0 END as companyScore
WITH job, u, skills, jobTitleScore + skillScore + companyScore as score
MATCH (job)-[:IN_CITY]->(c:City)
WITH job, u, score, COLLECT(DISTINCT c.name) AS eligibleLocations, skills
RETURN job, u, eligibleLocations, skills, score
ORDER BY score DESC
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
LIMIT 3

```

added company fetching
CALL apoc.cypher.run('
MATCH (job:Job)
OPTIONAL MATCH (job)-[:REQUIRES_SKILL]->(skill:Skill)
OPTIONAL MATCH (job)-[:AT_COMPANY]->(company:Company)
MATCH (u:User)-[:POSTED_JOB]->(job)
WITH job, u, collect(skill.value) as skills, company
WITH job, u, skills,
CASE WHEN coalesce($jobTitle, "") = "" OR job.jobTitle = $jobTitle THEN 1 ELSE 0 END as jobTitleScore, 
     CASE WHEN coalesce($skillValue, "") = "" OR $skillValue IN skills THEN 1 ELSE 0 END as skillScore, 
     CASE WHEN coalesce($companyName, "") = "" OR company.name = $companyName THEN 1 ELSE 0 END as companyScore
WITH job, u, skills, jobTitleScore + skillScore + companyScore as score
MATCH (job)-[:IN_CITY]->(c:City)
MATCH (job)-[:AT_COMPANY]->(cp:Company)
WITH job, u, score, COLLECT(DISTINCT c.name) AS eligibleLocations, skills, cp
RETURN job, u, eligibleLocations, skills, score, cp.name AS company
ORDER BY score DESC
', {jobTitle: "", skillValue: "python", companyName: ""}) YIELD value RETURN value
LIMIT 3

Referral

```
  const getAllReferrersQuery = `
  MATCH (u:User)
  WHERE (u)-[:WORKS_AT]->(:Company {name: $company}) AND u.isJobReferrer = true
  LIMIT 10
  RETURN collect(u.userId) AS users
`;
```

other 2

```
MATCH (u:User)
WHERE (u)-[:WORKS_AT]->(:Company {name: $company})
  AND u.isJobReferrer = true
RETURN u.userId AS userId
ORDER BY CASE WHEN u.jobReferralScore > 0 THEN 0 ELSE 1 END, rand()
LIMIT 5

```

```
MATCH (u:User)
WHERE (u)-[:WORKS_AT]->(:Company {name: $company})
  AND u.isJobReferrer = true
WITH u
ORDER BY u.jobReferralScore DESC, rand()
RETURN collect(u.userId) AS users
LIMIT 5

```

final

MATCH (u:User)-[:WORKS_AT]->(:Company {name: 'TCS'})
WHERE u.isJobReferrer = true
WITH u.userId AS userId, CASE WHEN u.jobReferralScore > 0 THEN 0 ELSE 1 END as orderField
ORDER BY orderField, rand()
RETURN collect(userId)[..5] AS userIds

---

Make sure the referrer dont have more than 15 in his bucket

MATCH (u:User)-[:WORKS_AT]->(:Company {name: $company})
WHERE u.isJobReferrer = true
WITH u.userId AS userId, CASE WHEN u.jobReferralScore > 0 THEN 0 ELSE 1 END as orderField
ORDER BY orderField, rand()
WITH collect(userId)[..5] AS userIds
UNWIND userIds AS userId
MATCH (referrer:User {userId: userId}), (targetUser:User {userId: $targetUserId})
MERGE (referrer)-[:IS_GOING_TO_REFFER]->(targetUser)
WITH userId
RETURN collect(userId) AS referredUserIds

https://awstip.com/how-to-run-puppeteer-on-aws-lambda-using-layers-b1583ebd7120

ddb queries

unseen count total receiverid
aws dynamodb query \
 --table-name QrChatMessages3 \
 --index-name RecipientIndex \
 --key-condition-expression "receiverId = :receiverIdValue AND seen = :seenValue" \
 --expression-attribute-values '{":receiverIdValue": {"S": "daa8db90-2084-4617-a988-78ab259b12b5"}, ":seenValue": {"N": "0"}}' \
 --select "COUNT"

unseencount of chatId receiverid

---

Retrieve the seen count of all chats for a specific user (partition key):

aws dynamodb query \
 --region YOUR_REGION \
 --table-name QrChatSummaryTable \
 --key-condition-expression "userId = :userIdValue" \
 --expression-attribute-values '{":userIdValue": {"S": "YOUR_USER_ID"}}' \
 --select "SUM" \
 --projection-expression "seenCount"

Retrieve the seen count for a specific chat of a user:

aws dynamodb get-item \
 --region YOUR_REGION \
 --table-name QrChatSummaryTable \
 --key '{"userId": {"S": "YOUR_USER_ID"}, "chatId": {"S": "YOUR_CHAT_ID"}}' \
 --projection-expression "seenCount"
Replace the placeholders as appropriate:

cdk diff QuickReferStaging -c env=staging
