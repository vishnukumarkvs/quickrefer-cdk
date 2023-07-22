import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MyDatabases } from "./databases";
import { MyLambdas } from "./lambdas";
import { ApiGateways } from "./apigw";
import { IamStack } from "./iam";
import * as dotenv from "dotenv";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

dotenv.config();
export class JobdashboardBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new MyDatabases(this, "Database");
    const myLambdas = new MyLambdas(this, "MyLambdas", database);

    const iamroles = new IamStack(this, "IamStack", {
      stateMachineArn: process.env.POST_ONLINE_JOB_STATE_MACHINE_ARN as string,
    });

    const apigws = new ApiGateways(this, "ApiGateways", {
      createNeo4jLambdaForPostJob: myLambdas.neo4jLambdaForPostjob,
      createNeo4jLambdaForSearchByParameter:
        myLambdas.neo4jLambdaForSearchByParameter,
      createNeo4jLambdaForReferralSubmit:
        myLambdas.neo4jLambdaForReferralSubmit,
      extjobApiIamRole: iamroles.apiAccessStepfnRole,
    });
  }
}
