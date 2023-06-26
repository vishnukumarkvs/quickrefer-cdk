import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MyDatabases } from "./databases";
import { MyLambdas } from "./lambdas";
import { ApiGateways } from "./apigw";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class JobdashboardBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const database = new MyDatabases(this, "Database");
    const myLambdas = new MyLambdas(this, "MyLambdas", database);

    const apigws = new ApiGateways(this, "ApiGateways", {
      createNeo4jLambdaForPostJob: myLambdas.neo4jLambdaForPostjob,
      createNeo4jLambdaForSearchByParameter:
        myLambdas.neo4jLambdaForSearchByParameter,
    });
  }
}
